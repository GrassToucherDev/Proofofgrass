import { groveAction } from "../../../../utils/groveApi";
// Owner-only is enforced inside grove_equip_banner (checks groves.owner_username), not by the UI.
export default groveAction("grove_equip_banner", (u, b) => (typeof b.bannerId === "string" && /^[a-z0-9_]{1,40}$/.test(b.bannerId)) ? { p_username: u, p_banner: b.bannerId } : null);
