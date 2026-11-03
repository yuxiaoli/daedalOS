import * as React from "react";
import { createRoot } from "react-dom/client";
import StatusBar from "components/apps/MonacoEditor/StatusBar";

const writeFile = jest.fn().mockResolvedValue(true);
const prependFileToTitle = jest.fn();
const updateFolder = jest.fn();
let content: string;
const editor = {
  getModel: () => ({
    uri: { path: "/Users/Public/Documents/Welcome.txt|0", scheme: "file" },
  }),
  getValue: () => content,
  onDidChangeCursorPosition: jest.fn(),
  onDidChangeModel: jest.fn(),
  onDidChangeModelContent: jest.fn(),
};
jest.mock<{
  useFileSystemActions: () => {
    updateFolder: typeof updateFolder;
    writeFile: typeof writeFile;
  };
}>("contexts/fileSystem", () => ({
  useFileSystemActions: () => ({ updateFolder, writeFile }),
}));
jest.mock<{ useProcess: () => { editor: typeof editor; url: string } }>(
  "contexts/process",
  () => ({
    useProcess: () => ({ editor, url: "/Users/Public/Documents/Welcome.txt" }),
  })
);
jest.mock<{
  __esModule: boolean;
  default: () => { prependFileToTitle: typeof prependFileToTitle };
}>("components/system/Window/useTitle", () => ({
  __esModule: true,
  default: () => ({ prependFileToTitle }),
}));
jest.mock<{ __esModule: boolean; default: string }>(
  "components/apps/MonacoEditor/StyledStatusBar",
  () => ({
    __esModule: true,
    default: "footer",
  })
);
jest.mock<{ __esModule: boolean; default: string }>(
  "components/apps/MonacoEditor/StyledNotifications",
  () => ({
    __esModule: true,
    default: "ul",
  })
);
jest.mock<{ __esModule: boolean; default: string }>(
  "styles/common/Button",
  () => ({
    __esModule: true,
    default: "button",
  })
);

describe("monaco Save button", () => {
  it.each(["", "synthetic saved content"])(
    "saves exact content %j",
    async (value) => {
      jest.clearAllMocks();
      content = value;
      const container = document.createElement("div");
      document.body.append(container);
      const root = createRoot(container);
      const previousActEnvironment: unknown = Reflect.get(
        globalThis,
        "IS_REACT_ACT_ENVIRONMENT"
      );
      Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
      try {
        await React.act(async () => {
          root.render(<StatusBar id="test" />);
          await Promise.resolve();
        });
        await React.act(async () => {
          container
            .querySelector<HTMLButtonElement>('button[aria-label="Save"]')
            ?.click();
          await Promise.resolve();
        });
        expect(writeFile).toHaveBeenCalledWith(
          "/Users/Public/Documents/Welcome.txt",
          value,
          true
        );
        expect(prependFileToTitle).toHaveBeenCalledWith("Welcome.txt");
        expect(container.textContent).toContain("File saved");
      } finally {
        await React.act(async () => {
          root.unmount();
          await Promise.resolve();
        });
        container.remove();
        Object.assign(globalThis, {
          IS_REACT_ACT_ENVIRONMENT: previousActEnvironment,
        });
      }
    }
  );
});
