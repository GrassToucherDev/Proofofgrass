// GET — the id of the build that is live right now (compared by VersionGuard in the browser).
export default function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.status(200).json({ id: process.env.NEXT_PUBLIC_BUILD_ID || null });
}
