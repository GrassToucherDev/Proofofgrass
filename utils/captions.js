// Share-post captions.
//  - {n} is replaced with the real streak, so a caption can never state the wrong number.
//  - "community" = crypto / in-joke voice. "plain" = readable by someone who has never heard of the token.
//  - Exact milestone days, shield saves and fresh restarts have their own pools.
//  - The last few captions a person saw are remembered on this device so they don't repeat back to back.

const COMMUNITY = {
  beginner: [
    "just touched grass. strong start. 🌿",
    "left the screen. touched the ground. character arc initiated.",
    "outside logged. vitamin d detected. streak: active.",
    "not financial advice, but touch grass. this is my proof.",
    "skill check passed. grass interaction: successful.",
    "gm from outside. yes, outside. the big open-world map.",
    "offline for 20 minutes. came back with grass on my shoes.",
    "step one: go outside. step two: take photo. step three: this.",
    "touched grass before checking price. personal record.",
    "irl visit confirmed. grass: present. cope: absent.",
    "proof of work. the work was touching grass.",
    "walked outside. did not refresh x. felt fine.",
    "logged off. went out. came back stronger.",
    "fresh air acquired. timestamp verified. streak: building.",
  ],
  momentum: [
    "{n} days in. streak getting real. 🌿",
    "the algorithm does not know where i am.",
    "grass touched again. this might be a habit.",
    "consistent. outside. undefeated.",
    "real-world xp farming session complete. streak: locked.",
    "the outdoor meta is holding. i am staying in.",
    "disconnected from wi-fi. connected to chlorophyll. again.",
    "dev update: shipped another walk. zero bugs.",
    "day after day. grass after grass. no signs of stopping.",
    "momentum is real. the outdoors keeps paying dividends.",
    "{n} days of proof and the chart only goes one direction.",
  ],
  strong: [
    "{n} days. consistency looking dangerous. 🌿",
    "the grass knows my name now.",
    "this is no longer a coincidence.",
    "streak so strong it has its own lore.",
    "this started as a joke. it is not a joke anymore.",
    "certified long-term grass enjoyer. data-backed.",
    "i have touched more grass than most nfts.",
    "the outdoors have accepted me.",
    "daily grass interaction: active. cope: zero.",
    "{n} days deep. the habit is doing the heavy lifting now.",
  ],
  elite: [
    "{n} days. this isn't a phase anymore. it's identity. 🌿",
    "i am the outdoor meta.",
    "streak unlocked: outdoor main character.",
    "some people have lore. i have a {n}-day streak.",
    "i do not go outside anymore. i simply return.",
    "fully on-chain. fully outside. no contradictions.",
    "elite grass toucher. verified. unstoppable.",
    "the streak has a market cap now.",
    "at this point the grass is just an extension of my wallet.",
    "{n} days and the leaderboard is starting to notice.",
  ],
  veteran: [
    "{n} days of proof. the streak is a structure now. 🌿",
    "{n} days outside. no asterisks on the effort.",
    "the streak has outlasted a calendar month. it is not stopping.",
    "{n} days of daily discipline. the outdoors know me by now.",
    "veteran status. earned one day at a time.",
    "{n} days on the books. this is the long game.",
    "{n} days in and the streak still feels hungry.",
    "the calendar turned. the streak did not.",
    "the habit is now load-bearing. day {n}.",
    "outdoor certification, renewed daily. day {n}.",
  ],
  legendary: [
    "{n} days outside and still counting. 🌿",
    "day {n}. this is not a coincidence. this is a calling.",
    "the leaderboard takes me seriously now.",
    "{n} proofs in a row. the chain keeps growing.",
    "legendary tier confirmed. day {n}.",
    "{n} days certified. i did not come this far to stop.",
    "the streak is old enough to have its own reputation.",
    "at {n} days, the streak starts speaking for itself.",
    "legendary status is not claimed. it is logged. every day.",
    "{n} days of outdoor proof. the record speaks.",
  ],
  mythic: [
    "{n} days of daily proof. the streak is mythology. 🌿",
    "day {n}. the leaderboard is a trophy case and i have a reserved spot.",
    "triple digits and still going. day {n}.",
    "the streak does not acknowledge limits. day {n}.",
    "{n} days outside. this is no longer a habit. it is identity.",
    "mythic status reached. the outdoors and i have an agreement.",
    "a {n}-day streak is not something you build. it is something you become.",
    "the streak has a three-digit story now. day {n}, every log matters.",
    "{n} proofs submitted. the grass keeps showing up and so do i.",
    "day {n}. i stopped counting days and started counting years.",
  ],
};

