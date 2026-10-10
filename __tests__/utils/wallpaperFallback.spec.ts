import * as React from "react";
import { createRoot, type Root } from "react-dom/client";
import type UseWallpaper from "components/system/Desktop/Wallpapers/useWallpaper";
import type * as UtilsFunctions from "utils/functions";

const PICTURES = "/Users/Public/Pictures";
const SLIDESHOW_FILE = `${PICTURES}/slideshow.json`;
const fitImageToDecodeLimit = jest.fn<Promise<string>, [url: string]>();
const preloadImage = jest.fn<
  ReturnType<typeof UtilsFunctions.preloadImage>,
  Parameters<typeof UtilsFunctions.preloadImage>
>();
const setWallpaper = jest.fn<void, [name: string]>();
const fsActions = {
  exists: jest.fn<Promise<boolean>, [path: string]>(),
  lstat: jest.fn<Promise<{ isDirectory: () => boolean }>, [path: string]>(),
  readdir: jest.fn<Promise<string[]>, [path: string]>(),
  readFile: jest.fn<Promise<Buffer>, [path: string]>(),
  updateFolder: jest.fn<void, [path: string, entry: string]>(),
  writeFile: jest.fn<
    Promise<boolean>,
    [path: string, data: string, overwrite: boolean]
  >(),
};
type FileSystemFixture = { useFileSystemActions: () => typeof fsActions };
type SessionFixture = {
  useSessionActions: () => { setWallpaper: typeof setWallpaper };
  useSessionLoaded: () => boolean;
  useWallpaperFit: () => "fill";
  useWallpaperImage: () => "SLIDESHOW";
};
type ThemeFixture = {
  useTheme: () => { colors: { background: string; text: string } };
};

