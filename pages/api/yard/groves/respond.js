import { groveAction } from "../../../../utils/groveApi";
// Accept or decline. Only the owner of the challenged Grove can answer (checked in SQL).
export default groveAction("yard_grove_challenge_respond", (u, b) =>
  (typeof b.slug === "string" && b.slug.length < 120 && (b.action === "accept" || b.action === "decline"))
    ? { p_user: u, p_slug: b.slug, p_accept: b.action === "accept" } : null);
