import {
  bufferToUrl,
  cleanUpBufferUrl,
  fitImageToDecodeLimit,
} from "utils/functions";
import { loadSlideshowImage } from "utils/slideshow";

jest.mock<{ BASE_PATH: string }>("utils/constants", () => ({
  BASE_PATH: "/daedalOS",
}));
jest.mock<{
  bufferToUrl: typeof bufferToUrl;
  cleanUpBufferUrl: typeof cleanUpBufferUrl;
  fitImageToDecodeLimit: typeof fitImageToDecodeLimit;
}>("utils/functions", () => ({
  bufferToUrl: jest.fn(() => "blob:local-image"),
  cleanUpBufferUrl: jest.fn(),
  fitImageToDecodeLimit: jest.fn((url: string) => Promise.resolve(url)),
}));

describe("slideshow image resolution", () => {
  const originalImage = window.Image;
  const loaded: string[] = [];
  const readFile = jest.fn<Promise<Buffer>, [string]>();
  let controller: AbortController;

  beforeEach(() => {
    jest.clearAllMocks();
    loaded.length = 0;
    controller = new AbortController();
    readFile.mockResolvedValue(Buffer.from("image bytes"));
    window.Image = class extends EventTarget {
      public removeAttribute(): void {
        /* Cancel the synthetic image request. */
      }
      public get src(): string {
        return loaded.at(-1) || "";
      }
      public set src(url: string) {
        loaded.push(url);
        if (url && !url.includes("pending")) {
          Promise.resolve().then(() =>
            this.dispatchEvent(
              new Event(url.includes("missing") ? "error" : "load")
            )
          );
        }
      }
    } as unknown as typeof Image;
  });
  afterEach(() => {
    window.Image = originalImage;
  });

  it.each([
    "/Users/Public/Pictures/local.png",
    "/System/Icons/48x48/audio.png",
    "/daedalOS/System/Icons/48x48/audio.png",
    "/System/Icons/48x48/audio.png?x=20&y=30",
  ])(
    "resolves virtual/shipped %s through BrowserFS, never a public URL",
    async (entry) => {
      const image = await loadSlideshowImage(
        entry,
        readFile,
        controller.signal
      );
      expect(readFile).toHaveBeenCalledWith(
        entry.replace(/^\/daedalOS(?=\/)/, "").split(/[?#]/)[0]
      );
      expect(loaded).toStrictEqual(["blob:local-image"]);
      expect(image?.url).toBe("blob:local-image");
      expect(cleanUpBufferUrl).not.toHaveBeenCalled();
      image?.dispose();
      image?.dispose();
      expect(cleanUpBufferUrl).toHaveBeenCalledTimes(1);
    }
  );

  it("retains an external URL without reading virtual storage", async () => {
    const url = "https://images.example.test/photo.png";
    const image = await loadSlideshowImage(url, readFile, controller.signal);
    expect(image?.url).toBe(url);
    expect(readFile).not.toHaveBeenCalled();
    image?.dispose();
    expect(cleanUpBufferUrl).not.toHaveBeenCalled();
  });

  it("skips missing virtual data without requesting its public path", async () => {
    readFile.mockRejectedValue(new Error("ENOENT"));
    await expect(
      loadSlideshowImage("/missing.png", readFile, controller.signal)
    ).resolves.toBeUndefined();
    expect(loaded).toStrictEqual([]);
    expect(bufferToUrl).not.toHaveBeenCalled();
  });

  it("skips an empty BrowserFS result", async () => {
    readFile.mockResolvedValue(Buffer.alloc(0));
    await expect(
      loadSlideshowImage("/empty.png", readFile, controller.signal)
    ).resolves.toBeUndefined();
    expect(loaded).toStrictEqual([]);
  });

  it("releases a local URL on decode failure", async () => {
    jest.mocked(bufferToUrl).mockReturnValueOnce("blob:missing-image");
    await expect(
      loadSlideshowImage("/bad.png", readFile, controller.signal)
    ).resolves.toBeUndefined();
    expect(cleanUpBufferUrl).toHaveBeenCalledWith("blob:missing-image");
  });

  it("aborts pending image loads and releases their URL", async () => {
    jest.mocked(bufferToUrl).mockReturnValueOnce("blob:pending-image");
    const pending = loadSlideshowImage(
      "/pending.png",
      readFile,
      controller.signal
    );
    await Promise.resolve();
    controller.abort();
    await expect(pending).resolves.toBeUndefined();
    expect(cleanUpBufferUrl).toHaveBeenCalledWith("blob:pending-image");
  });

  it("releases both original and resized object URLs", async () => {
    jest
      .mocked(fitImageToDecodeLimit)
      .mockResolvedValueOnce("blob:resized-image");
    const image = await loadSlideshowImage(
      "/large.png",
      readFile,
      controller.signal
    );
    expect(image?.url).toBe("blob:resized-image");
    image?.dispose();
    expect(cleanUpBufferUrl).toHaveBeenCalledWith("blob:local-image");
    expect(cleanUpBufferUrl).toHaveBeenCalledWith("blob:resized-image");
  });
});
