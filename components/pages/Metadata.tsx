import Head from "next/head";
import { memo } from "react";
import { useCursor } from "components/pages/hooks/useCursor";
import { useFaviconAndTitle } from "components/pages/hooks/useFaviconAndTitle";
import desktopIcons from "public/.index/desktopIcons.json";
import {
  BASE_PATH,
  DESKTOP_PROFILE,
  DESKTOP_URL,
  HIGH_PRIORITY_ELEMENT,
} from "utils/constants";
import {
  getExtension,
  getMimeType,
  imageSrcs,
  isDynamicIcon,
} from "utils/functions";

const description =
  "Sean / Yuxiao Li's personal desktop: explore Vector Index, AI applications, cloud services, and open-source projects. Built on daedalOS.";

const PreloadIcons = memo(() =>
  desktopIcons.map((icon) => {
    const isSubIcon = icon.includes("/16x16/");
    const dynamicIcon = !isSubIcon && isDynamicIcon(icon);
    const extension = getExtension(icon);

    return (
      <link
        key={icon}
        as="image"
        href={dynamicIcon || isSubIcon ? undefined : icon}
        imageSrcSet={
          dynamicIcon
            ? imageSrcs(icon, 48, extension)
            : isSubIcon
              ? imageSrcs(icon.replace("16x16/", ""), 16, extension)
              : undefined
        }
        rel="preload"
        type={getMimeType(extension)}
        {...HIGH_PRIORITY_ELEMENT}
      />
    );
  })
);

const Metadata: FC = () => {
  const { Favicon, title } = useFaviconAndTitle();

  return (
    <Head>
      <title>{title}</title>
      {Favicon}
      <meta
        content="width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, interactive-widget=resizes-content"
        name="viewport"
      />
      <meta content={description} name="description" />
      <meta content={DESKTOP_PROFILE.title} property="og:title" />
      <meta content="website" property="og:type" />
      <meta content={DESKTOP_URL} property="og:url" />
      <meta content={`${DESKTOP_URL}/screenshot.png`} property="og:image" />
      <meta content={description} property="og:description" />
      <link
        href={`${BASE_PATH}/rss.xml`}
        rel="alternate"
        title={`RSS Feed for ${DESKTOP_PROFILE.title}`}
        type="application/rss+xml"
      />
      <PreloadIcons />
      {useCursor()}
    </Head>
  );
};

export default memo(Metadata);
