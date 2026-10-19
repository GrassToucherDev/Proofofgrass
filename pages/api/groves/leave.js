import { groveAction } from "../../../utils/groveApi";
export default groveAction("grove_leave", (u) => ({ p_username: u }));
