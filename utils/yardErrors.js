// Friendly text for the error codes returned by /api/yard/* (and requireOwner).
const MSG = {
  not_signed_in: "Sign in with Google on your dashboard first. Challenges are tied to your secured username.",
  unclaimed: "Secure your username on your dashboard first, so only you can send and answer challenges.",
  not_owner: "That username belongs to a different Google account.",
  self: "You can't challenge yourself.",
  bad_duration: "Pick 7, 14 or 30 days.",
  unknown_user: "We couldn't find that user.",
  duplicate: "You already have an open challenge with them for that length.",
  too_many_pending: "You have 10 unanswered challenges. Wait for some replies first.",
  not_challenged: "Only the person who was challenged can answer.",
  not_pending: "This challenge was already answered.",
  expired: "This invite expired after 7 days.",
  not_found: "Challenge not found.",
  missing: "Missing details.",
};
export function yardError(d, fallback = "Something went wrong. Please try again.") {
  return MSG[d?.code] || MSG[d?.error] || (typeof d?.error === "string" && d.error.includes(" ") ? d.error : fallback);
}
