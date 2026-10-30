import { BASE_PATH } from "utils/constants";
import {
  bufferToUrl,
  cleanUpBufferUrl,
  fitImageToDecodeLimit,
} from "utils/functions";

export type SlideshowImage = { dispose: () => void; url: string };

// Keep persisted entries as virtual paths. Object URLs belong only to this load.
export const loadSlideshowImage = async (
  entry: string,
  readFile: (path: string) => Promise<Buffer>,
  signal: AbortSignal
): Promise<SlideshowImage | undefined> => {
  const ownedUrls = new Set<string>();
  const dispose = (): void => {
    ownedUrls.forEach((url) => cleanUpBufferUrl(url));
    ownedUrls.clear();
  };

  try {
    if (signal.aborted) return undefined;

    let url = entry;
    if (entry.startsWith("/") && !entry.startsWith("//")) {
      const filePath = entry.split(/[?#]/)[0];
      const virtualPath =
        BASE_PATH && filePath.startsWith(`${BASE_PATH}/`)
          ? filePath.slice(BASE_PATH.length)
          : filePath;
      const data = await readFile(virtualPath);

      if (signal.aborted || data.length === 0) return undefined;
      url = bufferToUrl(data);
      ownedUrls.add(url);
    }

    await new Promise<void>((resolve, reject) => {
      const image = new Image();
      const listeners = new AbortController();
      let timeout = 0;
      const finish = (error?: Error): void => {
        window.clearTimeout(timeout);
        listeners.abort();
        if (error) {
          image.removeAttribute("src");
          reject(error);
        } else resolve();
      };
      timeout = window.setTimeout(
        () => finish(new Error("Slideshow image timed out")),
        15000
      );
      const options = { once: true, signal: listeners.signal };
      image.addEventListener("load", () => finish(), options);
      image.addEventListener(
        "error",
        () => finish(new Error("Slideshow image unavailable")),
        options
      );
      signal.addEventListener(
        "abort",
        () => finish(new Error("Slideshow load aborted")),
        options
      );
      if (signal.aborted) finish(new Error("Slideshow load aborted"));
      else image.src = url;
    });

    const fittedUrl = await fitImageToDecodeLimit(url);
    if (fittedUrl !== url && fittedUrl.startsWith("blob:")) {
      ownedUrls.add(fittedUrl);
    }
    if (signal.aborted) {
      dispose();
      return undefined;
    }

    return { dispose, url: fittedUrl };
  } catch {
    dispose();
    return undefined;
  }
};