describe("slideshow fallback on GitHub Pages", () => {
  let useWallpaper: typeof UseWallpaper;
  let root: Root;
  let container: HTMLElement;
  const originalCss = Object.getOwnPropertyDescriptor(window, "CSS");
  const originalMatchMedia = Object.getOwnPropertyDescriptor(
    window,
    "matchMedia"
  );
  const originalActEnvironment = Object.getOwnPropertyDescriptor(
    globalThis,
    "IS_REACT_ACT_ENVIRONMENT"
  );

  const DesktopProbe = (): React.ReactElement => {
    const desktopRef = React.useRef<HTMLElement>(null);

    useWallpaper(desktopRef);

    return React.createElement("main", { ref: desktopRef });
  };
  const mountDesktop = async (): Promise<void> => {
    await React.act(async () => {
      root.render(React.createElement(DesktopProbe));
      await Promise.resolve();
    });
  };

  beforeEach(async () => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    fsActions.exists.mockResolvedValue(true);
    fsActions.lstat.mockResolvedValue({ isDirectory: () => false });
    fsActions.readdir.mockResolvedValue([]);
    fsActions.readFile.mockResolvedValue(Buffer.from("[]"));
    fsActions.writeFile.mockResolvedValue(true);
    fitImageToDecodeLimit.mockImplementation((url) => Promise.resolve(url));
    Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", {
      configurable: true,
      value: true,
      writable: true,
    });
    Object.defineProperty(window, "CSS", {
      configurable: true,
      value: { escape: (value: string) => value },
    });
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: () => ({ matches: false }),
    });
    document.documentElement.removeAttribute("style");
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);

    const previousBasePath = process.env.BASE_PATH;

    try {
      process.env.BASE_PATH = "/daedalOS";
      jest.resetModules();
      await jest.isolateModulesAsync(async () => {
        // Keep the hook and the renderer on the same React instance.
        jest.doMock<typeof React>("react", () => React);
        jest.doMock<FileSystemFixture>("contexts/fileSystem", () => ({
          useFileSystemActions: () => fsActions,
        }));
        jest.doMock<SessionFixture>("contexts/session", () => ({
          useSessionActions: () => ({ setWallpaper }),
          useSessionLoaded: () => true,
          useWallpaperFit: () => "fill",
          useWallpaperImage: () => "SLIDESHOW",
        }));
        jest.doMock<ThemeFixture>("styled-components", () => ({
          useTheme: () => ({ colors: { background: "#000", text: "#fff" } }),
        }));
        jest.doMock<typeof UtilsFunctions>("utils/functions", () => ({
          ...jest.requireActual<typeof UtilsFunctions>("utils/functions"),
          fitImageToDecodeLimit,
          preloadImage,
        }));
        ({ default: useWallpaper } =
          await import("components/system/Desktop/Wallpapers/useWallpaper"));
      });
    } finally {
      if (previousBasePath === undefined) delete process.env.BASE_PATH;
      else process.env.BASE_PATH = previousBasePath;
    }
  });

  afterEach(async () => {
    await React.act(async () => {
      root.unmount();
      await Promise.resolve();
    });
    container.remove();
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
    for (const [target, property, descriptor] of [
      [window, "CSS", originalCss],
      [window, "matchMedia", originalMatchMedia],
      [globalThis, "IS_REACT_ACT_ENVIRONMENT", originalActEnvironment],
    ] as const) {
      if (descriptor) Object.defineProperty(target, property, descriptor);
      else Reflect.deleteProperty(target, property);
    }
    jest.dontMock("react");
    jest.dontMock("contexts/fileSystem");
    jest.dontMock("contexts/session");
    jest.dontMock("styled-components");
    jest.dontMock("utils/functions");
    document.documentElement.removeAttribute("style");
  });

  it("populates an empty shipped playlist from Pictures and prefixes its asset URL", async () => {
    const album = `${PICTURES}/Albums`;
    const image = `${album}/photo.jpg`;

    fsActions.readdir.mockImplementation((directory) =>
      Promise.resolve(
        directory === PICTURES
          ? ["slideshow.json", "Albums", "notes.txt", "vector.svg"]
          : ["photo.jpg"]
      )
    );
    fsActions.lstat.mockImplementation((entry) =>
      Promise.resolve({ isDirectory: () => entry === album })
    );

    await mountDesktop();

    expect(fsActions.readdir.mock.calls).toStrictEqual([[PICTURES], [album]]);
    expect(fsActions.writeFile).toHaveBeenCalledWith(
      SLIDESHOW_FILE,
      JSON.stringify([image]),
      true
    );
    expect(fsActions.updateFolder).toHaveBeenCalledWith(
      PICTURES,
      "slideshow.json"
    );
    const assetUrl = `${window.location.origin}/daedalOS${image}`;

    expect(fitImageToDecodeLimit).toHaveBeenCalledWith(assetUrl);
    expect(
      document.documentElement.style.getPropertyValue("--before-background")
    ).toContain(`url(${assetUrl})`);
  });

  it("remains stable when the empty playlist has no available images", async () => {
    await mountDesktop();
    await React.act(async () => {
      await jest.advanceTimersByTimeAsync(60000);
    });

    expect(fsActions.readFile).toHaveBeenCalledTimes(1);
    expect(fsActions.readdir).toHaveBeenCalledWith(PICTURES);
    expect({
      decodedImages: fitImageToDecodeLimit.mock.calls.length,
      folderUpdates: fsActions.updateFolder.mock.calls.length,
      timers: jest.getTimerCount(),
      wallpaperChanges: setWallpaper.mock.calls.length,
      writes: fsActions.writeFile.mock.calls.length,
    }).toStrictEqual({
      decodedImages: 0,
      folderUpdates: 0,
      timers: 0,
      wallpaperChanges: 0,
      writes: 0,
    });
  });

  it.each([
    [
      "https://images.example.test/wallpaper.jpg",
      "https://images.example.test/wallpaper.jpg",
    ],
    [
      "/daedalOS/Users/Public/Pictures/photo.jpg",
      `${window.location.origin}/daedalOS/Users/Public/Pictures/photo.jpg`,
    ],
  ])("preserves a configured slideshow URL %s", async (image, assetUrl) => {
    fsActions.readFile.mockResolvedValue(Buffer.from(JSON.stringify([image])));

    await mountDesktop();

    expect(fitImageToDecodeLimit).toHaveBeenCalledWith(assetUrl);
    expect(
      document.documentElement.style.getPropertyValue("--before-background")
    ).toContain(`url(${assetUrl})`);
    expect(fsActions.readdir).not.toHaveBeenCalled();
    expect(fsActions.writeFile).not.toHaveBeenCalled();
    expect(setWallpaper).not.toHaveBeenCalled();
  });
});
