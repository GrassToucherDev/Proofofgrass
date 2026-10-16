// utils/wagoTheme.js
// Single WAGO Drops palette, derived from the Proof of Grass V2 design system.
// Replaces the private dark `T` themes each page used to define.
// Key names are kept so existing styles keep working; values are the bright,
// outdoor-first V2 colors (white/cream surfaces, forest-green text, fresh-green accent).
import { V2 } from "./v2Theme";

export const T = {
  bg:      V2.cloudWhite,                 // panels / sheets
  surface: V2.cloudSoft,                  // inset surfaces
  card:    "#ffffff",
  border:  V2.borderSoft,
  olive:   V2.grassGreen,                 // primary accent (buttons, highlights)
  oliveD:  V2.grassDark,
  white:   V2.forestGreen,                // primary text (name kept for legacy styles)
  muted:   "rgba(13,42,5,0.62)",          // secondary text
  dim:     "rgba(13,42,5,0.38)",          // tertiary text
  green:   V2.grassDark,                  // positive text
  red:     V2.danger,
  yellow:  V2.gold,
};

export default T;
