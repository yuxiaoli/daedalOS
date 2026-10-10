const assert = require("node:assert/strict");
const { existsSync } = require("node:fs");
const { chromium } = require("playwright");

const baseUrl = process.env.PAGES_BASE_URL;
const expectedSha = process.env.EXPECTED_SHA;
assert(baseUrl && expectedSha, "PAGES_BASE_URL and EXPECTED_SHA are required");

const sleep = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

async function main() {
  let html;
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const response = await fetch(baseUrl, { cache: "no-store" });
    assert(response.ok, `Published entrypoint returned ${response.status}`);
    html = await response.text();
    if (html.includes(`@ ${expectedSha.slice(0, 7)}`)) break;
    await sleep(5000);
  }
  assert(
    html.includes(`@ ${expectedSha.slice(0, 7)}`),
    "Published entrypoint is stale"
  );

  const bootstrap = html.match(
    /<script[^>]*id=["']?__NEXT_DATA__["']?[^>]*>([\s\S]*?)<\/script>/
  );
  assert(bootstrap, "Missing Next bootstrap metadata");
  const { assetPrefix } = JSON.parse(bootstrap[1]);
  assert.equal(assetPrefix.replace(/\/$/, ""), "/daedalOS");

  const scriptUrls = [...html.matchAll(/<script[^>]*src=["']?([^\s"'>]+)/g)]
    .map(([, src]) => new URL(src, baseUrl).href)
    .filter((url) => url.includes("/_next/"));
  assert(scriptUrls.length > 0, "Missing app scripts");
  const assets = [
    ...scriptUrls,
    new URL("System/Icons/48x48/pc.webp", baseUrl).href,
  ];
  for (const url of assets) {
    const response = await fetch(url);
    assert(response.ok, `Published asset returned ${response.status}: ${url}`);
    assert(
      !response.headers.get("content-type")?.includes("text/html"),
      `Published asset returned HTML: ${url}`
    );
  }

  const chrome = process.env.CHROME_BIN;
  const browser = await chromium.launch({
    ...(chrome && existsSync(chrome) ? { executablePath: chrome } : {}),
    args: ["--no-sandbox", "--disable-gpu", "--disable-software-rasterizer"],
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
    });
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    // Exercise the real app's main-thread fallback deterministically.
    // This says nothing about a normal browser's graphics capability.
    await page.addInitScript(() => {
      delete window.OffscreenCanvas;
      const getContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, ...options) {
        return type.startsWith("webgl")
          ? null
          : getContext.call(this, type, ...options);
      };
    });
    const response = await page.goto(baseUrl, {
      waitUntil: "domcontentloaded",
    });
    assert(response.ok(), "Browser entrypoint failed");
    const desktop = page.locator("body>#__next>main");
    await desktop.waitFor();
    await desktop.locator("ol>li").first().waitFor();
    await page.waitForFunction(() => window.sessionIsWriteable);
    await page.waitForTimeout(1000);
    const initialWorkers = page.workers().length;

    await page.locator("main>nav>[title=Start]").click();
    await page.locator("main>#startMenu").waitFor();
    await page.locator("main>nav>[title=Start]").click();
    await desktop
      .locator("ol>li")
      .getByLabel("My PC", { exact: true })
      .dblclick();
    await page.getByLabel("Close", { exact: true }).last().waitFor();
    await page.getByLabel("Close", { exact: true }).last().click();

    await page.goto(`${baseUrl}?app=Terminal`, {
      waitUntil: "domcontentloaded",
    });
    const terminal = page.locator(".terminal");
    await terminal.waitFor();
    await page.waitForFunction(() => window.sessionIsWriteable);
    const rows = () => terminal.locator(".xterm-rows").innerText();
    async function command(text) {
      await terminal.click();
      await terminal.pressSequentially(text);
      await terminal.press("Enter");
      await page.waitForTimeout(600);
    }
    await command("echo pages-maintenance-ok");
    assert(
      (await rows())
        .split("\n")
        .some((line) => line.trim() === "pages-maintenance-ok"),
      "Terminal echo failed"
    );
    await command("dir /System");
    assert(
      (await rows()).includes("coremark.wasm"),
      `System directory lookup failed: ${await rows()}`
    );
    await command("type /session.json");
    const saved = await rows();
    assert(
      saved.replace(/\s/g, "").includes('"wallpaperImage":"SLIDESHOW"'),
      "Empty fallback is unstable"
    );
    // Selecting the active slideshow toggles its ALT session value, which
    // lets the reload check distinguish a restored value from fresh defaults.
    await desktop.click({ button: "right", position: { x: 1200, y: 50 } });
    await page.getByText("Background", { exact: true }).hover();
    await page.getByText("Picture Slideshow", { exact: true }).click();
    await page.waitForTimeout(1000);
    await command("type /session.json");
    assert(
      (await rows())
        .replace(/\s/g, "")
        .includes('"wallpaperImage":"SLIDESHOWALT"'),
      `Session change was not saved: ${await rows()}`
    );
    await page.reload({ waitUntil: "domcontentloaded" });
    await terminal.waitFor();
    await page.waitForFunction(() => window.sessionIsWriteable);
    await command("type /session.json");
    assert(
      (await rows())
        .replace(/\s/g, "")
        .includes('"wallpaperImage":"SLIDESHOWALT"'),
      "Session change was not restored"
    );
    await page.waitForTimeout(1000);
    assert.equal(
      page.workers().length,
      initialWorkers,
      "Fallback keeps recreating workers"
    );
    assert.deepEqual(pageErrors, [], "Browser emitted page JavaScript errors");
    console.log(
      JSON.stringify(
        {
          sha: expectedSha,
          url: baseUrl,
          assetsChecked: assets.length,
          browser: "Chromium; forced unavailable WebGL",
          checks: [
            "desktop",
            "Start",
            "My PC open/close",
            "Terminal echo",
            "System listing",
            "session save/restore",
            "stable empty slideshow",
          ],
          pageErrors,
        },
        null,
        2
      )
    );
  } finally {
    await browser.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
