import { groveAction } from "../../../utils/groveApi";
import { cleanUsername } from "../../../utils/requireOwner";
export default groveAction("grove_transfer_owner", (u, b) => { const n = cleanUsername(b.newOwner); return n ? { p_username: u, p_new_owner: n } : null; });
