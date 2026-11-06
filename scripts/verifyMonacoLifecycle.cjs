/* Local integration tests. Each case creates and removes a disposable profile. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { chromium } = require("@playwright/test");

const base = process.env.ACCEPTANCE_BASE_URL?.replace(/\/$/, "");
assert(base, "Set ACCEPTANCE_BASE_URL to the local candidate server");
assert(["127.0.0.1", "localhost", "[::1]"].includes(new URL(base).hostname));
const file = "/Users/Public/Documents/Welcome.txt";
const expected = fs.readFileSync(path.join(__dirname, "../public", file));
const timeout = 60000;

async function run(closeDuringRead) {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "daedalos-lifecycle-"));
  let context, release, sawGet, finishResponse;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  const getSeen = new Promise((resolve) => {
    sawGet = resolve;
  });
  const responseDone = new Promise((resolve) => {
    finishResponse = resolve;
  });
  const methods = [],
    errors = [];
  try {
    context = await chromium.launchPersistentContext(profile, {
      ...(process.env.CHROME_BIN
        ? { executablePath: process.env.CHROME_BIN }
        : {}),
      headless: true,
      viewport: { width: 1280, height: 900 },
    });
    const page = context.pages()[0];
    await page.addInitScript(() => {
      let monaco;
      Object.defineProperty(window, "monaco", {
        configurable: true,
        get: () => monaco,
        set: (value) => {
          monaco = value;
          if (value?.editor?.create && !value.editor.create.__captured) {
            const create = value.editor.create;
            const wrapped = (...args) => {
              const editor = create(...args);
              (window.__testEditors ||= []).push(editor);
              return editor;
            };
            wrapped.__captured = true;
            value.editor.create = wrapped;
          }
        },
      });
    });
    page.on("pageerror", (error) => errors.push(error.message));
    await context.route(
      "**/Users/Public/Documents/Welcome.txt",
      async (route) => {
        const method = route.request().method();
        methods.push(method);
        if (method === "HEAD")
          return route.fulfill({
            status: 200,
            headers: { "content-length": "357" },
          });
        if (method === "GET") {
          sawGet();
          if (closeDuringRead) await gate;
          try {
            await route.fulfill({
              status: 200,
              contentType: "text/plain",
              body: expected,
            });
            finishResponse(null);
          } catch (error) {
            finishResponse(error);
          }
          return;
        }
        return route.abort();
      }
    );
    await page.goto(
      `${base}/?app=MonacoEditor&url=${encodeURIComponent(file)}`,
      { waitUntil: "domcontentloaded", timeout }
    );
    let timer;
    try {
      await Promise.race([
        getSeen,
        new Promise((_, reject) => {
          timer = setTimeout(
            () => reject(Error("Welcome GET not observed")),
            timeout
          );
        }),
      ]);
    } finally {
      clearTimeout(timer);
    }
    if (closeDuringRead) {
      const dialog = page.getByRole("dialog").last();
      await dialog.getByRole("button", { name: "Close", exact: true }).click();
      await dialog.waitFor({ state: "detached" });
      release();
      assert.ifError(await responseDone);
      await page.waitForTimeout(2500);
      const models = await page.evaluate(
        (target) =>
          window.monaco.editor
            .getModels()
            .filter((model) => model.uri.path.startsWith(target + "|")).length,
        file
      );
      assert.equal(models, 0, "A closed editor must not leave an orphan model");
    } else {
      const value = expected.toString("utf8").replace(/\r\n/g, "\n");
      await page.waitForFunction(
        ({ target, value }) =>
          (window.__testEditors || []).some(
            (editor) =>
              editor.getDomNode()?.closest('section[role="dialog"]') &&
              editor.getModel()?.uri.path.startsWith(target + "|") &&
              editor.getValue() === value
          ),
        { target: file, value },
        { timeout }
      );
      assert.ifError(await responseDone);
    }
    assert(methods.includes("HEAD") && methods.includes("GET"));
    assert.deepEqual(errors, []);
    console.log(
      `PASS ${closeDuringRead ? "close during read" : "direct open with mismatched HEAD"}; Chrome ${context.browser().version()}`
    );
  } finally {
    release();
    if (context) await context.close();
    fs.rmSync(profile, { recursive: true, force: true });
  }
}
(async () => {
  await run(false);
  await run(true);
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
