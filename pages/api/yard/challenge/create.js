import { groveAction } from "../../../../utils/groveApi";
// Sends a 1v1 challenge. The challenger is the Google-verified owner of body.username, never a client-supplied name.
export default groveAction("yard_challenge_create", (u, b) => {
  const days = Number(b.days);
  if (![7, 14, 30].includes(days) || typeof b.target !== "string" || !b.target.trim()) return null;
  return { p_challenger: u, p_challenged: b.target, p_days: days, p_message: typeof b.message === "string" ? b.message : null };
});
