import * as React from "react";
import { createRoot, type Root } from "react-dom/client";

const pending = new Map<string, (data: Buffer) => void>();
const readFile = jest.fn(
  (url: string) => new Promise<Buffer>((resolve) => pending.set(url, resolve))
);
const setModel = jest.fn();
const editor = {
  getModel: jest.fn(() => undefined),
  setModel,
  updateOptions: jest.fn(),
  onKeyDown: jest.fn(),
  dispose: jest.fn(),
  focus: jest.fn(),
};
const createModel = jest.fn((value: string) => ({
  value,
  onDidChangeContent: jest.fn(),
  dispose: jest.fn(),
}));
const monaco = {
  Uri: { parse: (path: string) => ({ path }) },
  editor: { create: jest.fn(() => editor), createModel, getModels: () => [] },
};
const prependFileToTitle = jest.fn();
const setArgument = jest.fn();
jest.mock("@monaco-editor/loader", () => ({
  __esModule: true,
  default: { config: jest.fn(), init: () => Promise.resolve(monaco) },
}));
jest.mock("contexts/fileSystem", () => ({
  useFileSystemActions: () => ({
    readFile,
    updateFolder: jest.fn(),
    writeFile: jest.fn(),
  }),
}));
jest.mock("contexts/process", () => ({
  useProcessesActions: () => ({ argument: setArgument }),
}));
jest.mock("components/system/Window/useTitle", () => ({
  __esModule: true,
  default: () => ({ prependFileToTitle }),
}));
jest.mock("components/apps/MonacoEditor/functions", () => ({
  detectLanguage: () => "",
  getSaveFileInfo: () => [],
  relocateShadowRoot: jest.fn(),
}));
jest.mock("utils/globals", () => ({ shareGlobal: jest.fn() }));

// The optional absolute path allows a read-only copy of the baseline hook to
// run through the same assertions as the candidate, without altering source.
const useMonaco: typeof import("components/apps/MonacoEditor/useMonaco").default =
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require(
    process.env.MONACO_TEST_BASELINE || "components/apps/MonacoEditor/useMonaco"
  ).default;

const setLoading = jest.fn();
const Probe = ({ url }: { url: string }): React.JSX.Element => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  useMonaco({ containerRef, id: "test", loading: false, setLoading, url });
  return <div ref={containerRef} />;
};

describe("Monaco deferred reads", () => {
  let root: Root;
  let container: HTMLDivElement;
  const previousAct = Object.getOwnPropertyDescriptor(
    globalThis,
    "IS_REACT_ACT_ENVIRONMENT"
  );
  beforeEach(() => {
    jest.clearAllMocks();
    pending.clear();
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });
  afterEach(async () => {
    await React.act(async () => root.unmount());
    container.remove();
    if (previousAct)
      Object.defineProperty(
        globalThis,
        "IS_REACT_ACT_ENVIRONMENT",
        previousAct
      );
    else Reflect.deleteProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT");
  });
  it("does not create or install a model after its window closes during a read", async () => {
    await React.act(async () => {
      root.render(<Probe url="/first.txt" />);
    });
    expect(pending.has("/first.txt")).toBe(true);
    await React.act(async () => root.unmount());
    await React.act(async () => {
      pending.get("/first.txt")?.(Buffer.from("late"));
      await Promise.resolve();
    });
    expect(createModel).not.toHaveBeenCalled();
    expect(setModel).not.toHaveBeenCalled();
  });
  it("keeps the latest file when an older read finishes last", async () => {
    await React.act(async () => {
      root.render(<Probe url="/first.txt" />);
    });
    expect(pending.has("/first.txt")).toBe(true);
    await React.act(async () => {
      root.render(<Probe url="/second.txt" />);
    });
    expect(pending.has("/second.txt")).toBe(true);
    await React.act(async () => {
      pending.get("/second.txt")?.(Buffer.from("newer"));
      await Promise.resolve();
    });
    expect(createModel).toHaveBeenCalledTimes(1);
    expect(createModel).toHaveBeenCalledWith("newer", "", {
      path: "/second.txt|0",
    });
    await React.act(async () => {
      pending.get("/first.txt")?.(Buffer.from("older"));
      await Promise.resolve();
    });
    expect(createModel).toHaveBeenCalledTimes(1);
    expect(setModel).toHaveBeenCalledTimes(1);
    expect(setModel).toHaveBeenLastCalledWith(
      expect.objectContaining({ value: "newer" })
    );
  });
});
