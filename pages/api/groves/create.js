import { groveAction } from "../../../utils/groveApi";
export default groveAction("grove_create", (u, b) => {
  const name = String(b.name || "").trim();
  return name ? { p_username: u, p_name: name } : null;
});
