/* Real app integration: every write is inside a newly created disposable profile. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { createHash } = require("node:crypto");
const os = require("node:os");
const path = require("node:path");
const { chromium, expect } = require("@playwright/test");

const base = (process.env.PERSISTENCE_BASE_URL || "").replace(/\/$/, "");
assert(base, "Set PERSISTENCE_BASE_URL to the app under test");
const outputParent = path.resolve(
  process.env.PERSISTENCE_OUTPUT_DIR || os.tmpdir()
);
fs.mkdirSync(outputParent, { recursive: true });
const output = fs.mkdtempSync(path.join(outputParent, "daedalos-persistence-"));
const profile = path.join(output, "profile");
const marker = "DOT_SAVE_" + Date.now();
const fixture = marker + ".png";
const virtualImage = "/Users/Public/Pictures/" + fixture;
const missingImage = "/Users/Public/Pictures/" + marker + "-missing.png";
const report = {
  base,
  profile,
  output,
  started: new Date().toISOString(),
  events: [],
};
const requests = [];
let context,
  page,
  processIds = [];
const record = (check, data) => {
  report.events.push({ time: new Date().toISOString(), check, data });
  fs.writeFileSync(
    path.join(output, "receipt.json"),
    JSON.stringify(report, null, 2)
  );
  console.log(check, JSON.stringify(data));
};
async function launch() {
  context = await chromium.launchPersistentContext(profile, {
    ...(process.env.CHROME_BIN
      ? { executablePath: process.env.CHROME_BIN }
      : {}),
    headless: true,
    viewport: { width: 1280, height: 900 },
  });
  // Hold only the existing session-readiness timer on a dedicated test URL.
  // This makes the real UI interaction deterministic inside the 500ms boot window.
  await context.addInitScript(() => {
    if (!new URL(location.href).searchParams.has("earlySession")) return;
    const originalSetTimeout = window.setTimeout.bind(window);
    window.setTimeout = (callback, delay, ...args) => {
      if (
        typeof callback === "function" &&
        callback.toString().includes("sessionIsWriteable")
      ) {
        window.__sessionGateHeld = true;
        const heldTimer = originalSetTimeout(() => {}, 3600000);
        window.__releaseSessionGate = () => {
          window.clearTimeout(heldTimer);
          return originalSetTimeout(callback, 0, ...args);
        };
        return heldTimer;
      }
      return originalSetTimeout(callback, delay, ...args);
    };
  });
  page = context.pages()[0];
  page.on("request", (r) =>
    requests.push({ url: r.url(), method: r.method() })
  );
  const cdp = await context.browser().newBrowserCDPSession();
  processIds = (await cdp.send("SystemInfo.getProcessInfo")).processInfo.map(
    (p) => p.id
  );
  record("launch", { version: context.browser().version(), processIds });
}
async function close() {
  if (!context) return;
  const cdp = await context.browser().newBrowserCDPSession();
  processIds = [
    ...new Set([
      ...processIds,
      ...(await cdp.send("SystemInfo.getProcessInfo")).processInfo.map(
        (p) => p.id
      ),
    ]),
  ];
  await context.close();
  context = undefined;
  const states = processIds.map((pid) => {
    try {
      process.kill(pid, 0);
      return { pid, exists: true };
    } catch (e) {
      return { pid, exists: e.code !== "ESRCH" };
    }
  });
  record("process-exit", states);
  assert(
    states.every((s) => !s.exists),
    "Owned browser processes must exit before reopening"
  );
}
async function openFile(file) {
  await page.goto(base + "/?app=MonacoEditor&url=" + encodeURIComponent(file), {
    waitUntil: "domcontentloaded",
  });
  await page
    .getByRole("textbox", { name: path.posix.basename(file), exact: true })
    .waitFor();
  await page.waitForFunction(
    (file) =>
      window.monaco?.editor
        .getModels()
        .some((m) => m.uri.path.startsWith(file + "|")),
    file
  );
}
const modelValue = () =>
  page.evaluate(() => window.monaco.editor.getModels()[0].getValue());
async function save() {
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("dialog").last()).not.toHaveAttribute(
    "aria-label",
    /^\u25cf/
  );
}
async function reopenWelcome() {
  await page
    .getByRole("dialog")
    .last()
    .getByRole("button", { name: "Close", exact: true })
    .click();
  await page.getByRole("dialog").waitFor({ state: "detached" });
  await page.getByRole("button", { name: "Welcome", exact: true }).dblclick();
  await page
    .getByRole("textbox", { name: "Welcome.txt", exact: true })
    .waitFor();
}
async function playlist(entries) {
  await openFile("/Users/Public/Pictures/slideshow.json");
  // Fixture setup only; the Save operation is always the real UI handler.
  await page.evaluate(
    (value) => window.monaco.editor.getModels()[0].setValue(value),
    JSON.stringify(entries)
  );
  await save();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Close", exact: true })
    .click();
}
async function earlySlideshow(imageBytes) {
  await page.goto(base + "/?earlySession=1", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.__sessionGateHeld === true);
  assert.equal(
    await page.evaluate(() => window.sessionIsWriteable === true),
    false
  );
  await page
    .locator("main")
    .click({ button: "right", position: { x: 1050, y: 100 } });
  await page.getByRole("button", { name: "Background", exact: true }).hover();
  await page
    .getByRole("button", { name: "Picture Slideshow", exact: true })
    .click();
  assert.equal(
    await page.evaluate(() => window.sessionIsWriteable === true),
    false
  );
  record("early-selection-before-readiness", {
    readiness: false,
    controlledTimer: true,
  });
  // Let the image import and desktop updates settle while writes are still gated.
  await visibleImage("early-selection", imageBytes);
  assert.equal(
    await page.evaluate(() => window.sessionIsWriteable === true),
    false
  );
  await page.evaluate(() => window.__releaseSessionGate());
  await page.waitForFunction(() => window.sessionIsWriteable === true);
}
async function slideshow() {
  // Start a fresh app instance so the saved playlist, not the old queue, is tested.
  await page.goto(base + "/", { waitUntil: "domcontentloaded" });
  await page.locator("main").waitFor();
  // Match the existing UI suite: session changes are not writable during boot.
  await page.waitForFunction(() => window.sessionIsWriteable === true);
  record("session-ready", true);
  await page
    .locator("main")
    .click({ button: "right", position: { x: 1050, y: 100 } });
  await page.getByRole("button", { name: "Background", exact: true }).hover();
  await page
    .getByRole("button", { name: "Picture Slideshow", exact: true })
    .click();
}
async function visibleImage(check, expectedBytes) {
  await expect
    .poll(
      async () =>
        page.evaluate(async () => {
          const root = document.documentElement;
          const side =
            Number(
              root.style.getPropertyValue("--before-background-opacity")
            ) === 1
              ? "before"
              : "after";
          const background = getComputedStyle(
            root,
            "::" + side
          ).backgroundImage;
          const url = /^url\("(.+)"\)$/.exec(background)?.[1];
          if (!url) return false;
          const image = new Image();
          image.src = url;
          try {
            await image.decode();
            return image.naturalWidth > 0 && image.naturalHeight > 0;
          } catch {
            return false;
          }
        }),
      { timeout: 20000 }
    )
    .toBe(true);
  const pixels = await page.evaluate(async () => {
    const root = document.documentElement;
    const side =
      Number(root.style.getPropertyValue("--before-background-opacity")) === 1
        ? "before"
        : "after";
    const url = /^url\("(.+)"\)$/.exec(
      getComputedStyle(root, "::" + side).backgroundImage
    )[1];
    return {
      url,
      bytes: Array.from(new Uint8Array(await (await fetch(url)).arrayBuffer())),
    };
  });
  assert(
    pixels.url.startsWith("blob:"),
    "Virtual images must render as object URLs"
  );
  assert.deepEqual(Buffer.from(pixels.bytes), expectedBytes);
  record(check + "-bytes", {
    url: pixels.url,
    sha256: createHash("sha256").update(expectedBytes).digest("hex"),
  });
  await page.waitForTimeout(1400); // Actual CSS crossfade is 1.25s.
  await page.screenshot({
    path: path.join(output, check + ".png"),
    fullPage: true,
  });
  record(
    check,
    await page.evaluate(() => document.documentElement.getAttribute("style"))
  );
}
(async () => {
  try {
    await launch();
    await openFile("/Users/Public/Documents/Welcome.txt");
    const original = await modelValue();
    const publicBefore = await (
      await context.request.get(base + "/Users/Public/Documents/Welcome.txt")
    ).body();
    assert.equal(original, publicBefore.toString("utf8"));
    record("baseline", {
      bytes: publicBefore.length,
      value: original,
      sha256: createHash("sha256").update(publicBefore).digest("hex"),
    });
    await page.screenshot({ path: path.join(output, "welcome-before.png") });
    for (const value of [marker, ""]) {
      const editor = page.getByRole("textbox", {
        name: "Welcome.txt",
        exact: true,
      });
      await editor.press("Control+A");
      await editor.press("Backspace");
      if (value) await page.keyboard.insertText(value);
      await expect.poll(modelValue).toBe(value);
      await save();
      await reopenWelcome();
      assert.equal(await modelValue(), value);
      record("save-reopen", { value });
      await page.screenshot({
        path: path.join(output, value ? "save-nonempty.png" : "save-empty.png"),
      });
      await close();
      await launch();
      await openFile("/Users/Public/Documents/Welcome.txt");
      assert.equal(await modelValue(), value);
      record("save-process-restart", { value });
      await page.screenshot({
        path: path.join(
          output,
          value ? "restart-nonempty.png" : "restart-empty.png"
        ),
      });
    }
    await page.evaluate((value) => {
      const model = window.monaco.editor.getModels()[0];
      model.setValue(value);
      model.setEOL(0);
    }, original);
    await save();
    assert.equal(await modelValue(), original);

    await page.goto(
      base + "/?url=" + encodeURIComponent("/Users/Public/Pictures"),
      { waitUntil: "domcontentloaded" }
    );
    const files = page.getByRole("list", { name: "Pictures", exact: true });
    await files.waitFor();
    const imageResponse = await context.request.get(
      base + "/System/Icons/48x48/audio.png"
    );
    assert(imageResponse.ok());
    const imageBytes = await imageResponse.body();
    await files.click({ button: "right", position: { x: 300, y: 180 } });
    const chooser = page.waitForEvent("filechooser");
    await page
      .getByRole("button", { name: "Add file(s)", exact: true })
      .click();
    await (
      await chooser
    ).setFiles({ name: fixture, mimeType: "image/png", buffer: imageBytes });
    await page.getByRole("button", { name: fixture, exact: true }).waitFor();
    await playlist([]);
    await earlySlideshow(imageBytes);
    await page.waitForTimeout(250); // Allow the queued IndexedDB write to complete.
    // No editor/session mutation after releasing the boot gate: save must happen
    // because readiness opened, not because another user action triggers it.
    await close();
    await launch();
    await page.goto(base + "/", { waitUntil: "domcontentloaded" });
    await visibleImage("early-process-restart", imageBytes);
    await openFile("/session.json");
    assert.equal(JSON.parse(await modelValue()).wallpaperImage, "SLIDESHOW");
    record("early-session-persisted", true);
    await slideshow();
    await visibleImage("local-fallback", imageBytes);
    await openFile("/Users/Public/Pictures/slideshow.json");
    assert.deepEqual(JSON.parse(await modelValue()), [virtualImage]);
    record("persisted-virtual-path", await modelValue());
    await openFile("/session.json");
    const savedSession = JSON.parse(await modelValue());
    assert.match(savedSession.wallpaperImage, /^SLIDESHOW(?: ALT)?$/);
    record("persisted-session", {
      wallpaperImage: savedSession.wallpaperImage,
    });
    await close();
    await launch();
    await page.goto(base + "/", { waitUntil: "domcontentloaded" });
    await visibleImage("local-process-restart", imageBytes);
    await openFile("/Users/Public/Pictures/slideshow.json");
    assert.deepEqual(JSON.parse(await modelValue()), [virtualImage]);
    await playlist([missingImage]);
    await slideshow();
    await page.waitForTimeout(1000);
    const emptyBackground = await page.evaluate(() => ({
      before: getComputedStyle(document.documentElement, "::before")
        .backgroundImage,
      after: getComputedStyle(document.documentElement, "::after")
        .backgroundImage,
    }));
    assert.deepEqual(emptyBackground, { before: "none", after: "none" });
    record("missing-only-safe-background", emptyBackground);
    await page.screenshot({ path: path.join(output, "missing-only.png") });
    await playlist([missingImage, virtualImage]);
    await slideshow();
    await visibleImage("missing-entry-fallback", imageBytes);
    assert(
      !requests.some((r) => r.url.includes(marker)),
      "Local paths must never reach HTTP"
    );
    const shippedBytes = await (
      await context.request.get(base + "/System/Icons/48x48/pc.webp")
    ).body();
    await playlist(["/System/Icons/48x48/pc.webp"]);
    await slideshow();
    await visibleImage("shipped-image", shippedBytes);
    const publicAfter = await (
      await context.request.get(base + "/Users/Public/Documents/Welcome.txt")
    ).body();
    assert.deepEqual(publicAfter, publicBefore);
    assert(
      !requests.some(
        (r) => r.url.startsWith(base) && !["GET", "HEAD"].includes(r.method)
      )
    );
    record("PASS", {
      publicWelcomeUnchanged: true,
      localRequests: 0,
      viewport: "1280x900",
      platform: os.platform(),
    });
  } catch (error) {
    record("FAIL", error.stack);
    if (page && !page.isClosed())
      await page
        .screenshot({ path: path.join(output, "failure.png") })
        .catch(() => {});
    process.exitCode = 1;
  } finally {
    await close();
    assert.equal(path.dirname(path.resolve(profile)), path.resolve(output));
    assert.equal(path.dirname(output), outputParent);
    if (fs.existsSync(profile)) fs.rmSync(profile, { recursive: true });
    record("cleanup", { profileAbsent: !fs.existsSync(profile) });
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
