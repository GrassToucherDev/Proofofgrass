// Friendly text for the error codes returned by /api/yard/* (and requireOwner).
const MSG = {
  not_signed_in: "Sign in with Google first. The Yard is tied to your secured username.",
  unclaimed: "Secure your username on your dashboard first, so only you can act as you in The Yard.",
  not_owner: "That username belongs to a different Google account.",
  self: "You can't challenge yourself.",
  bad_duration: "Pick 7, 14 or 30 days.",
  unknown_user: "We couldn't find that user.",
  duplicate: "You already have an open challenge with them.",
  too_many_pending: "You have too many unanswered challenges. Wait for some replies first.",
  not_challenged: "Only the person who was challenged can answer.",
  not_pending: "This challenge was already answered.",
  expired: "This invite expired after 7 days.",
  not_found: "Challenge not found.",
  not_in_grove: "You need to be in a Grove to send a Grove challenge.",
  owner_only: "Only the Grove owner can send and answer Grove challenges.",
  too_small: "A Grove needs at least 3 members to compete.",
  target_too_small: "That Grove needs at least 3 members to compete.",
  challenger_too_small: "The challenging Grove no longer has 3 members.",
  unknown_grove: "We couldn't find that Grove.",
  self_grove: "You can't challenge your own Grove.",
  not_open: "This event isn't open for entries.",
  already_entered: "You're already in.",
  missing: "Missing details.",
};
export function yardError(d, fallback = "Something went wrong. Please try again.") {
  return MSG[d?.code] || MSG[d?.error] || (typeof d?.error === "string" && d.error.includes(" ") ? d.error : fallback);
}
