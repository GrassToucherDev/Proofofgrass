// components/wago-drops/Wago.js
// The official WAGO mascot — single source for every placement in WAGO Drops.
//
// Pose assets live in /public/images/wago/. The canonical character reference
// is fixed (7 rounded petals, black oval eyes w/ single highlight, two collar
// leaves, open smile with tongue) — never redesign or substitute the art.
//
// To add a pose later: drop the transparent PNG in /public/images/wago/ and
// register it below. Pages reference poses by name, so new assets swap in
// without touching layouts. Unregistered poses fall back to the default.

export const WAGO_POSES = {
  salute: "/images/wago/wago-salute.png",   // default / share cards
  wave:   "/images/wago/wago-wave.png",     // welcome, signed-out
  point:  "/images/wago/wago-point.png",    // "find it" — map, hints
  cheer:  "/images/wago/wago-cheer.png",    // claim success, tickets won
  camera: "/images/wago/wago-camera.png",   // proof photo step
  ticket: "/images/wago/wago-ticket.png",   // Grass Tickets
  shrug:  "/images/wago/wago-shrug.png",    // empty states / not found
  sleep:  "/images/wago/wago-sleep.png",    // expired / nothing happening
};

const DEFAULT_POSE = "salute";

export default function Wago({
  pose = DEFAULT_POSE,
  size = 120,          // rendered height in px (art is taller than wide)
  flip = false,        // mirror horizontally
  float = false,       // gentle idle bob (uses v2Float keyframes when present)
  alt = "WAGO",
  style = {},
}) {
  const src = WAGO_POSES[pose] || WAGO_POSES[DEFAULT_POSE];
  return (
    <img
      src={src}
      alt={alt}
      draggable={false}
      className={float ? "v2-float" : undefined}
      style={{
        height: size,
        width: "auto",
        display: "block",
        transform: flip ? "scaleX(-1)" : undefined,
        userSelect: "none",
        filter: "drop-shadow(0 6px 16px rgba(26,74,10,0.18))",
        ...style,
      }}
      onError={e => { e.currentTarget.style.display = "none"; }}
    />
  );
}
