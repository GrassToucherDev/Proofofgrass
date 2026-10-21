# Grove banner artwork spec

Banners are plain illustrations. **No text, names, avatars, streaks or logos in the art** — the app draws those live.

| | |
|---|---|
| Size | **1600 × 560 px** (20:7), WebP (or PNG), ≤ 400 KB |
| Location | `public/grove-banners/<file>.webp` |
| Files | `default.webp`, `campfire-crew.webp`, `trailblazers.webp`, `rooted-together.webp` |
| Safe areas | **Left 55%** (x 0–880): keep calm/low-detail — the Grove name and stats are overlaid here (a dark scrim is applied, but busy art still hurts legibility). **Right 45%**: put the focal character/object here (centered around x ≈ 1250). |
| Vertical safety | Keep anything important between y 70 and y 490. The page card crops to roughly 2:1 on phones (≈ 1120 × 560 centre-right crop), the share card uses the full 20:7. |
| Edges | Art must be full-bleed; corners are rounded by the app. |

Until a file exists the app shows a generated development placeholder (labelled "Placeholder art" on the Groves page).
To add a new banner: add a row to `grove_banners` (id, name, description, art_path) and set `price_usd` via the admin route.
