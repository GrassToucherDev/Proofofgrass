import { groveAction } from "../../../../utils/groveApi";
// Accept or decline. Only the challenged player (verified owner of body.username) can answer.
export default groveAction("yard_challenge_respond", (u, b) =>
  (typeof b.slug === "string" && b.slug.length < 120 && (b.action === "accept" || b.action === "decline"))
    ? { p_username: u, p_slug: b.slug, p_accept: b.action === "accept" } : null);
