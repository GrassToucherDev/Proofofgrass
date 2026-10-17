// components/wago-drops/CoverImage.js
// Campaign cover photo. Renders nothing when there is no image (or it fails to load),
// so callers can drop it in without layout checks.
import { useState } from "react";

export default function CoverImage({ src, alt = "", height = 140, radius = 14, style = {} }) {
  const [bad, setBad] = useState(false);
  if (!src || bad) return null;
  return (
    <img src={src} alt={alt} loading="lazy" draggable={false} onError={() => setBad(true)}
      style={{ width: "100%", height, objectFit: "cover", borderRadius: radius, display: "block", background: "#dcebd3", ...style }} />
  );
}
