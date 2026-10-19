import { groveAction } from "../../../utils/groveApi";
import { cleanUsername } from "../../../utils/requireOwner";
export default groveAction("grove_gift_shield", (u, b) => {
  const to = cleanUsername(b.to);
  return to ? { p_from: u, p_to: to } : null;
});
