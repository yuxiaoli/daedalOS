const {
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
  existsSync,
  statSync,
} = require("fs");
const { extname, join } = require("path");
const { parse } = require("ini");

const BASE_PATH = process.env.BASE_PATH || "";
const PUBLIC_DIR = "public";

const HOME = "/Users/Public";
const DESKTOP_PATH = `${HOME}/Desktop`;
const START_MENU_PATH = `${HOME}/Start Menu`;

const ICON_PATH = `${BASE_PATH}/System/Icons`;
const SHORTCUT_ICON = `${ICON_PATH}/shortcut.webp`;
const NEW_FOLDER_ICON = `${ICON_PATH}/new_folder.webp`;

const USER_ICON_PATH = `${HOME}/Icons`;
const ICON_CACHE = `${USER_ICON_PATH}/Cache`;
const YT_ICON_CACHE = `${ICON_CACHE}/YouTube`;
const ICON_CACHE_EXTENSION = ".cache";

const VLC_SUBICON = `${ICON_PATH}/16x16/vlc.webp`;

const isYouTubeUrl = (url) =>
  url.includes("youtube.com/") || url.includes("youtu.be/");

const getYouTubeUrlId = (url) => {
  try {
    const { pathname, searchParams } = new URL(url);

    return searchParams.get("v") || pathname.split("/").pop() || "";
  } catch {
    // URL parsing failed
  }

  return "";
};

const getPublicDirectoryIcons = (directory) => [
  ...new Set(
    readdirSync(join(PUBLIC_DIR, directory)).reduce((icons, file) => {
      if (extname(file).toLowerCase() === ".url") {
        const {
          InternetShortcut: {
            BaseURL: pid = "",
            IconFile: icon = "",
            URL: url = "",
          },
        } = parse(readFileSync(join(PUBLIC_DIR, directory, file)).toString());
        const isVideo = pid === "VideoPlayer";

        if (isVideo && url) icons.push(encodeURI(VLC_SUBICON));

        if (icon) {
          const iconPath = icon.startsWith("/") ? `${BASE_PATH}${icon}` : icon;
          icons.push(encodeURI(iconPath));
        } else {
          if (isVideo && isYouTubeUrl(url)) {
            const iconFileName = `/${getYouTubeUrlId(
              url
            )}${ICON_CACHE_EXTENSION}`;

            if (
              existsSync(join(PUBLIC_DIR, YT_ICON_CACHE, `${iconFileName}`))
            ) {
              icons.push(
                encodeURI(`${BASE_PATH}${YT_ICON_CACHE}${iconFileName}`)
              );
            }
          } else {
            const iconPath = url || `${directory}/${file}`;
            const iconCacheFileName = `${iconPath}${ICON_CACHE_EXTENSION}`;

            if (
              extname(iconPath) &&
              existsSync(join(PUBLIC_DIR, ICON_CACHE, `${iconCacheFileName}`))
            ) {
              icons.push(
                encodeURI(`${BASE_PATH}${ICON_CACHE}${iconCacheFileName}`)
              );
            }
          }
        }
      }

      return icons;
    }, [])
  ),
];

const getIniIcons = () => {
  const iniIcons = {};
  const rootPath = join(PUBLIC_DIR, HOME);
  const readDirectory = (directory) =>
    readdirSync(directory).forEach((entry) => {
      const currentPath = join(directory, entry);

      if (statSync(currentPath).isDirectory()) readDirectory(currentPath);
      else if (entry === "desktop.ini") {
        const {
          ShellClassInfo: { IconFile = "" },
        } = parse(readFileSync(currentPath).toString());

        if (IconFile) {
          const directoryPath = directory.replace(join(PUBLIC_DIR), "");
          const iconPath = IconFile.startsWith("/")
            ? `${BASE_PATH}${IconFile}`
            : IconFile;

          iniIcons[directoryPath.replace(/\\/g, "/")] = encodeURI(iconPath);
        }
      }
    });

  readDirectory(rootPath);

  return iniIcons;
};

const preloadIcons = [
  ...getPublicDirectoryIcons(DESKTOP_PATH),
  ...getPublicDirectoryIcons(START_MENU_PATH),
  SHORTCUT_ICON,
  NEW_FOLDER_ICON,
];

if (!existsSync(join(PUBLIC_DIR, ".index"))) {
  mkdirSync(join(PUBLIC_DIR, ".index"));
}

writeFileSync(
  join(PUBLIC_DIR, ".index", "iniIcons.json"),
  JSON.stringify(getIniIcons())
);

writeFileSync(
  join(PUBLIC_DIR, ".index", "preloadIcons.json"),
  JSON.stringify([...new Set(preloadIcons)])
);