const PLAIN = {
  beginner: [
    "20 minutes outside, phone down, photo taken. 🌿",
    "went for a walk and took a photo to prove it. simple as that.",
    "starting a streak: one outdoor photo a day. here is today's.",
    "fresh air, real grass, no screen. good start.",
    "trying to get outside every single day. today counts.",
    "stepped away from the desk and into the sun. 🌿",
    "small habit, big difference. outside again today.",
    "taking a daily outdoor photo challenge. today's proof.",
  ],
  momentum: [
    "{n} days in a row outside. it's turning into a habit. 🌿",
    "outside again today. the streak is {n} days and counting.",
    "every day's a bit easier to get out the door.",
    "{n} days of fresh air so far. feeling it.",
    "the daily walk is sticking. day {n}.",
    "one photo, one walk, one more day on the streak.",
    "didn't feel like going out. went anyway. day {n}.",
    "keeping the streak alive with some time outdoors.",
  ],
  strong: [
    "a full week-plus of getting outside every day. {n} and counting. 🌿",
    "{n} days in a row. it's starting to feel normal.",
    "i genuinely look forward to this part of the day now.",
    "{n} days outside. the best part of my routine.",
    "didn't think i'd keep this up. day {n}.",
    "daily time outdoors, {n} days running. highly recommend.",
    "{n} days straight. my mood has noticed.",
    "the habit stuck. {n} days of fresh air.",
  ],
  elite: [
    "{n} days outside in a row. it's just part of my day now. 🌿",
    "two weeks and then some. day {n}.",
    "{n} days. proof that small daily habits add up.",
    "showing up outside every day for {n} days. no big secret.",
    "the streak is at {n} days and i'm not slowing down.",
    "{n} days of daily outdoor time. better sleep, better focus.",
    "consistency beats motivation. day {n}.",
    "{n} days in. the habit is doing the work now.",
  ],
  veteran: [
    "over a month of getting outside every day. day {n}. 🌿",
    "{n} days in a row. it started small and stayed.",
    "a month-plus of daily outdoor time. the best habit i've kept.",
    "{n} days outside. if i can do it, you can.",
    "{n} days straight. the habit holds up on busy days too.",
    "day {n}. the hardest part was day one. now it's just routine.",
    "{n} days of fresh air, no days skipped on purpose.",
    "turns out a few minutes outside each day adds up. day {n}.",
  ],
  legendary: [
    "{n} days outside in a row. 🌿",
    "day {n}. still getting outside, every single day.",
    "{n} days of daily outdoor time. try one for a week.",
    "past the {n}-day mark and it still feels good.",
    "{n} days running. no secret, just showing up.",
    "{n} days of proof that a daily walk is worth it.",
    "day {n}. it's not a challenge anymore, it's just how i live.",
    "{n} days and counting. come join me for a week.",
  ],
  mythic: [
    "{n} days outside in a row. 🌿",
    "day {n} of getting outside. highly recommend the habit.",
    "{n} days straight. it all started with one photo.",
    "day {n}. one small habit, kept long enough to change things.",
    "{n} days of daily time outdoors. ask me how.",
    "{n} consecutive days. same routine, new day, still worth it.",
    "day {n}. start with one day. that's all this took.",
    "{n} days in a row and i'm not done.",
  ],
};

