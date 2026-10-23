import { useState, useEffect, useCallback } from "react";

export function getYardUser() {
  if (typeof window === "undefined") return "";
  try { return (localStorage.getItem("pog_username") || "").replace(/@/g, "").toLowerCase().trim(); } catch { return ""; }
}

// Loads /api/yard/overview for the stored username. `reload()` refetches (used after accept/decline/send).
export function useYard() {
  const [username, setUsername] = useState("");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const load = useCallback(async (u) => {
    try {
      const r = await fetch(`/api/yard/overview${u ? `?username=${encodeURIComponent(u)}` : ""}`, { cache: "no-store" });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "Could not load The Yard.");
      setData(d); setError("");
    } catch (e) { setError(e.message || "Could not load The Yard."); }
    setReady(true);
  }, []);
  useEffect(() => { const u = getYardUser(); setUsername(u); load(u); }, [load]);
  return { username, data, error, ready, reload: () => load(username) };
}

export async function yardPost(path, body) {
  const r = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const d = await r.json().catch(() => ({}));
  return { ok: r.ok && d.ok !== false, data: d };
}

// The viewer's Grove and its Grove vs Grove challenges. `data.grove` is null when they are not in a Grove.
export function useYardGroves(username) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/yard/groves/overview${username ? `?username=${encodeURIComponent(username)}` : ""}`, { cache: "no-store" });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "Could not load Grove challenges.");
      setData(d); setError("");
    } catch (e) { setError(e.message || "Could not load Grove challenges."); }
    setReady(true);
  }, [username]);
  useEffect(() => { load(); }, [load]);
  return { data, error, ready, reload: load };
}
