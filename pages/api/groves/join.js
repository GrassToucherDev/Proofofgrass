import { groveAction } from "../../../utils/groveApi";
export default groveAction("grove_join", (u, b) => {
  const code = String(b.code || "").trim().toLowerCase();
  return /^[a-f0-9]{10}$/.test(code) ? { p_username: u, p_code: code } : null;
});
