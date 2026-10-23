// One place that turns backend challenge state into friendly labels. Every state has an icon AND text, never colour alone.
export function describe(ch, viewer) {
  const me = String(viewer || "").toLowerCase();
  const { status, result } = ch;
  if (status === "completed" || result) {
    if (result === "won") {
      const won = String(ch.winner || "").toLowerCase() === me;
      return me && (me === ch.challenger || me === ch.challenged)
        ? (won ? { key: "won", label: "Won", icon: "🏆", tone: "good" } : { key: "lost", label: "Lost", icon: "🌧️", tone: "bad" })
        : { key: "won", label: `@${ch.winner} won`, icon: "🏆", tone: "good" };
    }
    if (result === "tied") {
      const both = ch.challenger_days >= ch.duration_days && ch.challenged_days >= ch.duration_days;
      return { key: "tied", label: both ? "Both finished" : "Tied", icon: "🤝", tone: "neutral" };
    }
    if (result === "no_finish") return { key: "no_finish", label: "No finish", icon: "💤", tone: "muted" };
    return { key: "completed", label: "Completed", icon: "✅", tone: "neutral" };
  }
  if (status === "active") return { key: "active", label: "Active", icon: "🌿", tone: "good" };
  if (status === "pending") return { key: "pending", label: "Pending", icon: "⏳", tone: "warn" };
  if (status === "declined") return { key: "declined", label: "Declined", icon: "✋", tone: "muted" };
  if (status === "expired") return { key: "expired", label: "Expired", icon: "⌛", tone: "muted" };
  return { key: status || "unknown", label: status || "Unknown", icon: "•", tone: "muted" };
}
export const fmtDate = (iso) => { try { return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" }); } catch { return ""; } };
