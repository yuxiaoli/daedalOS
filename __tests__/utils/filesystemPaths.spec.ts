/** @jest-environment node */

import type * as IBrowserFS from "browserfs";
import { type FSModule } from "browserfs/dist/node/core/FS";
import type FileSystemConfig from "contexts/fileSystem/FileSystemConfig";
import * as BrowserFS from "public/System/BrowserFS/browserfs.min.js";
import type * as Constants from "utils/constants";

const PAGES_BASE_PATH = "/daedalOS";
// Mirrors the generated public index: directories are objects, files are null.
// eslint-disable-next-line unicorn/no-null
const FILE_ENTRY = null;
const PUBLIC_INDEX = {
  "session.json": FILE_ENTRY,
  System: {
    "example.wasm": FILE_ENTRY,
    Icons: { "terminal.webp": FILE_ENTRY },
  },
};
type CoreFixture = { fs9pToBfs: () => typeof PUBLIC_INDEX };

describe("filesystem paths on GitHub Pages", () => {
  let constants: typeof Constants;
  let fileSystemConfig: typeof FileSystemConfig;
  let fs: FSModule;

  const writeFile = (filePath: string, data: Buffer | string): Promise<void> =>
    new Promise((resolve, reject) => {
      fs.writeFile(filePath, data, { flag: "w" }, (error) =>
        error ? reject(error) : resolve()
      );
    });
  const readFile = (filePath: string): Promise<Buffer> =>
    new Promise((resolve, reject) => {
      fs.readFile(filePath, (error, data = Buffer.from("")) =>
        error ? reject(error) : resolve(data)
      );
    });
  const readdir = (directory: string): Promise<string[]> =>
    new Promise((resolve, reject) => {
      fs.readdir(directory, (error, entries = []) =>
        error ? reject(error) : resolve(entries)
      );
    });

  beforeAll(async () => {
    const previousBasePath = process.env.BASE_PATH;

    try {
      process.env.BASE_PATH = PAGES_BASE_PATH;
      jest.resetModules();
      await jest.isolateModulesAsync(async () => {
        constants = await import("utils/constants");
        // Prebuild generates the full index; only its root layout matters here.
        jest.doMock<CoreFixture>("contexts/fileSystem/core", () => ({
          fs9pToBfs: () => PUBLIC_INDEX,
        }));
        ({ default: fileSystemConfig } =
          await import("contexts/fileSystem/FileSystemConfig"));
      });
    } finally {
      if (previousBasePath === undefined) delete process.env.BASE_PATH;
      else process.env.BASE_PATH = previousBasePath;
    }

    const { BFSRequire, configure } = BrowserFS as typeof IBrowserFS;

    await new Promise<void>((resolve, reject) => {
      configure(fileSystemConfig(true), (error) =>
        error ? reject(error) : resolve()
      );
    });
    fs = BFSRequire("fs");
  });

  afterAll(() => {
    jest.dontMock("contexts/fileSystem/core");
  });

  it("persists and restores session changes at the virtual filesystem root", async () => {
    const initialSession = { themeName: "dark", wallpaperImage: "MATRIX 2D" };
    const updatedSession = {
      ...initialSession,
      runHistory: ["help"],
      wallpaperImage: "GALAXY",
    };

    await writeFile(constants.SESSION_FILE, JSON.stringify(initialSession));
    await expect(
      readFile("/session.json").then(
        (data) => JSON.parse(data.toString()) as unknown
      )
    ).resolves.toStrictEqual(initialSession);

    await writeFile(constants.SESSION_FILE, JSON.stringify(updatedSession));
    await expect(
      readFile(constants.SESSION_FILE).then(
        (data) => JSON.parse(data.toString()) as unknown
      )
    ).resolves.toStrictEqual(updatedSession);
  });

  it("discovers and stores System programs using virtual paths", async () => {
    await expect(readdir(constants.SYSTEM_PATH)).resolves.toStrictEqual(
      expect.arrayContaining(["Icons", "example.wasm"])
    );

    const wasm = Buffer.from([0, 97, 115, 109, 1, 0, 0, 0]);

    await writeFile(`${constants.SYSTEM_PATH}/installed.wasm`, wasm);
    await expect(readdir(constants.SYSTEM_PATH)).resolves.toContain(
      "installed.wasm"
    );
    await expect(
      readFile("/System/installed.wasm").then((data) => [...data])
    ).resolves.toStrictEqual([...wasm]);
  });

  it("keeps the deployment prefix on public icon URLs", () => {
    expect(constants.BASE_PATH).toBe(PAGES_BASE_PATH);
    expect(
      new URL(`${constants.ICON_PATH}/terminal.webp`, "https://example.test")
        .pathname
    ).toBe("/daedalOS/System/Icons/terminal.webp");
  });
});
