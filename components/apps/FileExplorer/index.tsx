import { basename } from "path";
import {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
  type FC,
  type KeyboardEvent,
} from "react";
import Navigation from "components/apps/FileExplorer/Navigation";
import StyledFileExplorer from "components/apps/FileExplorer/StyledFileExplorer";
import { type ComponentProcessProps } from "components/system/Apps/RenderComponent";
import { getIconFromIni } from "components/system/Files/FileEntry/functions";
import FileManager from "components/system/Files/FileManager";
import { useFileSystem } from "contexts/fileSystem";
import { useProcesses } from "contexts/process";
import {
  COMPRESSED_FOLDER_ICON,
  FOLDER_ICON,
  ICON_PATH,
  MOUNTED_FOLDER_ICON,
  PREVENT_SCROLL,
  ROOT_NAME,
} from "utils/constants";
import { haltEvent } from "utils/functions";
import { getMountUrl, isMountedFolder } from "contexts/fileSystem/core";

const FileExplorer: FC<ComponentProcessProps> = ({ id }) => {
  const {
    icon: setProcessIcon,
    title,
    processes: { [id]: process },
  } = useProcesses();
  const { icon = "", url = "" } = process || {};
  const { fs, rootFs } = useFileSystem();
  const [currentUrl, setCurrentUrl] = useState(url);
  const addressBarRef = useRef<HTMLInputElement | null>(null);
  const searchBarRef = useRef<HTMLInputElement | null>(null);
  const directoryName = basename(url);
  const mountUrl = getMountUrl(url, rootFs?.mntMap || {});
  const onKeyDown = useCallback((event: KeyboardEvent): void => {
    const eventKey = event.key.toUpperCase();

    if (event.altKey && eventKey === "D") {
      haltEvent(event);
      addressBarRef.current?.focus(PREVENT_SCROLL);
    } else if (
      eventKey === "F3" ||
      (event.ctrlKey && (eventKey === "E" || eventKey === "F"))
    ) {
      haltEvent(event);
      searchBarRef.current?.focus(PREVENT_SCROLL);
    } else {
      const fileManagerEntry = (event?.target as HTMLElement)?.querySelector(
        "ol li button"
      );

      fileManagerEntry?.dispatchEvent(
        new window.KeyboardEvent("keydown", {
          bubbles: true,
          cancelable: true,
          ctrlKey: event.ctrlKey,
          key: event.key,
          shiftKey: event.shiftKey,
        })
      );
    }
  }, []);

  useEffect(() => {
    if (url) {
      title(id, directoryName || ROOT_NAME);

      if (
        !icon ||
        url !== currentUrl ||
        (mountUrl && icon !== MOUNTED_FOLDER_ICON) ||
        icon === FOLDER_ICON
      ) {
        if (mountUrl && url === mountUrl) {
          setProcessIcon(
            id,
            isMountedFolder(rootFs?.mntMap?.[url])
              ? MOUNTED_FOLDER_ICON
              : COMPRESSED_FOLDER_ICON
          );
        } else if (fs) {
          setProcessIcon(
            id,
            `${ICON_PATH}/${directoryName ? "folder" : "pc"}.webp`
          );
          getIconFromIni(fs, url).then((iconFile) => {
            if (iconFile) setProcessIcon(id, iconFile);
          });
        }

        setCurrentUrl(url);
      }
    }
  }, [
    currentUrl,
    directoryName,
    fs,
    icon,
    id,
    mountUrl,
    rootFs?.mntMap,
    setProcessIcon,
    title,
    url,
  ]);

  return (
    <StyledFileExplorer>
      <Navigation
        addressBarRef={addressBarRef}
        hideSearch={false}
        id={id}
        searchBarRef={searchBarRef}
      />
      <FileManager
        id={id}
        onKeyDown={onKeyDown}
        readOnly={
          mountUrl ? !isMountedFolder(rootFs?.mntMap?.[mountUrl]) : false
        }
        url={url}
        view="icon"
        allowMovingDraggableEntries
        loadIconsImmediately
      />
    </StyledFileExplorer>
  );
};

export default memo(FileExplorer);
