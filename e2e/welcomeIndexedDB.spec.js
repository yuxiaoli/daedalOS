// Real IndexedDB + the shipped BrowserFS bundle across page destruction.
// This does not test Monaco's Save UI or claim target-Windows acceptance.
// Run: yarn playwright test --config=playwright.welcome.config.js
const { readFileSync } = require("node:fs");
const path = require("node:path");
const { expect, test } = require("@playwright/test");

const fixtureUrl = "https://welcome-persistence.invalid/";
const bundlePath = path.resolve("public/System/BrowserFS/browserfs.min.js");
const canonicalWelcome = readFileSync(
  path.resolve("public/Users/Public/Documents/Welcome.txt"),
  "utf8"
);
const oldWelcome = "previous bundled welcome";
const editedWelcome = "USER NOTES: preserve exact bytes\nUnicode: café 世界\n";
const welcomePath = "/Users/Public/Documents/Welcome.txt";
const renamedPath = "/Users/Public/Documents/My notes.txt";

// Each Playwright test has a fresh disposable context. Route EVERY request,
// so this reserved synthetic origin cannot contact a server or user profile.
test.beforeEach(async ({ context }) => {
  await context.route("**/*", async (route) => {
    if (route.request().url() === fixtureUrl) {
      await route.fulfill({
        contentType: "text/html",
        body: "<!doctype html><title>Isolated welcome persistence fixture</title>",
      });
    } else {
      await route.abort("blockedbyclient");
    }
  });
});

async function mount(page, welcome) {
  await page.goto(fixtureUrl);
  // The shipped bundle expects the app's process shim before evaluation.
  await page.evaluate(() => { window.process = { cwd: () => '/' }; });
  await page.addScriptTag({ path: bundlePath });
  const backend = await page.evaluate(async (text) => {
    const bfs = window.BrowserFS;
    window.Buffer = bfs.BFSRequire('buffer').Buffer;
    const create = (factory, options) =>
      new Promise((resolve, reject) => {
        factory.Create(options, (error, fs) => {
          if (error) reject(error);
          else if (fs) resolve(fs);
          else reject(new Error("Filesystem backend was not created"));
        });
      });
    // No InMemory fallback is allowed in this test.
    const upper = await create(bfs.FileSystem.IndexedDB, {
      storeName: "welcome-persistence-test",
    });
    const lower = await create(bfs.FileSystem.HTTPRequest, {
      baseUrl: "/",
      index: { Users: { Public: { Documents: { "Welcome.txt": null } } } },
    });
    lower.preloadFile(
      "/Users/Public/Documents/Welcome.txt",
      bfs.BFSRequire("buffer").Buffer.from(text)
    );
    const overlay = await create(bfs.FileSystem.OverlayFS, {
      readable: lower,
      writable: upper,
    });
    // Separate FS instances allow reading the durable upper tombstone without
    // changing the overlay's global root or using private backend fields.
    const Fs = bfs.BFSRequire("fs").FS;
    const fs = new Fs();
    fs.initialize(overlay);
    const upperFs = new Fs();
    upperFs.initialize(upper);
    const call = (target, method, ...args) =>
      new Promise((resolve, reject) => {
        target[method](...args, (error, value) => {
          if (error) reject(error);
          else resolve(value);
        });
      });
    window.welcomeHarness = {
      read: (name) => call(fs, "readFile", name, "utf8"),
      readUpper: (name) => call(upperFs, "readFile", name, "utf8"),
      write: (name, value) => call(fs, "writeFile", name, value, { flag: "w" }),
      rename: (from, to) => call(fs, "rename", from, to),
      remove: (name) => call(fs, "unlink", name),
      list: () => call(fs, "readdir", "/Users/Public/Documents"),
      size: async (name) => (await call(fs, "stat", name)).size,
      exists: (name) => new Promise((resolve) => fs.exists(name, resolve)),
      tombstones: async () => {
        try {
          return await call(upperFs, "readFile", "/.deletedFiles.log", "utf8");
        } catch (error) {
          if (error.code === "ENOENT") return "";
          throw error;
        }
      },
    };
    return upper.getName();
  }, welcome);
  expect(backend).toBe("IndexedDB - welcome-persistence-test");
}

async function read(page, name = welcomePath) {
  return page.evaluate((file) => window.welcomeHarness.read(file), name);
}

async function reopen(context, page, welcome) {
  // Destroy the old document and connection, retaining ONLY this test's
  // disposable browser context. A new backend must reopen real IndexedDB.
  await page.close();
  const reopened = await context.newPage();
  await mount(reopened, welcome);
  return reopened;
}

async function waitForTombstone(page) {
  await expect
    .poll(() => page.evaluate(() => window.welcomeHarness.tombstones()))
    .toContain(`d${welcomePath}\n`);
}

test("untouched default adopts canonical lower layer after reopening", async ({
  context,
  page,
}) => {
  await mount(page, oldWelcome);
  expect(await read(page)).toBe(oldWelcome);
  const reopened = await reopen(context, page, canonicalWelcome);
  expect(await read(reopened)).toBe(canonicalWelcome);
});

for (const [label, saved] of [
  ["edited", editedWelcome],
  ["empty", ""],
]) {
  test(`${label} saved bytes survive reopening and lower replacement`, async ({
    context,
    page,
  }) => {
    await mount(page, oldWelcome);
    await page.evaluate(
      ([file, value]) => window.welcomeHarness.write(file, value),
      [welcomePath, saved]
    );
    // A separate upper-store read observes committed bytes before closing;
    // the bundle's write callback alone is not a transaction-complete signal.
    await expect
      .poll(() =>
        page.evaluate(
          (file) => window.welcomeHarness.readUpper(file),
          welcomePath
        )
      )
      .toBe(saved);
    const reopened = await reopen(context, page, canonicalWelcome);
    expect(await read(reopened)).toBe(saved);
    expect(
      await reopened.evaluate(
        (file) => window.welcomeHarness.size(file),
        welcomePath
      )
    ).toBe(Buffer.byteLength(saved));
  });
}

for (const mode of ["pristine", "edited"]) {
  for (const action of ["delete", "rename"]) {
    test(`${action} ${mode} note preserves tombstone after reopening`, async ({
      context,
      page,
    }) => {
      await mount(page, oldWelcome);
      if (mode === "edited") {
        await page.evaluate(
          ([file, text]) => window.welcomeHarness.write(file, text),
          [welcomePath, editedWelcome]
        );
      }
      await page.evaluate(
        ([operation, from, to]) =>
          operation === "rename"
            ? window.welcomeHarness.rename(from, to)
            : window.welcomeHarness.remove(from),
        [action, welcomePath, renamedPath]
      );
      await waitForTombstone(page);
      const reopened = await reopen(context, page, canonicalWelcome);
      expect(
        await reopened.evaluate(
          (file) => window.welcomeHarness.exists(file),
          welcomePath
        )
      ).toBe(false);
      expect(
        await reopened.evaluate(() => window.welcomeHarness.list())
      ).not.toContain("Welcome.txt");
      const missingCode = await reopened.evaluate(async (file) => {
        try {
          await window.welcomeHarness.read(file);
          return "UNEXPECTED_SUCCESS";
        } catch (error) {
          return error.code;
        }
      }, welcomePath);
      expect(missingCode).toBe("ENOENT");
      if (action === "rename") {
        expect(await read(reopened, renamedPath)).toBe(
          mode === "edited" ? editedWelcome : oldWelcome
        );
      }
    });
  }
}
