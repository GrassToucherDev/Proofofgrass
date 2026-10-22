import { groveAction } from "../../../../utils/groveApi";
// Cancels the caller's own unpaid checkout for a banner so they can restart it (or free it up for a teammate).
export default groveAction("grove_banner_cancel", (u, b) => (typeof b.bannerId === "string" && /^[a-z0-9_]{1,40}$/.test(b.bannerId)) ? { p_username: u, p_banner: b.bannerId } : null);
