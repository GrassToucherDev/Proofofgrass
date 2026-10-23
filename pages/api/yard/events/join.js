import { groveAction } from "../../../../utils/groveApi";
// Enter an event. Individual: the Google-verified owner of body.username. Grove events: their Grove, owner only (checked in SQL).
export default groveAction("yard_event_join", (u, b) =>
  typeof b.slug === "string" && /^[a-z0-9-]{3,60}$/.test(b.slug) ? { p_user: u, p_slug: b.slug } : null);
