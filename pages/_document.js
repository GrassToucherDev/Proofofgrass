import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en" data-scroll-behavior="smooth">
      <Head>
        {/* ── PWA Manifest ──────────────────────────────────────────────── */}
        <link rel="manifest" href="/manifest.json" />

        {/* ── Theme & Brand Colors ──────────────────────────────────────── */}
        <meta name="theme-color" content="#080a06" />
        <meta name="msapplication-TileColor" content="#080a06" />
        <meta name="msapplication-config" content="/browserconfig.xml" />

        {/* ── Apple PWA (iOS) ───────────────────────────────────────────── */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Proof of Grass" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-152.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png" />
        <link rel="apple-touch-icon" sizes="167x167" href="/icons/icon-167.png" />

        {/* ── Apple Splash Screens (covers common iPhone sizes) ─────────── */}
        {/* iPhone 14 Pro Max */}
        <link rel="apple-touch-startup-image"
          media="screen and (device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)"
          href="/splash/splash-1290x2796.png" />
        {/* iPhone 14 Pro */}
        <link rel="apple-touch-startup-image"
          media="screen and (device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3)"
          href="/splash/splash-1179x2556.png" />
        {/* iPhone 14 / 13 / 12 */}
        <link rel="apple-touch-startup-image"
          media="screen and (device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)"
          href="/splash/splash-1170x2532.png" />
        {/* iPhone SE */}
        <link rel="apple-touch-startup-image"
          media="screen and (device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)"
          href="/splash/splash-750x1334.png" />

        {/* ── Favicons ──────────────────────────────────────────────────── */}
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/icons/favicon-16.png" />
        <link rel="shortcut icon" href="/favicon.ico" />

        {/* ── SEO / Open Graph ──────────────────────────────────────────── */}
        <meta name="description"
          content="Build outdoor streaks. Complete missions. Touch grass. Proof of Grass — the outdoor accountability platform." />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Proof of Grass" />
        <meta property="og:title" content="Proof of Grass" />
        <meta property="og:description"
          content="Build outdoor streaks. Complete missions. Touch grass." />
        <meta property="og:image" content="https://proofofgrass.app/og-image.png" />
        <meta property="og:url" content="https://proofofgrass.app" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@XTouchGrass" />
        <meta name="twitter:title" content="Proof of Grass" />
        <meta name="twitter:description"
          content="Build outdoor streaks. Complete missions. Touch grass." />
        <meta name="twitter:image" content="https://proofofgrass.app/og-image.png" />

        {/* ── Fonts ─────────────────────────────────────────────────────── */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=DM+Sans:wght@300;400;500;600;700&display=swap"
          rel="stylesheet" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}