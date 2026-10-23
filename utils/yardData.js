// Server helper: profile pictures are cosmetic, so a failed lookup just means no avatars.
export async function loadAvatars(db, names) {
  if (!names.length) return {};
  try {
    const { data } = await db.from("Profiles").select("username, avatar_url").in("username", names);
    return Object.fromEntries((data || []).map((p) => [String(p.username).toLowerCase(), p.avatar_url || null]));
  } catch { return {}; }
}
