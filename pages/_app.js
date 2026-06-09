import { useEffect } from "react";
import "../styles/globals.css";

export default function App({ Component, pageProps }) {
  // Register service worker
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/service-worker.js", { scope: "/" })
      .then((reg) => {
        console.log("[PWA] Service worker registered:", reg.scope);
      })
      .catch((err) => {
        console.warn("[PWA] Service worker registration failed:", err);
      });
  }, []);

  return <Component {...pageProps} />;
}
