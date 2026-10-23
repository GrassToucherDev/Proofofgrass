import { groveAction } from "../../../../utils/groveApi";
// Sends a Grove vs Grove challenge. Only the verified owner of body.username, and only if they own their Grove (checked in SQL).
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export default groveAction("yard_grove_challenge_create", (u, b) => {
  const days = Number(b.days);
  if (![7, 14, 30].includes(days) || typeof b.target !== "string" || !UUID.test(b.target)) return null;
  return { p_user: u, p_target: b.target, p_days: days, p_message: typeof b.message === "string" ? b.message : null };
});
