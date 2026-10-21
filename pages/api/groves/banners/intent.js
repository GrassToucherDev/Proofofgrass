import { groveAction } from "../../../../utils/groveApi";
// Step 1 of a purchase: re-checks membership server-side and binds Grove + banner + buyer + price snapshot.
export default groveAction("grove_banner_intent", (u, b) => (typeof b.bannerId === "string" && /^[a-z0-9_]{1,40}$/.test(b.bannerId)) ? { p_username: u, p_banner: b.bannerId } : null);
