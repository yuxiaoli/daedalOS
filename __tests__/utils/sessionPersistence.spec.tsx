import * as React from "react";
import { createRoot, type Root } from "react-dom/client";
import { type SessionData } from "contexts/session/types";
import useSessionContextState from "contexts/session/useSessionContextState";
import { TRANSITIONS_IN_MILLISECONDS } from "utils/constants";
import type * as UtilsFunctions from "utils/functions";

const rootFs = {};
const fsActions = {
  deletePath: jest.fn<Promise<boolean>, [string]>(),
  lstat: jest.fn<Promise<{ blocks: number }>, [string]>(),
  readdir: jest.fn<Promise<string[]>, [string]>(),
  readFile: jest.fn<Promise<Buffer>, [string]>(),
  writeFile: jest.fn<Promise<boolean>, [string, string, boolean]>(),
};
jest.mock<{
  useFileSystemActions: () => typeof fsActions;
  useRootFs: () => typeof rootFs;
}>("contexts/fileSystem", () => ({
  useFileSystemActions: () => fsActions,
  useRootFs: () => rootFs,
}));
jest.mock<typeof UtilsFunctions>("utils/functions", () => ({
  ...jest.requireActual<typeof UtilsFunctions>("utils/functions"),
  maybeRequestIdleCallback: (callback) => callback(),
}));

const act = async (callback: () => void): Promise<void> => {
  await React.act(async () => {
    callback();
    await Promise.resolve();
  });
};
const finishBoot = async (): Promise<void> => {
  await React.act(async () => {
    await jest.advanceTimersByTimeAsync(TRANSITIONS_IN_MILLISECONDS.WINDOW * 2);
  });
};
const saved = (): SessionData =>
  JSON.parse(String(fsActions.writeFile.mock.calls.at(-1)?.[1])) as SessionData;

describe("session boot persistence", () => {
  let root: Root;
  let container: HTMLElement;
  let snapshot: ReturnType<typeof useSessionContextState>;
  const originalAct = Object.getOwnPropertyDescriptor(
    globalThis,
    "IS_REACT_ACT_ENVIRONMENT"
  );
  const originalReady = Object.getOwnPropertyDescriptor(
    window,
    "sessionIsWriteable"
  );
  const Probe = (): undefined => {
    const current = useSessionContextState();
    React.useEffect(() => {
      snapshot = current;
    }, [current]);
    return undefined;
  };

  beforeEach(async () => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    Reflect.deleteProperty(window, "sessionIsWriteable");
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    fsActions.lstat.mockResolvedValue({ blocks: 1 });
    fsActions.readFile.mockResolvedValue(
      Buffer.from(
        JSON.stringify({
          iconPositions: {},
          recentFiles: [],
          runHistory: ["retained command"],
          wallpaperFit: "fit",
          wallpaperImage: "GALAXY",
        })
      )
    );
    fsActions.writeFile.mockResolvedValue(true);
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    await act(() => root.render(<Probe />));
  });
  afterEach(async () => {
    await act(() => root.unmount());
    container.remove();
    jest.clearAllTimers();
    jest.useRealTimers();
    for (const [target, key, descriptor] of [
      [globalThis, "IS_REACT_ACT_ENVIRONMENT", originalAct],
      [window, "sessionIsWriteable", originalReady],
    ] as const) {
      if (descriptor) Object.defineProperty(target, key, descriptor);
      else Reflect.deleteProperty(target, key);
    }
  });

  it("persists the last early selection when readiness opens without another event", async () => {
    expect(snapshot.state.sessionLoaded).toBe(true);
    expect(window.sessionIsWriteable).not.toBe(true);
    await act(() => snapshot.actions.setWallpaper("SLIDESHOW", "fill"));
    await act(() =>
      snapshot.actions.setWallpaper("/Users/Public/Pictures/local.png", "tile")
    );
    expect(fsActions.writeFile).not.toHaveBeenCalled();
    await finishBoot();
    expect(fsActions.writeFile).toHaveBeenCalledTimes(1);
    expect(saved()).toMatchObject({
      runHistory: ["retained command"],
      wallpaperFit: "tile",
      wallpaperImage: "/Users/Public/Pictures/local.png",
    });
  });

  it("retains a loaded session when boot finishes without an edit", async () => {
    expect(fsActions.writeFile).not.toHaveBeenCalled();
    await finishBoot();
    expect(saved()).toMatchObject({
      runHistory: ["retained command"],
      wallpaperFit: "fit",
      wallpaperImage: "GALAXY",
    });
  });

  it("continues saving changes made after readiness", async () => {
    await finishBoot();
    fsActions.writeFile.mockClear();
    await act(() => snapshot.actions.setWallpaper("SLIDESHOW"));
    expect(fsActions.writeFile).toHaveBeenCalledTimes(1);
    expect(saved().wallpaperImage).toBe("SLIDESHOW");
  });

  it("honors halt during boot and saves the pending selection on resume", async () => {
    await act(() => {
      snapshot.actions.setHaltSession(true);
      snapshot.actions.setWallpaper("SLIDESHOW");
    });
    await finishBoot();
    expect(fsActions.writeFile).not.toHaveBeenCalled();
    await act(() => snapshot.actions.setHaltSession(false));
    expect(saved().wallpaperImage).toBe("SLIDESHOW");
  });

  it("cancels the readiness timer when unmounted", async () => {
    await act(() => root.render(undefined));
    await finishBoot();
    expect(fsActions.writeFile).not.toHaveBeenCalled();
    expect(window.sessionIsWriteable).not.toBe(true);
  });
});
