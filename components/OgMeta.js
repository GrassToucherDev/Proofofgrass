// Per-page link-preview tags. `key`s make these replace the site-wide defaults from _app instead of duplicating them.
import Head from "next/head";

export const SITE_URL = "https://proofofgrass.app";
export const DEFAULT_OG = {
  title: "Touch Grass | Proof of Grass",
  description: "Official Touch Grass application for outdoor verification, streak tracking, wallet integration, and ecosystem rewards.",
  image: `${SITE_URL}/api/og?type=site&v=5`,
};

export default function OgMeta({ title, description, image, url }) {
  const t = title || DEFAULT_OG.title, d = description || DEFAULT_OG.description, i = image || DEFAULT_OG.image;
  return (
    <Head>
      <meta key="og:title" property="og:title" content={t} />
      <meta key="og:description" property="og:description" content={d} />
      <meta key="og:image" property="og:image" content={i} />
      <meta key="og:image:width" property="og:image:width" content="1200" />
      <meta key="og:image:height" property="og:image:height" content="630" />
      {url ? <meta key="og:url" property="og:url" content={url} /> : null}
      <meta key="twitter:card" name="twitter:card" content="summary_large_image" />
      <meta key="twitter:title" name="twitter:title" content={t} />
      <meta key="twitter:description" name="twitter:description" content={d} />
      <meta key="twitter:image" name="twitter:image" content={i} />
    </Head>
  );
}