// Exact-day moments. Used on that day only, in both tones.
const MILESTONE = {
  1: [
    "day one. the streak starts here. 🌿",
    "day 1 done. outside, photo taken, streak started.",
    "first proof logged. let's see how far this goes.",
  ],
  7: [
    "one full week outside, every day. 🌿",
    "7 days in a row. the habit is real now.",
    "day 7. a week of proof and it's only getting started.",
  ],
  14: [
    "two weeks straight outside. 🌿",
    "14 days in a row. this is officially a routine.",
    "day 14. two weeks of showing up.",
  ],
  30: [
    "30 days. a full month outside, every day. 🌿",
    "day 30. one month of proof, zero excuses.",
    "a month of daily outdoor time. day 30 locked in.",
  ],
  50: [
    "day 50. fifty days outside in a row. 🌿",
    "50 days of proof. halfway to triple digits.",
    "fifty straight days outdoors. day 50 done.",
  ],
  100: [
    "day 100. one hundred days outside in a row. 🌿",
    "triple digits. 100 days of daily proof.",
    "100 days. it all started with one photo.",
  ],
  200: [
    "day 200. two hundred days outside in a row. 🌿",
    "200 straight days of proof. still going.",
    "two hundred days. the habit has no off switch.",
  ],
  365: [
    "one full year. 365 days outside in a row. 🌿",
    "day 365. a whole year of daily proof.",
    "a year of showing up outdoors, every single day.",
  ],
};

// Posting a day after a shield protected the streak.
const SHIELD = [
  "a shield saved the streak today. still going, day {n}. 🛡️🌿",
  "missed a day, shield covered it. day {n} and the streak lives.",
  "shield used, streak protected. back outside on day {n}.",
  "that's what shields are for. day {n} and still standing.",
  "close call, but the shield held. day {n}. 🌿",
];

// First proof after a streak ended.
const RESTART = [
  "streak reset. the outdoors didn't. back at day 1. 🌿",
  "starting over today. day 1 again, and that's fine.",
  "the streak ended. the habit didn't. day 1.",
  "back outside, back to day 1. here we go again.",
  "one day off the streak, not off the plan. day 1.",
];

export function getTierKey(streak) {
  if (streak >= 100) return "mythic";
  if (streak >= 50) return "legendary";
  if (streak >= 30) return "veteran";
  if (streak >= 14) return "elite";
  if (streak >= 7) return "strong";
  if (streak >= 3) return "momentum";
  return "beginner";
}

const KEY = "pog_recent_captions";
function readRecent() {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}
function remember(text) {
  try { localStorage.setItem(KEY, JSON.stringify([text, ...readRecent().filter(x => x !== text)].slice(0, 10))); } catch {}
}

const fill = (t, n) => t.replace(/\{n\}/g, String(n));

// mode: "normal" | "shield" | "restart"; tone: "mix" | "community" | "plain"
export function pickCaption(streak, exclude, { tone = "mix", mode = "normal" } = {}) {
  let pool;
  if (mode === "shield") pool = SHIELD;
  else if (mode === "restart" && streak <= 1) pool = RESTART;
  else if (MILESTONE[streak]) pool = MILESTONE[streak];
  else {
    const k = getTierKey(streak);
    pool = tone === "community" ? COMMUNITY[k] : tone === "plain" ? PLAIN[k] : [...COMMUNITY[k], ...PLAIN[k]];
  }
  const all = pool.map(t => fill(t, streak));
  const recent = typeof localStorage !== "undefined" ? readRecent() : [];
  let fresh = all.filter(c => c !== exclude && !recent.includes(c));
  if (!fresh.length) fresh = all.filter(c => c !== exclude);
  if (!fresh.length) fresh = all;
  const pick = fresh[Math.floor(Math.random() * fresh.length)];
  if (typeof localStorage !== "undefined") remember(pick);
  return pick;
}
