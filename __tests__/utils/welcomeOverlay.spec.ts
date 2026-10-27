/** @jest-environment node */

import { readFileSync } from "node:fs";
import path from "node:path";
import type * as IBrowserFS from "browserfs";
import type HTTPRequest from "browserfs/dist/node/backend/HTTPRequest";
import type InMemoryFileSystem from "browserfs/dist/node/backend/InMemory";
import { FileFlag } from "browserfs/dist/node/core/file_flag";
import { type FSModule } from "browserfs/dist/node/core/FS";
import * as BundledBrowserFS from "public/System/BrowserFS/browserfs.min.js";

const BrowserFS = BundledBrowserFS as typeof IBrowserFS;
const BrowserBuffer = (
  BrowserFS.BFSRequire("buffer") as { Buffer: typeof Buffer }
).Buffer;
const welcomePath = "/Users/Public/Documents/Welcome.txt";
const renamedPath = "/Users/Public/Documents/My notes.txt";
const oldWelcome = "previous bundled welcome";
const editedWelcome = "USER NOTES: preserve exact bytes\n";
const newWelcome = readFileSync(
  path.join(process.cwd(), "public/Users/Public/Documents/Welcome.txt"),
  "utf8"
);
// The generated public index represents a file with null.
// eslint-disable-next-line unicorn/no-null
const index = { Users: { Public: { Documents: { "Welcome.txt": null } } } };

type Factory<Options, Backend> = {
  Create: (
    options: Options,
    callback: (error?: Error | null, backend?: Backend) => void
  ) => void;
};
const create = <Options, Backend>(
  factory: Factory<Options, Backend>,
  options: Options
): Promise<Backend> =>
  new Promise((resolve, reject) => {
    factory.Create(options, (error, backend) => {
      if (error) reject(error);
      else if (backend) resolve(backend);
      else reject(new Error("Filesystem backend was not created"));
    });
  });
const readText = (fs: FSModule, pathname: string): Promise<string> =>
  new Promise((resolve, reject) => {
    fs.readFile(pathname, "utf8", (error, data) => {
      if (error) reject(error);
      else resolve(data || "");
    });
  });
const writeText = (
  fs: FSModule,
  pathname: string,
  data: string
): Promise<void> =>
  new Promise((resolve, reject) => {
    fs.writeFile(pathname, data, { flag: "w" }, (error) => {
      if (error) reject(error);
      else resolve();
    });
  });
const unlink = (fs: FSModule, pathname: string): Promise<void> =>
  new Promise((resolve, reject) => {
    fs.unlink(pathname, (error) => {
      if (error) reject(error);
      else resolve();
    });
  });
const rename = (fs: FSModule, from: string, to: string): Promise<void> =>
  new Promise((resolve, reject) => {
    fs.rename(from, to, (error) => {
      if (error) reject(error);
      else resolve();
    });
  });
const exists = (fs: FSModule, pathname: string): Promise<boolean> =>
  new Promise((resolve) => {
    fs.exists(pathname, resolve);
  });
const readdir = (fs: FSModule): Promise<string[]> =>
  new Promise((resolve, reject) => {
    fs.readdir("/Users/Public/Documents", (error, entries) => {
      if (error) reject(error);
      else resolve(entries || []);
    });
  });
const size = (fs: FSModule): Promise<number> =>
  new Promise((resolve, reject) => {
    fs.stat(welcomePath, (error, stats) => {
      if (error) reject(error);
      else if (stats) resolve(stats.size);
      else reject(new Error("Filesystem stat was not returned"));
    });
  });
const mount = async (
  upper: InMemoryFileSystem,
  welcome: string
): Promise<FSModule> => {
  const lower: HTTPRequest = await create(BrowserFS.FileSystem.HTTPRequest, {
    baseUrl: "/daedalOS",
    index,
  });
  lower.preloadFile(welcomePath, BrowserBuffer.from(welcome));
  const overlay = await create(BrowserFS.FileSystem.OverlayFS, {
    readable: lower,
    writable: upper,
  });
  BrowserFS.initialize(overlay);
  return BrowserFS.BFSRequire("fs");
};
// Wait for the asynchronously written tombstone before remounting. This
// characterizes retained overlay state, not actual IndexedDB durability.
const waitForDeletionLog = async (upper: InMemoryFileSystem): Promise<void> => {
  const deadline = Date.now() + 2000;
  while (Date.now() < deadline) {
    // eslint-disable-next-line no-await-in-loop
    const log = await new Promise<string>((resolve, reject) => {
      upper.readFile(
        "/.deletedFiles.log",
        "utf8",
        FileFlag.getFileFlag("r"),
        (error, contents) => {
          if (error?.code === "ENOENT") resolve("");
          else if (error) reject(error);
          else resolve(contents?.toString() || "");
        }
      );
    });
    if (log.includes(`d${welcomePath}\n`)) return;
    // eslint-disable-next-line no-await-in-loop
    await new Promise<void>((resolve) => {
      setImmediate(resolve);
    });
  }
  throw new Error("Overlay tombstone was not saved before remount");
};

describe("welcome default replacement in the bundled overlay", () => {
  it("untouched notes use the new HTTP default", async () => {
    const upper = await create(BrowserFS.FileSystem.InMemory, {});
    let fs = await mount(upper, oldWelcome);
    await expect(readText(fs, welcomePath)).resolves.toBe(oldWelcome);
    fs = await mount(upper, newWelcome);
    await expect(readText(fs, welcomePath)).resolves.toBe(newWelcome);
  });

  it.each([
    ["edited", editedWelcome],
    ["empty", ""],
  ])("keeps %s saved notes", async (_name, saved) => {
    const upper = await create(BrowserFS.FileSystem.InMemory, {});
    let fs = await mount(upper, oldWelcome);
    await writeText(fs, welcomePath, saved);
    fs = await mount(upper, newWelcome);
    await expect(readText(fs, welcomePath)).resolves.toBe(saved);
    await expect(size(fs)).resolves.toBe(BrowserBuffer.byteLength(saved));
  });

  describe.each(["pristine", "edited"])("%s saved state", (mode) => {
    let upper: InMemoryFileSystem;
    let fs: FSModule;
    beforeEach(async () => {
      upper = await create(BrowserFS.FileSystem.InMemory, {});
      fs = await mount(upper, oldWelcome);
      if (mode === "edited") await writeText(fs, welcomePath, editedWelcome);
    });

    it("keeps deletions hidden after lower-layer replacement", async () => {
      await unlink(fs, welcomePath);
      await waitForDeletionLog(upper);
      fs = await mount(upper, newWelcome);
      await expect(exists(fs, welcomePath)).resolves.toBe(false);
      await expect(readdir(fs)).resolves.not.toContain("Welcome.txt");
      await expect(readText(fs, welcomePath)).rejects.toMatchObject({
        code: "ENOENT",
      });
    });

    it("keeps renamed notes and the old path tombstone", async () => {
      await rename(fs, welcomePath, renamedPath);
      await waitForDeletionLog(upper);
      fs = await mount(upper, newWelcome);
      await expect(exists(fs, welcomePath)).resolves.toBe(false);
      await expect(readdir(fs)).resolves.not.toContain("Welcome.txt");
      await expect(readText(fs, welcomePath)).rejects.toMatchObject({
        code: "ENOENT",
      });
      await expect(readText(fs, renamedPath)).resolves.toBe(
        mode === "edited" ? editedWelcome : oldWelcome
      );
    });
  });
});
