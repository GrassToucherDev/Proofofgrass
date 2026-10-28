// Every caption we hand to X / the share sheet carries the same three tags.
// withShareTags() is idempotent: tags already in the text (any capitalisation) are not repeated.
export const SHARE_TAGS = ["$TOUCHGRASS", "#TouchGrass", "#ProofOfGrass"];

export function withShareTags(text) {
  const base = String(text ?? "").trimEnd();
  const lower = base.toLowerCase();
  const missing = SHARE_TAGS.filter((t) => !lower.includes(t.toLowerCase()));
  if (!missing.length) return base;
  return `${base}${base ? "\n\n" : ""}${missing.join(" ")}`;
}
