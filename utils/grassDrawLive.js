// Pure helpers for the Grass Draw live reveal. The SERVER decides what each viewer may see at a given moment,
// so winners can't be read ahead of time from the API.
export const TIER = { grass_score: 0, shield: 1, profile_pack: 2, nft: 3 };
export const PACK_NAMES = {
  retro_covers_pack: "Retro Covers Pack", anime_nature_pack: "Anime Nature Pack",
  y2k_pack: "Y2K Pack", trenches_pack: "Trenches Pack", blockchain_trails_pack: "Blockchain Trails Pack",
};

export function prizeLabel(w) {
  switch (w.reward_type) {
    case "grass_score": return `+${Number(w.reward_value?.amount) || 250} Grass Score`;
    case "shield": return "Streak Shield";
    case "profile_pack": return PACK_NAMES[w.reward_reference] || "Profile Pack";
    case "nft": return w.reward_value?.nft_collection ? `${String(w.reward_value.nft_collection).replace(/_/g, " ")} NFT` : "NFT";
    default: return "Prize";
  }
}

// Smaller prizes first, the big one last.
export function revealOrder(winners) {
  const round = (w) => Number(w.metadata?.draw_log?.find?.((r) => String(r.selected).toLowerCase() === String(w.username).toLowerCase())?.round) || 0;
  return [...winners].sort((a, b) => (TIER[a.reward_type] ?? 9) - (TIER[b.reward_type] ?? 9) || round(a) - round(b) || String(a.username).localeCompare(b.username)).map((w) => w.id);
}

// Where is this show at `nowMs`?  total = number of winners to reveal.
export function showPhase(show, total, nowMs) {
  if (!show) return { phase: "none" };
  if (!show.started_at) return { phase: "scheduled", countdown_ms: show.scheduled_at ? Math.max(0, new Date(show.scheduled_at).getTime() - nowMs) : null };
  const start = new Date(show.started_at).getTime();
  const t = nowMs - start;
  if (t < 0) return { phase: "countdown", countdown_ms: -t };
  const intro = show.intro_seconds * 1000, step = show.step_seconds * 1000;
  if (t < intro) return { phase: "intro", next_reveal_in_ms: intro - t, revealed: 0 };
  const k = Math.min(total, Math.floor((t - intro) / step) + 1);
  if (k >= total && (t - intro) >= (total - 1) * step + step) return { phase: "done", revealed: total };
  return { phase: "revealing", revealed: k, next_reveal_in_ms: k >= total ? (total * step + intro) - t : intro + k * step - t };
}
