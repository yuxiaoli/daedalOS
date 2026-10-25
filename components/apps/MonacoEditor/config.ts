import { BASE_PATH } from "utils/constants";

export const config = {
  paths: {
    vs: `${BASE_PATH}/Program Files/MonacoEditor/vs`,
  },
};

export const theme = "vs-dark";

export const customExtensionLanguages: Record<string, string> = {
  ".whtml": ".html",
};

export const URL_DELIMITER = "|";
