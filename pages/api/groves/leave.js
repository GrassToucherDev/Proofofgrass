import { groveAction } from "../../../utils/groveApi";
import { cleanUsername } from "../../../utils/requireOwner";
// An owner leaving a populated Grove must name a current member as the new owner (checked in SQL).
export default groveAction("grove_leave", (u, b) => ({ p_username: u, p_new_owner: cleanUsername(b.newOwner) || null }));
