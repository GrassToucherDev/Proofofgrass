import { useEffect, useState } from "react";

// Google sign-in is unreliable inside in-app browsers (X, Instagram, Facebook, TikTok, ...), and they keep their
// own cookie jar, so a login made there is not shared with Safari or Chrome. Show a short, honest tip.
export default function InAppBrowserNote({ style }) {
  const [inApp, setInApp] = useState(false);
  useEffect(() => {
    const ua = typeof navigator !== "undefined" ? navigator.userAgent || "" : "";
    setInApp(/Twitter|Instagram|FBAN|FBAV|MicroMessenger|TikTok|musical_ly|Snapchat|Line\//i.test(ua));
  }, []);
  if (!inApp) return null;
  return (
    <div role="note" style={{ fontSize: 12.5, lineHeight: 1.45, color: "#6b4d00", background: "rgba(232,160,32,0.12)",
      border: "1px solid rgba(232,160,32,0.35)", borderRadius: 10, padding: "8px 12px", margin: "8px 0", ...style }}>
      You are in an in-app browser. For the most reliable sign-in (and to stay signed in), open this page in Safari or Chrome
      using the menu (•••) and choose "Open in browser".
    </div>
  );
}
