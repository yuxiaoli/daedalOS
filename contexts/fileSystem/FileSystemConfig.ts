import { type FileSystemConfiguration } from "browserfs";
import { fs9pToBfs } from "contexts/fileSystem/core";
import { BASE_PATH } from "utils/constants";

const index = fs9pToBfs();

const FileSystemConfig = (writeToMemory = false): FileSystemConfiguration => ({
  fs: "MountableFileSystem",
  options: {
    "/": {
      fs: "OverlayFS",
      options: {
        readable: {
          fs: "HTTPRequest",
          options: {
            baseUrl: BASE_PATH,
            index,
          },
        },
        writable: {
          fs: writeToMemory ? "InMemory" : "IndexedDB",
        },
      },
    },
  },
});

export default FileSystemConfig;
