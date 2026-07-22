import { useRef, useEffect, useState, useCallback } from "react";
import { supabase } from "../utils/supabase";

// ── Premium+ Themes ──────────────────────────────────────────────────────────
const THEMES = {
  classic: {
    name:        "Classic",
    bgOverlay:   null, // uses default gradients
    accent:      null, // uses streak-based logic
    border:      null,
    bracket:     null,
    muted:       null,
  },
  golden_hour: {
    name:        "Golden Hour",
    bgOverlay:   "rgba(30,15,0,0.35)",
    accent:      "rgba(245,158,11,1.0)",
    border:      "rgba(245,158,11,0.55)",
    bracket:     "rgba(245,158,11,0.85)",
    muted:       "rgba(245,158,11,0.75)",
  },
  emerald_forest: {
    name:        "Emerald Forest",
    bgOverlay:   "rgba(0,20,8,0.35)",
    accent:      "rgba(16,185,129,1.0)",
    border:      "rgba(16,185,129,0.55)",
    bracket:     "rgba(16,185,129,0.85)",
    muted:       "rgba(16,185,129,0.75)",
  },
  midnight_meadow: {
    name:        "Midnight Meadow",
    bgOverlay:   "rgba(4,8,16,0.45)",
    accent:      "rgba(103,232,249,1.0)",
    border:      "rgba(103,232,249,0.45)",
    bracket:     "rgba(103,232,249,0.75)",
    muted:       "rgba(103,232,249,0.65)",
  },
  summit: {
    name:        "Summit",
    bgOverlay:   "rgba(10,12,18,0.38)",
    accent:      "rgba(203,213,225,1.0)",
    border:      "rgba(203,213,225,0.45)",
    bracket:     "rgba(203,213,225,0.75)",
    muted:       "rgba(203,213,225,0.65)",
  },
  aurora: {
    name:        "Aurora",
    bgOverlay:   "rgba(4,6,22,0.42)",
    accent:      "rgba(167,139,250,1.0)",
    border:      "rgba(167,139,250,0.50)",
    bracket:     "rgba(167,139,250,0.80)",
    muted:       "rgba(167,139,250,0.70)",
  },
  sunset_glow: {
    name:        "Sunset Glow",
    bgOverlay:   "rgba(26,8,0,0.38)",
    accent:      "rgba(249,115,22,1.0)",
    border:      "rgba(249,115,22,0.50)",
    bracket:     "rgba(249,115,22,0.80)",
    muted:       "rgba(249,115,22,0.70)",
  },
};

const CAPTION_POOLS = {
  beginner: [
    "just touched grass. strong start. 🌿",
    "day one. certified grass toucher.",
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
    "fresh air acquired. timestamp verified. streak: initiated.",
    "certified first step. the streak starts now.",
    "outside for the first time in the timeline. feels different.",
    "grass touched. wallet not checked. healthy.",
    "first log. many more to come.",
    "touched grass. did not die. will do again.",
    "the outdoors: visited. the streak: started.",
    "my phone stayed inside. i did not.",
    "went outside on purpose. documentation attached.",
    "first contact with grass. certified and sealed.",
    "grass detected. proof generated. streak unlocked.",
    "outside interaction complete. logging for the record.",
    "nature: acknowledged. streak: initialized.",
    "the only nft that requires fresh air.",
    "departure from indoors confirmed. timestamp attached.",
    "went out. got proof. came back.",
    "grass: touched. receipt: here.",
    "beginning of something real.",
    "started. the hardest part.",
    "unlocked: fresh air. equipped: accountability.",
    "issued. certified. logged. valid.",
    "the first step is always outside.",
    "grass interaction: confirmed. no excuses needed.",
    "entry logged. streak sequence: initiated.",
    "rare event detected: user touched grass.",
    "first proof. the chain begins here.",
    "character development: going outside.",
    "seed planted. streak started.",
    "outside status: verified. indoor streak: broken.",
    "no cope. just grass. just proof.",
    "the journey starts with one blade of grass.",
    "timestamp: now. location: outside. mood: certified.",
    "submitted. the ledger does not lie.",
    "grass touched. future secured.",
    "documented for the record. this one counts.",
    "outside achievement unlocked.",
    "first proof on the books. the rest is momentum.",
    "the hardest streak to start is the first one.",
    "screen turned off. shoes laced. grass found.",
    "proof generated. no excuses filed.",
    "first submission. already ahead of yesterday.",
    "certified: was outside. timeline: confirmed.",
    "the protocol activates. day one complete.",
    "left the group chat. found the outdoors.",
    "indoor era officially over.",
    "new habit detected. early signs promising.",
    "first log submitted. the streak machine starts.",
    "made it outside. made it back. documented both.",
    "the outdoors exist and i visited them.",
    "went outside before my phone battery died. progress.",
    "fresh start. fresh air. first proof.",
    "one down. the streak begins.",
    "nature: accessed. skill: verified.",
    "the first move is the most important.",
    "this is day one of something.",
    "took the first step. the grass confirmed it.",
    "logged. locked. the beginning is behind me now.",
    "outdoor event completed. receipt attached.",
    "proof of existence outside four walls.",
    "started before i talked myself out of it.",
    "the streak has a birthday now. today.",
    "entry one. the ledger is open.",
    "outside and back. timestamp matches.",
    "first certified grass touch. more incoming.",
    "the journey: begun. the grass: verified.",
    "initial outdoor contact: successful.",
    "submitted on purpose. the proof does not lie.",
    "outside: confirmed. streak: embryonic.",
    "proof attached. doubt detached.",
    "no streak survives without a first day. today was mine.",
  ],
  momentum: [
    "still going. streak getting real. 🌿",
    "the algorithm does not know where i am.",
    "grass touched again. this might be a habit.",
    "consistent. outside. undefeated.",
    "real-world xp farming session complete. streak: locked.",
    "the outdoor meta is holding. i am staying in.",
    "disconnected from wi-fi. connected to chlorophyll. again.",
    "dev update: shipped another walk. zero bugs.",
    "day after day. grass after grass. no signs of stopping.",
    "momentum is real. the outdoors keeps paying dividends.",
    "streak integrity: maintained. grass: touched. witnesses: none needed.",
    "another one. the commitment is showing.",
    "the timeline doesn't know where i go every day.",
    "a pattern is forming. it is green.",
    "i used to doomscroll. now i do this instead.",
    "building a habit one blade of grass at a time.",
    "on-chain activity: walking outside. status: profitable.",
    "no rest days in the grass-touching season.",
    "still outside. still logging. still winning.",
    "streak maintained. skill issue averted.",
    "consecutive days: increasing. excuses: decreasing.",
    "the outdoors has good retention.",
    "another submission. another day ahead of the crowd.",
    "touching grass is the only daily active yield i trust.",
    "my wallet is degen. my schedule is not.",
    "outside committed. streak growing. vibe immaculate.",
    "the streak is compounding.",
    "not stopping. not slowing. not skipping.",
    "routine unlocked. execution ongoing.",
    "daily proof. daily discipline. daily bag.",
    "the routine is real now.",
    "touched grass before most people opened their eyes.",
    "another day, another certificate.",
    "the habit is forming. the proof is here.",
    "consistency is a practice. i am practicing.",
    "streak still alive. enemies still inside.",
    "outside again. on purpose. documented.",
    "grass log submitted. streak defended.",
    "no one said it was easy. i do it anyway.",
    "outdoor streak ongoing. no signs of weakness.",
    "submitted again. the grind continues.",
    "small habit. big compound.",
    "building proof one outdoor session at a time.",
    "another entry. another lock.",
    "the momentum is mine now.",
    "submitted proof. streak secured. moving on.",
    "active. outside. on time. every time.",
    "streak defense: successful.",
    "habit stack: walk outside, take photo, prove it.",
    "the outdoors is my most reliable dapp.",
    "still showing up. still logging. still different.",
    "the streak has survived another day. so have i.",
    "early days but the pattern is clear.",
    "the habit is winning. the habit is me.",
    "streak still hot. intentions still pure.",
    "submitted. no overthinking. just outside.",
    "the morning was mine before it was anyone else's.",
    "every log builds the proof. every proof builds the habit.",
    "streak growing faster than my portfolio.",
    "consistency: the least glamorous flex. also the best.",
    "logged before most people got out of bed.",
    "habit forming in real time.",
    "outside every day. proof every time. no exceptions.",
    "back again. the grass expected me.",
    "momentum maintained. streak intact. no drama.",
    "daily routine certified by nature.",
    "the streak does not care about market conditions.",
    "submitted again. the chain grows stronger.",
    "showed up today. will show up tomorrow.",
    "the streak is young and already undefeated.",
    "proof stacking. habit locking. keep going.",
    "another session. another seal.",
    "the outdoors does not cancel.",
    "the habit is outpacing the excuses.",
    "committed to the bit. the bit is going outside.",
    "submitted while others deliberated.",
    "streak intact. morale: high. grass: verified.",
    "the outdoors is open. i am consistent. proof enclosed.",
    "low effort post. high discipline life.",
    "outdoor session logged. streak extended.",
    "the proof accumulates. so does the habit.",
    "ran the daily protocol again. results as expected.",
  ],
  strong: [
    "consistency looking dangerous. 🌿",
    "the grass knows my name now.",
    "this is no longer a coincidence.",
    "streak so strong it has its own lore.",
    "this started as a joke. it is not a joke anymore.",
    "certified long-term grass enjoyer. data-backed.",
    "i have touched more grass than most nfts.",
    "the streak is real. the grass is real. i am real.",
    "the outdoors have accepted me.",
    "daily grass interaction: active. cope: zero.",
    "i have more streak days than most projects have updates.",
    "building something real. outside. with my hands. sort of.",
    "this streak will outlast most alt coins.",
    "no signs of softness. no signs of stopping.",
    "the discipline is on-chain now. no going back.",
    "the streak is now a personality trait.",
    "outside is not a trip anymore. it is a practice.",
    "other people have goals. i have proof.",
    "my streak has better fundamentals than most launches.",
    "doing this long enough that it stopped feeling hard.",
    "streak confirmed. doubt: evaporating.",
    "daily execution. no announcements. just logs.",
    "the protocol runs. i run with it.",
    "not a tourist. a recurring participant.",
    "compounding days of outdoor exposure.",
    "building a track record that speaks for itself.",
    "the field is my office. i clocked in again.",
    "consistently certified. no days off.",
    "showing up beats showing off.",
    "another proof. another brick in the streak.",
    "entered, exited, documented. repeat.",
    "streak health: excellent.",
    "the market moves. i walk outside. both are true.",
    "dedicated to the outdoor grind.",
    "proof submitted. streak untouched. discipline intact.",
    "the grass is familiar territory now.",
    "this is what sustained effort looks like.",
    "strong streak. stronger mindset.",
    "every day outside is a win logged on chain.",
    "long-term holder of the outdoor habit.",
    "still here. still certified. still touching grass.",
    "track record: spotless.",
    "the streak speaks louder than any announcement.",
    "fundamentals: touching grass every single day.",
    "deep in the outdoor accumulation phase.",
    "outdoors: my most consistent investment.",
    "streak alive. discipline unbroken.",
    "the practice continues. no days skipped.",
    "more days outside than most have excuses.",
    "certified operator of the outdoor routine.",
    "the streak is talking. i just provide the proof.",
    "this is what a week of discipline looks like from the outside.",
    "week-strong and still going. this is the way.",
    "the streak has survived every reason not to.",
    "consecutive outdoor logs building toward something.",
    "week of proof complete. the streak does not flinch.",
    "i go outside so often the grass recognizes me.",
    "daily check-in: certified. daily doubts: dismissed.",
    "the grind is green. the streak is real.",
    "committed to the long game. one day at a time.",
    "proving consistency is a skill. this is the log.",
    "outdoor protocol: running clean.",
    "streak maintained through everything. no asterisks.",
    "another log in the book. the streak holds.",
    "week in, week strong. the outdoor habit lives.",
    "proof of daily outdoor participation. ongoing.",
    "the outside is starting to feel like a second home.",
    "not just showing up. showing up every day.",
    "seven days of proof. seven days of winning.",
    "week logged. discipline documented.",
    "the streak has no gaps. that's the whole point.",
    "every day outside. no excuses accepted.",
    "steady. consistent. verified.",
    "the record is clean. the habit is real.",
    "a week of this is just the beginning.",
    "certified: showed up every day. proof: attached.",
    "outdoor consistency unlocked. early access.",
    "this streak is built on boring, beautiful discipline.",
    "seven days in and the habit already feels permanent.",
    "not complicated. just outside. every day.",
    "week strong. week verified. week done.",
    "discipline delivered. certified for the record.",
  ],
  elite: [
    "this isn't a phase anymore. it's identity. 🌿",
    "i am the outdoor meta.",
    "streak unlocked: outdoor main character.",
    "the leaderboard feared this day.",
    "some people have lore. i have a streak.",
    "i do not go outside anymore. i simply return.",
    "fully on-chain. fully outside. no contradictions.",
    "elite grass toucher. verified. unstoppable.",
    "the streak has a market cap now.",
    "at this point the grass is just an extension of my wallet.",
    "the outdoor season never ends for me.",
    "not a visitor anymore. a permanent resident of outside.",
    "streak so long it's basically vested.",
    "i have documented more grass than most explorers.",
    "the data speaks. the streak screams.",
    "the others are still inside.",
    "certified outdoor original. no derivative.",
    "the protocol is simple: go outside. do it every day. forever.",
    "i didn't build a streak. i built a ritual.",
    "proof of consistency. certified on every level.",
    "what started as discipline is now architecture.",
    "the leaderboard is a mirror. i like what i see.",
    "running a streak most projects can't sustain.",
    "deeper in the game than most will ever go.",
    "the soil remembers me.",
    "i am not competing. i am documenting.",
    "streak so seasoned it has its own yield.",
    "the outdoors is not a habit. it is infrastructure.",
    "this is not dedication. this is design.",
    "the streak compounds. the legend grows.",
    "proof that consistency is the rarest trait.",
    "built different. logged different.",
    "documented. verified. legendary.",
    "elite status. earned outside. no shortcuts.",
    "the streak is the résumé.",
    "i have outlasted trends, fads, and most projects.",
    "the outdoor practice has become the standard.",
    "they asked what i do every day. i showed them.",
    "streak longevity: exceeds expectations.",
    "proof of life. proof of grass. proof of character.",
    "this is peak outdoor accumulation.",
    "rare. consistent. verified.",
    "i do not announce. i prove.",
    "the streak is not impressive to me anymore. it is normal.",
    "level of commitment: immovable.",
    "every submission adds to the legend.",
    "grass touched. legend continued.",
    "the leaderboard is my trophy case.",
    "they study consistency. i practice it.",
    "outdoor legacy: growing daily.",
    "two weeks in and the streak shows no mercy.",
    "two weeks of daily proof. the habit is officially structural.",
    "the streak is old enough to have a reputation now.",
    "two solid weeks. the discipline is no longer a question.",
    "at this level the only enemy is complacency.",
    "the streak is not something i do. it is something i am.",
    "double digits and i barely noticed.",
    "two weeks documented. zero doubts remaining.",
    "the proof is starting to feel like a portfolio.",
    "the outdoor routine survived two weeks. it is not stopping.",
    "14+ days in. the streak has its own gravitational pull.",
    "proof of daily outdoor participation. certified elite.",
    "two-week streak and the grass still shows up for me.",
    "the commitment is structural now. it will not bend.",
    "showing up every single day for two weeks. that is the bar.",
    "elite tier reached. the streak refuses to end.",
    "half a month of daily proof. still going.",
    "at this point i am genuinely curious how far this goes.",
    "the streak is more consistent than most things in my life.",
    "certified elite. logged every day. no exceptions.",
    "the habit has outlasted every reason to stop.",
    "double-digit streak. the outdoor identity is confirmed.",
    "elite consistency documented. the numbers prove it.",
    "every day for two weeks. this is what it looks like.",
    "the streak is growing into something permanent.",
    "two weeks of accountability. two weeks of proof.",
    "elite class certified. the outdoors has been consistent.",
    "the streak does not miss. neither do i.",
    "14 days in. no signs of weakness.",
    "this streak has now outlasted most detox challenges.",
    "elite grass toucher status: confirmed and compounding.",
    "proof submitted. streak health: elite.",
  ],
  veteran: [
    "thirty days of proof. the streak is a structure now. 🌿",
    "a full month outside. no asterisks.",
    "the streak has survived a calendar month. it is not stopping.",
    "thirty days of daily discipline. the outdoors know me by now.",
    "veteran status. earned one day at a time.",
    "a month of proof on the books. this is the long game.",
    "one month in and the streak still feels hungry.",
    "the calendar turned. the streak did not.",
    "thirty days confirmed. the habit is now load-bearing.",
    "monthly outdoor certification. stamp of discipline.",
    "the streak has a body of work now.",
    "documented every day for a month. this is what commitment looks like.",
    "the proof does not take days off. neither do i.",
    "veteran of the outdoor grind. certified monthly.",
    "a month of this and the grass feels like home.",
    "thirty days logged. the streak is quietly legendary.",
    "one month verified. outdoor consistency: proven.",
    "thirty consecutive logs. the record is immaculate.",
    "the streak is approaching its first major milestone. it is not slowing down.",
    "i did not miss a single day. the chain is unbroken.",
    "a whole month of daily proof. rare energy.",
    "month one complete. the streak has only just begun.",
    "thirty days of outdoor proof. zero gaps. zero excuses.",
    "this streak has more days than most people have streaks.",
    "veteran tier reached. the outdoors and i are on familiar terms.",
    "one month. every day. no misses.",
    "thirty proofs submitted. thirty days of showing up.",
    "certified: thirty days of daily grass interaction.",
    "the streak is old enough to have earned some respect.",
    "month logged. proof stacked. habit permanent.",
    "the discipline held for a full month. this is a signal.",
    "thirty days in and the streak still has something to prove.",
    "a month of this is not a phase. it is a practice.",
    "veteran grass toucher. the proof speaks for itself.",
    "monthly streak verified. the numbers do not lie.",
    "thirty-day outdoor log: complete. the chain continues.",
    "at this point i trust the streak more than the market.",
    "a month of proof. a month of character.",
    "thirty days confirmed. the routine is architecture now.",
    "the streak is a month old and still has not blinked.",
    "veteran certification earned one grass-touch at a time.",
    "monthly proof log: certified. the streak persists.",
    "thirty down. no ceiling in sight.",
    "the outdoor routine has survived an entire month.",
    "month one sealed. the streak does not negotiate.",
    "thirty days of daily log. this is what the long game looks like.",
    "the proof stacks. the habit compounds. the month is done.",
    "thirty outdoor sessions logged. the streak is healthy.",
    "certified for a full month. the discipline speaks.",
    "one month of grass. one month of proof. one month of character.",
  ],
  legendary: [
    "fifty days outside and still counting. 🌿",
    "fifty-day streak. this is not a coincidence. this is a calling.",
    "the leaderboard takes me seriously now.",
    "fifty consecutive proofs. the chain is untouched.",
    "half a century of daily outdoor proof. legendary tier confirmed.",
    "fifty days certified. i did not come this far to stop.",
    "the streak is old enough to have its own reputation.",
    "fifty logs submitted. zero missed. the record is perfect.",
    "at fifty days, the streak starts speaking for itself.",
    "legendary status is not claimed. it is logged. every day.",
    "the outdoor commitment has outlasted most bull runs.",
    "fifty days in. the grass still shows up. so do i.",
    "the streak has earned a title now.",
    "fifty days of outdoor proof. what else is there to say.",
    "the habit is now one of the most consistent things in my life.",
    "fifty straight days of touching grass. the math is undeniable.",
    "i have not missed a day in fifty. the chain is sacred now.",
    "certified legendary. the proof archive speaks volumes.",
    "the streak has survived everything. fifty days confirms it.",
    "fifty days is not a streak. it is a statement.",
    "the outdoor protocol has been running for fifty consecutive cycles.",
    "at this point the grass is not optional. it is infrastructure.",
    "legendary tier. the streak earned every decimal.",
    "fifty proofs stacked. the tower does not wobble.",
    "fifty days is where most people stop. i am just getting started.",
    "the streak does not break. not at ten. not at fifty.",
    "fifty-day outdoor certification. zero gaps.",
    "half a hundred days outside. the commitment is structural.",
    "the streak has momentum that cannot be reversed.",
    "fifty consecutive outdoor logs. this is the work.",
    "the proof archive is fifty deep and growing.",
    "legendary consistency. verified in the field.",
    "fifty days. no announcements. just proof.",
    "the streak is fifty days deep and still has gas.",
    "i have touched grass more times than i have checked my portfolio.",
    "fifty certified. the streak is now a permanent fixture.",
    "this level of consistency puts me in rare company.",
    "fifty outdoor proof submissions. the record stands.",
    "the streak is legendary because it was never going to stop.",
    "certified fifty: the streak that would not quit.",
    "the outdoor grind hits fifty and does not slow down.",
    "fifty proofs. fifty mornings. fifty times i chose to show up.",
    "the chain is fifty links long and none of them are weak.",
    "legendary tier is not a destination. it is a habit.",
    "fifty consecutive days outdoors. this is what conviction looks like.",
    "the streak is old enough now to carry weight in a room.",
    "fifty days confirmed. the outdoor identity is unshakeable.",
    "logged fifty. the proof is no longer a log. it is a legacy.",
    "at fifty days, the streak becomes self-sustaining.",
    "fifty consecutive certified outdoor logs. this is the way.",
  ],
  mythic: [
    "a hundred days of daily proof. the streak is mythology. 🌿",
    "one hundred certified. no asterisks. no days off.",
    "the leaderboard is a trophy case and i have a reserved spot.",
    "one hundred consecutive outdoor logs. the chain is untouched.",
    "triple digits. the streak does not acknowledge limits.",
    "a hundred days outside. this is no longer a habit. it is identity.",
    "one hundred proofs submitted. the record is flawless.",
    "mythic status reached. the outdoors and i have an agreement.",
    "a hundred day streak is not something you build. it is something you become.",
    "the streak has a three-digit story now. every log matters.",
    "one hundred days certified. i am not stopping here.",
    "the century mark exists and i have passed it.",
    "the streak has outlasted narratives, seasons, and bull cycles.",
    "one hundred outdoor proofs. the protocol has not failed once.",
    "a hundred days of touching grass. rare. certified. mine.",
    "the streak is three digits and still feels like day one energy.",
    "one hundred logs submitted. the chain does not break.",
    "mythic grass toucher. the proof archive is a document of character.",
    "a century of daily outdoor certification. the discipline is real.",
    "one hundred days. every single one logged. this is the record.",
    "the streak survived everything for a hundred days. it does not lose.",
    "triple digit streak confirmed. the outdoor routine is permanent.",
    "a hundred certified proofs. the grass has seen me every single day.",
    "the chain is a hundred links long. not one is weak.",
    "one hundred consecutive outdoor logs. this is what conviction builds.",
    "mythic tier. the streak earned it one day at a time.",
    "a hundred days in and the streak feels invincible.",
    "the hundred-day mark is just another checkpoint on a longer journey.",
    "one hundred outdoor proofs submitted. the record is perfect.",
    "century certified. the streak machine does not stop.",
    "the proof is a hundred entries deep and still growing.",
    "the streak is older than most things people commit to.",
    "a hundred days of unbroken outdoor discipline.",
    "triple digits. the leaderboard knows my name.",
    "the protocol has run for a hundred days without interruption.",
    "one hundred. the number is large. the habit is larger.",
    "a hundred proofs in. this is what long-term looks like.",
    "mythic status achieved through daily execution. nothing else.",
    "one hundred logs deep. the streak does not recognize ceilings.",
    "certified for a hundred days. the chain is flawless.",
    "a hundred certified outdoor sessions. the streak is now legacy.",
    "triple digit streak. the commitment is a fact of my life now.",
    "one hundred days of proof. this is the long game, won.",
    "the hundred-day streak is the rarest thing i own.",
    "a hundred days certified. i did not build the streak. i became it.",
    "mythic grass toucher status confirmed. the archive is massive.",
    "one hundred outdoor logs. every single day counted.",
    "the streak is three digits and shows no signs of blinking.",
    "certified for a century. the outdoor protocol never failed.",
    "a hundred consecutive outdoor proofs. the chain is mythology now.",
  ],
};

function getPool(streak) {
  if (streak >= 100) return CAPTION_POOLS.mythic;
  if (streak >= 50)  return CAPTION_POOLS.legendary;
  if (streak >= 30)  return CAPTION_POOLS.veteran;
  if (streak >= 14)  return CAPTION_POOLS.elite;
  if (streak >= 7)   return CAPTION_POOLS.strong;
  if (streak >= 3)   return CAPTION_POOLS.momentum;
  return CAPTION_POOLS.beginner;
}

function pickCaption(streak, exclude) {
  const pool = getPool(streak).filter((c) => c !== exclude);
  return pool[Math.floor(Math.random() * pool.length)];
}

function getStreakTitle(streak) {
  if (streak >= 30) return "👑 grass god";
  if (streak >= 14) return "🔥 locked in";
  if (streak >= 7)  return "🌳 rooted";
  if (streak >= 3)  return "🌿 sprout";
  return "🌱 seed";
}

function isValidXStatusUrl(raw) {
  try {
    const url = new URL(raw.trim());
    const validHosts = ["x.com", "www.x.com", "twitter.com", "www.twitter.com"];
    if (!validHosts.includes(url.hostname.toLowerCase())) return false;
    return /\/status\/\d+/i.test(url.pathname);
  } catch {
    return false;
  }
}

function getTopPercent(streak) {
  if (streak >= 30) return 1;
  if (streak >= 14) return 5;
  if (streak >= 7)  return 10;
  return null;
}

function getMilestoneMsg(streak) {
  if (streak === 3)  return "momentum building";
  if (streak === 5)  return "locked in";
  if (streak === 7)  return "strong streak";
  if (streak === 14) return "elite";
  return null;
}

const REFERRAL_BADGES = [
  { count:1,   slug:"community-builder",     name:"Community Builder",    emoji:"🤝" },
  { count:5,   slug:"grass-recruiter",       name:"Grass Recruiter",      emoji:"🌱" },
  { count:10,  slug:"community-grower",      name:"Community Grower",     emoji:"🌿" },
  { count:25,  slug:"movement-builder",      name:"Movement Builder",     emoji:"🌳" },
  { count:50,  slug:"founding-ambassador",   name:"Founding Ambassador",  emoji:"🏛" },
  { count:100, slug:"touchgrass-ambassador", name:"Touch Grass Ambassador",emoji:"👑"},
];

async function checkAndAwardReferralBadge(referrerUsername) {
  if (!referrerUsername) return;
  try {
    const { data: prof } = await supabase
      .from("Profiles").select("referral_count_successful,referral_badge")
      .eq("username", referrerUsername).maybeSingle();
    if (!prof) return;
    const count = (prof.referral_count_successful || 0) + 1;
    const earned = [...REFERRAL_BADGES].reverse().find(b => count >= b.count);
    if (!earned || prof.referral_badge === earned.slug) return;
    await supabase.from("Profiles").update({ referral_badge: earned.slug })
      .eq("username", referrerUsername);
  } catch(e) { console.warn("[referral badge]", e?.message); }
}

// ─── Share card rendering pipeline ───────────────────────────────────────────

export default function ResultCard({ imageSrc, proofFile = null, username, initialStreak = 1, onStreakUpdate, hasPremiumProofs = false }) {
  const canvasRef = useRef(null);
  const [downloadUrl, setDownloadUrl] = useState(null);
  const sharableFileRef = useRef(null);
  const [caption, setCaption] = useState(() => pickCaption(initialStreak, null));
  const [copied, setCopied] = useState(false);
  const [currentStreak, setCurrentStreak] = useState(initialStreak);

  // ── NEW: 4-format card state ──────────────────────────────────────────────
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [shareStatus, setShareStatus] = useState({});

  useEffect(() => {
    setCurrentStreak(initialStreak);
    setCaption((prev) => pickCaption(initialStreak, prev));
  }, [initialStreak]);

  const [tweetUrl, setTweetUrl] = useState("");
  const [submitStatus, setSubmitStatus] = useState(null);
  // ── Style picker modal ────────────────────────────────────────────────────
  const [showStylePicker, setShowStylePicker] = useState(false);
  const [shareStyle, setShareStyle]           = useState(() => {
    if (typeof localStorage !== "undefined") {
      return localStorage.getItem("pog_preferred_share_style") || "outdoor_photo";
    }
    return "outdoor_photo";
  });
  const [submitError, setSubmitError] = useState("");
  const [luckyTouch, setLuckyTouch] = useState(null);
  const [selectedTheme, setSelectedTheme] = useState("classic");
  const [inAppBrowserMode, setInAppBrowserMode] = useState(false);
  const [clipboardDetected, setClipboardDetected] = useState(false);
  const [clipboardFeedback, setClipboardFeedback] = useState(null);

  // Instagram share state
  const [igCopied, setIgCopied] = useState(false);
  const [igDesktop, setIgDesktop] = useState(false);

  const [locationMode,   setLocationMode]   = useState(null);
  const [locationCity,   setLocationCity]   = useState("");
  const [locationRegion, setLocationRegion] = useState("");
  const [locationCountry,setLocationCountry]= useState("");
  const [gpsLat,         setGpsLat]         = useState(null);
  const [gpsLng,         setGpsLng]         = useState(null);
  const [gpsRequesting,  setGpsRequesting]  = useState(false);
  const [gpsError,       setGpsError]       = useState("");

  const requestGpsLocation = useCallback(() => {
    if (!navigator.geolocation) { setGpsError("Location not supported on this device."); return; }
    setGpsRequesting(true); setGpsError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsLat(Math.round(pos.coords.latitude  * 100) / 100);
        setGpsLng(Math.round(pos.coords.longitude * 100) / 100);
        setLocationMode("gps"); setGpsRequesting(false);
      },
      (err) => {
        setGpsError(err.code === 1 ? "Location permission denied." : "Couldn't get your location.");
        setGpsRequesting(false);
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
    );
  }, []);

  useEffect(() => {
    async function tryClipboard() {
      try {
        const text = await navigator.clipboard.readText();
        if (isValidXStatusUrl(text)) { setTweetUrl(text.trim()); setClipboardDetected(true); setClipboardFeedback("detected"); }
      } catch {}
    }
    tryClipboard();
  }, []);

  const [lockCountdown, setLockCountdown] = useState("");
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    function calc() {
      const diff = new Date().setUTCHours(24,0,0,0) - Date.now();
      const h = Math.floor(diff / 3600000), m = Math.floor((diff % 3600000) / 60000);
      setLockCountdown(h > 0 ? `${h}h ${m}m` : `${m}m`);
    }
    calc(); const id = setInterval(calc, 30000); return () => clearInterval(id);
  }, []);

  const handlePasteFromClipboard = useCallback(async () => {
    try {
      const text = (await navigator.clipboard.readText()).trim();
      if (isValidXStatusUrl(text)) { setTweetUrl(text); setClipboardDetected(true); setSubmitStatus(null); setSubmitError(""); setClipboardFeedback("detected"); }
      else setClipboardFeedback("invalid");
    } catch { setClipboardFeedback("invalid"); }
    setTimeout(() => setClipboardFeedback(null), 2000);
  }, []);

  const handleNewCaption = useCallback(() => {
    setCaption((prev) => pickCaption(currentStreak, prev));
    setCopied(false);
  }, [currentStreak]);

  const HANDLE = "@XTouchGrass";
  const TAGS = "$TOUCHGRASS #TouchGrass #ProofOfGrass";
  const referralLink = username
    ? `https://proofofgrass.app/?ref=${encodeURIComponent(username.toLowerCase().replace(/@/g,"").trim())}`
    : null;
  const buildTags = () => `${TAGS}\n${HANDLE} · proofofgrass.app`;

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(buildShareText()).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    });
  }, [caption, currentStreak]);

  const [shared, setShared] = useState(false);
  const [shareHint, setShareHint] = useState(false);

  const buildShareText = useCallback(() => {
    const refLine = referralLink
      ? `\nJoin me:\n${referralLink}`
      : "\nproofofgrass.app";
    return `${caption}\n\nDay ${currentStreak} · proof of grass 🌿\n\n${TAGS}\n${HANDLE}${refLine}`;
  }, [caption, currentStreak, referralLink]);

  const lockInStreak = useCallback(async () => {
    if (!username) return;
    // Don't re-run if already succeeded
    if (submitStatus === "success") return;
    setSubmitStatus("loading");
    setSubmitError("");

    // Retry wrapper — network hiccups during share flow are common
    const rpcWithRetry = async (retries = 2) => {
      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          const locationPayload = locationMode === "gps"
            ? { p_location_lat_rounded:gpsLat, p_location_lng_rounded:gpsLng, p_location_label:"Nearby Region", p_location_source:"gps" }
            : locationMode === "manual" && locationCity.trim()
            ? { p_location_city:locationCity.trim()||null, p_location_region:locationRegion.trim()||null,
                p_location_country:locationCountry.trim()||null,
                p_location_label:[locationCity.trim(),locationRegion.trim()].filter(Boolean).join(", ")||null,
                p_location_source:"manual" }
            : { p_location_source:"none" };
          const res = await supabase.rpc("lock_in_streak", {
            p_username: username?.toLowerCase().trim(), p_tweet_url: null, p_verification: "self_attested",
            ...locationPayload,
          });
          return res;
        } catch(e) {
          if (attempt === retries) throw e;
          await new Promise(r => setTimeout(r, 1200 * (attempt + 1)));
        }
      }
    };

    try {
      const { data: result, error: rpcError } = await rpcWithRetry();

      if (rpcError) {
        console.error("lock_in_streak RPC error", rpcError);
        setSubmitError("Streak log failed — tap again.");
        setSubmitStatus("error");
        return;
      }

      // already_submitted is a SUCCESS state — user posted, streak is safe
      if (result?.status === "already_submitted") {
        setSubmitStatus("success");
        return;
      }

      const newStreak = result?.current_streak ?? currentStreak;
      setCurrentStreak(newStreak);
      onStreakUpdate?.(newStreak);
      setSubmitStatus("success");
      if (result?.lucky_touch?.triggered) setLuckyTouch(result.lucky_touch);

      try {
        const referrer = typeof localStorage !== "undefined" ? localStorage.getItem("pog_referrer") : null;
        if (referrer && referrer !== username) {
          const { data: existing } = await supabase.from("Referrals").select("id").eq("referred_username", username).maybeSingle();
          if (!existing) {
            const { data: refExists } = await supabase.from("Streaks").select("username").eq("username", referrer).maybeSingle();
            if (refExists) {
              await supabase.from("Referrals").insert([{ referrer_username:referrer, referred_username:username, status:"pending", source_url:typeof window!=="undefined"?window.location.href:null }]);
              const { data: rp } = await supabase.from("Profiles").select("referral_count_pending").eq("username", referrer).maybeSingle();
              await supabase.from("Profiles").update({ referral_count_pending:(rp?.referral_count_pending??0)+1 }).eq("username", referrer);
            }
          }
        }
      } catch(refErr) { console.warn("[referral] insert non-fatal:", refErr?.message); }

      try {
        if (newStreak >= 10) {
          const { data: pendingRef } = await supabase.from("Referrals").select("id,referrer_username").eq("referred_username", username).eq("status","pending").maybeSingle();
          if (pendingRef) {
            const { count: proofCount } = await supabase.from("Submissions").select("id",{count:"exact",head:true}).eq("username",username).in("status",["pending","approved"]);
            if (proofCount >= 7) {
              await supabase.from("Referrals").update({ status:"converted", converted_at:new Date().toISOString(), referred_reached_day_10:true }).eq("id", pendingRef.id);
              const { data: rProf } = await supabase.from("Profiles").select("referral_count_successful,referral_count_pending").eq("username", pendingRef.referrer_username).maybeSingle();
              await supabase.from("Profiles").update({ referral_count_successful:(rProf?.referral_count_successful??0)+1, referral_count_pending:Math.max(0,(rProf?.referral_count_pending??1)-1) }).eq("username", pendingRef.referrer_username);
              await checkAndAwardReferralBadge(pendingRef.referrer_username);
              if (typeof localStorage !== "undefined") localStorage.removeItem("pog_referrer");
            }
          }
        }
      } catch(convErr) { console.warn("[referral] conversion non-fatal:", convErr?.message); }

      try {
        const todayUTC = new Date().toISOString().slice(0,10);
        const { data: activeChals } = await supabase.from("Challenges").select("id").or(`challenger.eq.${username},challenged.eq.${username}`).eq("status","active");
        if (activeChals?.length) {
          for (const ch of activeChals) {
            const { data: prog } = await supabase.from("ChallengeProgress").select("id,days_complete,last_checked").eq("challenge_id",ch.id).eq("username",username).maybeSingle();
            if (prog && prog.last_checked !== todayUTC) {
              await supabase.from("ChallengeProgress").update({ days_complete:(prog.days_complete??0)+1, last_checked:todayUTC }).eq("id",prog.id);
              await supabase.from("ChallengeEvents").insert([{ challenge_id:ch.id, username, event_type:"day_logged" }]);
            }
          }
        }
      } catch(chalErr) { console.warn("challenge progress update failed", chalErr); }

    } catch(err) { console.error("lock_in_streak exception", err); setSubmitError("Something went wrong — tap again."); setSubmitStatus("error"); }
  }, [username, currentStreak, onStreakUpdate,
      locationMode, gpsLat, gpsLng, locationCity, locationRegion, locationCountry]);

  const isInAppBrowser = typeof navigator !== "undefined" && (
    /Twitter/i.test(navigator.userAgent) || /Instagram/i.test(navigator.userAgent) ||
    /FBAN|FBAV/i.test(navigator.userAgent) || /MicroMessenger/i.test(navigator.userAgent)
  );

  // ── Build File object for a given style ──────────────────────────────────
  const buildShareFile = useCallback(async (style) => {
    if (style === "outdoor_photo") {
      // Use the original uploaded file directly
      if (proofFile instanceof File) {
        return new File([proofFile], "proof-of-grass-outdoor.png", { type: proofFile.type || "image/png" });
      }
      // Fallback: blob from imageSrc object URL
      if (imageSrc && imageSrc.startsWith("blob:")) {
        try {
          const res = await fetch(imageSrc);
          const blob = await res.blob();
          return new File([blob], "proof-of-grass-outdoor.png", { type: "image/png" });
        } catch { return null; }
      }
      return null;
    }
    // result_card — use canvas data URL
    if (!downloadUrl) return null;
    let file = sharableFileRef.current;
    if (!file && downloadUrl.startsWith("data:")) {
      try {
        const res = await fetch(downloadUrl);
        const blob = await res.blob();
        file = new File([blob], "proof-of-grass-result-card.png", { type: "image/png" });
        sharableFileRef.current = file;
      } catch { file = null; }
    }
    return file;
  }, [proofFile, imageSrc, downloadUrl]);

  // ── Persist share style choice ─────────────────────────────────────────────
  const selectShareStyle = (style) => {
    setShareStyle(style);
    try { localStorage.setItem("pog_preferred_share_style", style); } catch {}
  };

  // ── handleShareAndSubmit — opens style picker, which executes share ─────────
  const handleShareAndSubmit = useCallback(() => {
    if (isInAppBrowser) { setInAppBrowserMode(true); lockInStreak(); return; }
    setShowStylePicker(true);
  }, [isInAppBrowser, lockInStreak]);

  const handleShareAndPost = handleShareAndSubmit;

  const handleSubmit = useCallback(async () => {
    if (!username) { setSubmitError("No username found. Please refresh and try again."); setSubmitStatus("error"); return; }
    if (tweetUrl.trim() && !isValidXStatusUrl(tweetUrl)) { setSubmitError("That doesn't look like a valid X post link. You can leave it blank for now."); setSubmitStatus("error"); return; }
    setSubmitStatus("loading"); setSubmitError("");
    const { data: result, error: rpcError } = await supabase.rpc("lock_in_streak", { p_username:username, p_tweet_url:tweetUrl.trim()||null, p_verification:"self_attested" });
    if (rpcError) { console.error("lock_in_streak RPC failed", rpcError); setSubmitError("Something went wrong. Try again."); setSubmitStatus("error"); return; }
    // already_submitted = streak already safe today, treat as success
    if (result?.status === "already_submitted") { setSubmitStatus("success"); return; }
    if (result?.status !== "success") { setSubmitError("Unexpected response. Try again."); setSubmitStatus("error"); return; }
    const newStreak = result.current_streak ?? currentStreak;
    setCurrentStreak(newStreak); onStreakUpdate?.(newStreak); setSubmitStatus("success"); setTweetUrl("");
    if (result?.lucky_touch?.triggered) setLuckyTouch(result.lucky_touch);
  }, [username, tweetUrl, currentStreak, onStreakUpdate]);

  const shareToInstagram = useCallback(async () => {
    const dataUrl = downloadUrl;
    if (!dataUrl) return;
    const igCaption = buildShareText();
    const isMob = typeof navigator !== "undefined" && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    try { await navigator.clipboard.writeText(igCaption); setIgCopied(true); setTimeout(() => setIgCopied(false), 4000); } catch {}
    if (isMob && typeof navigator.share === "function" && typeof navigator.canShare === "function") {
      let file = sharableFileRef.current;
      if (!file && downloadUrl.startsWith("data:")) {
        try {
          const res = await fetch(downloadUrl);
          const blob = await res.blob();
          file = new File([blob], "proof-of-grass.png", { type: "image/png" });
          sharableFileRef.current = file;
        } catch(e) { file = null; }
      }
      if (file && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file] });
          return;
        } catch(e) {
          if (e?.name === "AbortError") return;
        }
      }
      const link = document.createElement("a");
      link.download = "proof-of-grass.png"; link.href = downloadUrl; link.click();
    } else {
      const link = document.createElement("a");
      link.download = "proof-of-grass.png"; link.href = downloadUrl; link.click();
      setIgDesktop(true); setTimeout(() => setIgDesktop(false), 6000);
    }
  }, [downloadUrl, caption, currentStreak]);

  // ── NEW: platform share for drawer — no streak lock ───────────────────────
  const handlePlatformShare = useCallback(async (platform) => {
    setShareStatus(s => ({ ...s, [platform]:"sharing" }));
    const text = buildShareText();
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent ?? "");
    const formatMap = {
      "ig-story": { dataUrl:downloadUrl,  filename:"proof-story.png"  },
      "ig-feed":  { dataUrl:downloadUrl,   filename:"proof-feed.png"   },
      "telegram": { dataUrl:downloadUrl, filename:"proof-square.png" },
      "discord":  { dataUrl:downloadUrl, filename:"proof-square.png" },
    };
    const { dataUrl, filename } = formatMap[platform] ?? {};
    if (!dataUrl) { setShareStatus(s => ({ ...s, [platform]:null })); return; }
    try { await navigator.clipboard.writeText(text); } catch {}
    if (isMobile && typeof navigator.share === "function" && typeof navigator.canShare === "function") {
      try {
        let file = sharableFileRef.current;
        if (!file && dataUrl.startsWith("data:")) {
          const res = await fetch(dataUrl);
          const blob = await res.blob();
          file = new File([blob], filename, { type:"image/png" });
        }
        if (file && navigator.canShare({ files:[file] })) {
          await navigator.share({ files:[file] });
          if (platform.startsWith("ig")) { setIgCopied(true); setTimeout(() => setIgCopied(false), 4000); }
        } else { const a=document.createElement("a"); a.href=dataUrl; a.download=filename; a.click(); }
      } catch(e) { if (e?.name !== "AbortError") { const a=document.createElement("a"); a.href=dataUrl; a.download=filename; a.click(); } }
    } else {
      const a=document.createElement("a"); a.href=dataUrl; a.download=filename; a.click();
      if (platform.startsWith("ig")) { setIgDesktop(true); setTimeout(() => setIgDesktop(false), 6000); }
    }
    setShareStatus(s => ({ ...s, [platform]:"done" }));
    setTimeout(() => setShareStatus(s => ({ ...s, [platform]:null })), 3000);
  }, [downloadUrl, buildShareText]);

  // ── NEW: download all 4 ───────────────────────────────────────────────────
  const handleDownloadAll = useCallback(() => {
    if (!downloadUrl) return;
    [["landscape","proof-landscape.png"],["story","proof-story.png"],["feed","proof-feed.png"],["square","proof-square.png"]].forEach(([key,name]) => {
      if (!downloadUrl) return; const a=document.createElement("a"); a.href=downloadUrl; a.download=name; a.click();
    });
  }, [downloadUrl]);

  const [dateStr, setDateStr] = useState("");
  useEffect(() => {
    setDateStr(new Date().toLocaleDateString("en-US", { year:"numeric", month:"short", day:"2-digit" }).toUpperCase());
  }, []);

  // ── Original canvas effect — unchanged from doc 16 ────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageSrc) return;
    const ctx = canvas.getContext("2d");
    const W = 1600, H = 900;
    canvas.width = W; canvas.height = H;

    const img = new Image();
    img.onerror = () => { console.error("[canvas] failed to load imageSrc:", imageSrc); };
    img.onload = () => { try {
      const scale = Math.max(W / img.width, H / img.height);
      const dw = img.width * scale, dh = img.height * scale;
      const overflow = dw - W;
      const dx = overflow > 0 ? -overflow * 0.65 : (W - dw) / 2;
      const dy = (H - dh) / 2;
      ctx.drawImage(img, dx, dy, dw, dh);

      // ── Theme ────────────────────────────────────────────────────────────
      const theme         = THEMES[selectedTheme] || THEMES.classic;
      const defaultAccent = currentStreak >= 50 ? "rgba(212,175,55,1.0)"  : "rgba(147,208,120,1.0)";
      const defaultMuted  = currentStreak >= 50 ? "rgba(212,175,55,0.75)" : "rgba(255,255,255,0.62)";
      const accentText    = theme.accent || defaultAccent;
      const mutedText     = theme.muted  || defaultMuted;

      // ── Vignette — edge darkening only, center stays clear ─────────────
      // Bottom band — text legibility
      const vBot = ctx.createLinearGradient(0, H*0.62, 0, H);
      vBot.addColorStop(0,"rgba(0,0,0,0)"); vBot.addColorStop(1,"rgba(0,0,0,0.72)");
      ctx.fillStyle=vBot; ctx.fillRect(0, H*0.62, W, H*0.38);
      // Top band — brand text legibility
      const vTop = ctx.createLinearGradient(0, 0, 0, H*0.22);
      vTop.addColorStop(0,"rgba(0,0,0,0.52)"); vTop.addColorStop(1,"rgba(0,0,0,0)");
      ctx.fillStyle=vTop; ctx.fillRect(0, 0, W, H*0.22);
      // Left + right — very subtle
      const vL = ctx.createLinearGradient(0,0,W*0.08,0);
      vL.addColorStop(0,"rgba(0,0,0,0.28)"); vL.addColorStop(1,"rgba(0,0,0,0)");
      ctx.fillStyle=vL; ctx.fillRect(0,0,W*0.08,H);
      const vR = ctx.createLinearGradient(W*0.92,0,W,0);
      vR.addColorStop(0,"rgba(0,0,0,0)"); vR.addColorStop(1,"rgba(0,0,0,0.28)");
      ctx.fillStyle=vR; ctx.fillRect(W*0.92,0,W*0.08,H);

      // ── Theme tint — gradient not flat, so photo still breathes ─────────
      if (theme.bgOverlay) {
        const tintG = ctx.createLinearGradient(0, 0, 0, H);
        tintG.addColorStop(0, theme.bgOverlay);
        tintG.addColorStop(0.5, theme.bgOverlay.replace(/[\d.]+\)$/, "0.12)"));
        tintG.addColorStop(1, theme.bgOverlay);
        ctx.fillStyle = tintG; ctx.fillRect(0,0,W,H);
      }

      // ── Film grain (subtle noise texture) ───────────────────────────────
      const grainCanvas = document.createElement("canvas");
      grainCanvas.width = 200; grainCanvas.height = 200;
      const gc = grainCanvas.getContext("2d");
      const gd = gc.createImageData(200, 200);
      for (let i = 0; i < gd.data.length; i += 4) {
        const v = Math.random() * 255;
        gd.data[i]=gd.data[i+1]=gd.data[i+2]=v; gd.data[i+3]=7;
      }
      gc.putImageData(gd, 0, 0);
      const grainPattern = ctx.createPattern(grainCanvas, "repeat");
      ctx.fillStyle = grainPattern; ctx.fillRect(0,0,W,H);

      // ── Border — outer rule + inner glow ────────────────────────────────
      const INSET = 28;
      // Outer hairline
      const borderCol  = theme.border  || (currentStreak>=50 ? "rgba(212,175,55,0.50)" : "rgba(255,255,255,0.18)");
      const bracketCol = theme.bracket || (currentStreak>=50 ? "rgba(212,175,55,0.85)" : "rgba(255,255,255,0.60)");
      ctx.strokeStyle = borderCol;
      ctx.lineWidth = 1; ctx.strokeRect(INSET, INSET, W-INSET*2, H-INSET*2);
      // Inner glow line (2px inside)
      ctx.save(); ctx.globalAlpha=0.25;
      ctx.strokeStyle = bracketCol; ctx.lineWidth=0.5;
      ctx.strokeRect(INSET+3, INSET+3, W-INSET*2-6, H-INSET*2-6);
      ctx.restore();

      // ── Corner brackets — double-arm, longer ────────────────────────────
      const bLen = 44, bGap = INSET;
      ctx.strokeStyle = bracketCol; ctx.lineWidth = 1.8;
      ctx.shadowColor="rgba(0,0,0,0.6)"; ctx.shadowBlur=6;
      [[bGap,bGap,1,1],[W-bGap,bGap,-1,1],[bGap,H-bGap,1,-1],[W-bGap,H-bGap,-1,-1]].forEach(([cx,cy,sx,sy]) => {
        ctx.beginPath(); ctx.moveTo(cx+sx*bLen,cy); ctx.lineTo(cx,cy); ctx.lineTo(cx,cy+sy*bLen); ctx.stroke();
      });
      // Inner corner accent (short, lighter)
      ctx.lineWidth=0.7; ctx.globalAlpha=0.45;
      const bLen2 = 18, bGap2 = INSET+8;
      [[bGap2,bGap2,1,1],[W-bGap2,bGap2,-1,1],[bGap2,H-bGap2,1,-1],[W-bGap2,H-bGap2,-1,-1]].forEach(([cx,cy,sx,sy]) => {
        ctx.beginPath(); ctx.moveTo(cx+sx*bLen2,cy); ctx.lineTo(cx,cy); ctx.lineTo(cx,cy+sy*bLen2); ctx.stroke();
      });
      ctx.globalAlpha=1; ctx.shadowBlur=0;

      // ── Ghost text helper ────────────────────────────────────────────────
      const ghost = (text, x, y, size, align="left", col="rgba(255,255,255,0.92)", weight="400", tracking="0.12em") => {
        ctx.save();
        ctx.font=`${weight} ${size}px 'Helvetica Neue',Helvetica,Arial,sans-serif`;
        ctx.fillStyle=col; ctx.textAlign=align;
        ctx.letterSpacing=tracking;
        ctx.shadowColor="rgba(0,0,0,0.90)"; ctx.shadowBlur=12; ctx.shadowOffsetY=1;
        ctx.fillText(text, x, y); ctx.restore();
      };

      // ── TOP LEFT — brand ─────────────────────────────────────────────────
      const TL_X = INSET+28, TL_Y = INSET+52;
      ghost("PROOF OF GRASS", TL_X, TL_Y, 13, "left", "rgba(255,255,255,0.55)", "600", "0.28em");
      ghost("verified outdoors", TL_X, TL_Y+28, 26, "left", "rgba(255,255,255,0.96)", "700", "0.04em");
      // Accent rule under brand
      ctx.save();
      ctx.shadowColor="rgba(0,0,0,0.5)"; ctx.shadowBlur=4;
      const ruleGrad = ctx.createLinearGradient(TL_X, 0, TL_X+220, 0);
      ruleGrad.addColorStop(0, accentText); ruleGrad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.strokeStyle=ruleGrad; ctx.lineWidth=1.2;
      ctx.beginPath(); ctx.moveTo(TL_X, TL_Y+40); ctx.lineTo(TL_X+220, TL_Y+40); ctx.stroke();
      ctx.restore();

      // ── TOP RIGHT — streak ───────────────────────────────────────────────
      const TR_X = W-INSET-32, TR_Y = INSET+52;
      ghost("CURRENT STREAK", TR_X, TR_Y, 11, "right", mutedText, "600", "0.24em");
      ctx.save();
      ctx.shadowColor="rgba(0,0,0,0.95)"; ctx.shadowBlur=20; ctx.textAlign="right";
      // DAY label small
      ctx.font=`300 22px 'Helvetica Neue',Helvetica,Arial,sans-serif`;
      ctx.fillStyle="rgba(255,255,255,0.55)"; ctx.letterSpacing="0.18em";
      ctx.fillText("DAY", TR_X, TR_Y+60);
      // Streak number large
      ctx.font=`400 110px 'Helvetica Neue',Helvetica,Arial,sans-serif`;
      ctx.fillStyle=accentText; ctx.letterSpacing="-0.03em";
      ctx.fillText(String(currentStreak), TR_X, TR_Y+158);
      ctx.restore();

      // Tier label
      if (currentStreak >= 7) {
        const tierLabel = currentStreak>=1000?"TRANSCENDENT":currentStreak>=500?"ASCENDED":currentStreak>=365?"ETERNAL":currentStreak>=180?"MYTHIC":currentStreak>=100?"IMMORTAL":currentStreak>=50?"LEGENDARY":currentStreak>=30?"ELITE":currentStreak>=14?"LOCKED IN":"ROOTED";
        // Pill background
        const tierW = tierLabel.length * 8 + 32;
        ctx.save();
        ctx.shadowBlur=0;
        ctx.fillStyle="rgba(0,0,0,0.35)";
        roundRect(ctx, TR_X - tierW, TR_Y+168, tierW, 24, 4);
        ctx.fill();
        ctx.restore();
        ghost(`✦ ${tierLabel} ✦`, TR_X - tierW/2, TR_Y+184, 11, "center", accentText, "600", "0.18em");
      }

      // ── ROTATED SIDE TEXT ─────────────────────────────────────────────────
      ctx.save(); ctx.translate(INSET+20, H*0.68); ctx.rotate(-Math.PI/2);
      ctx.font="300 11px 'Helvetica Neue',Helvetica,Arial,sans-serif";
      ctx.fillStyle="rgba(255,255,255,0.30)"; ctx.letterSpacing="0.22em";
      ctx.shadowColor="rgba(0,0,0,0.80)"; ctx.shadowBlur=6; ctx.textAlign="center";
      ctx.fillText("KEEP GOING  ·  LIVE BETTER  ·  TOUCH MORE", 0, 0);
      ctx.restore();

      ctx.save(); ctx.translate(W-INSET-20, H*0.38); ctx.rotate(Math.PI/2);
      ctx.font="300 11px 'Helvetica Neue',Helvetica,Arial,sans-serif";
      ctx.fillStyle="rgba(255,255,255,0.25)"; ctx.letterSpacing="0.22em";
      ctx.shadowColor="rgba(0,0,0,0.80)"; ctx.shadowBlur=6; ctx.textAlign="center";
      ctx.fillText("REAL MOMENTS  ·  REAL LIFE", 0, 0);
      ctx.restore();

      // ── BOTTOM LEFT — date ────────────────────────────────────────────────
      const BL_X = INSET+28, BL_BASE = H-INSET-32;
      ghost("DATE OF CERTIFICATION", BL_X, BL_BASE-28, 10, "left", mutedText, "600", "0.26em");
      ghost(dateStr, BL_X, BL_BASE, 22, "left", "rgba(255,255,255,0.96)", "300", "0.08em");

      // ── BOTTOM RIGHT — certified by ───────────────────────────────────────
      const BR_X = W-INSET-32, BR_BASE = H-INSET-32;
      ghost("CERTIFIED BY", BR_X, BR_BASE-28, 10, "right", mutedText, "600", "0.26em");
      ghost("touch grass", BR_X, BR_BASE, 22, "right", "rgba(255,255,255,0.96)", "300", "0.08em");

      // ── SEAL ─────────────────────────────────────────────────────────────
      const topPct = getTopPercent(currentStreak);
      if (topPct !== null) {
        const SEAL_CX = BR_X - 72, SEAL_Y = BR_BASE - 130;
        const R1 = 52, R2 = 44, R3 = 38;
        ctx.save();
        ctx.shadowColor = "rgba(0,0,0,0.75)"; ctx.shadowBlur=16;
        // Outer ring
        ctx.strokeStyle=accentText; ctx.lineWidth=1.2; ctx.globalAlpha=0.75;
        ctx.beginPath(); ctx.arc(SEAL_CX, SEAL_Y, R1, 0, Math.PI*2); ctx.stroke();
        // Inner ring
        ctx.lineWidth=0.6; ctx.globalAlpha=0.40;
        ctx.beginPath(); ctx.arc(SEAL_CX, SEAL_Y, R2, 0, Math.PI*2); ctx.stroke();
        // Tiny inner dot
        ctx.globalAlpha=0.30;
        ctx.beginPath(); ctx.arc(SEAL_CX, SEAL_Y, R3, 0, Math.PI*2); ctx.stroke();
        // Tick marks at 12 equidistant points
        ctx.lineWidth=0.8; ctx.globalAlpha=0.45;
        for (let t=0;t<12;t++) {
          const angle = (t/12)*Math.PI*2;
          const outer = R1+2, inner = t%3===0 ? R1-6 : R1-3;
          ctx.beginPath();
          ctx.moveTo(SEAL_CX+Math.cos(angle)*outer, SEAL_Y+Math.sin(angle)*outer);
          ctx.lineTo(SEAL_CX+Math.cos(angle)*inner, SEAL_Y+Math.sin(angle)*inner);
          ctx.stroke();
        }
        ctx.restore();
        // Text
        ghost(`TOP ${topPct}%`, SEAL_CX, SEAL_Y, 17, "center", accentText, "700", "0.06em");
        ghost("GRASS TOUCHERS", SEAL_CX, SEAL_Y+20, 9, "center", "rgba(255,255,255,0.80)", "600", "0.14em");
      }

      // ── LOGO ─────────────────────────────────────────────────────────────
      const logo = new Image();
      const cacheForPreview = (dataUrl) => {
        setDownloadUrl(dataUrl);
        try {
          fetch(dataUrl)
            .then(res => res.blob())
            .then(blob => {
              sharableFileRef.current = new File([blob], "proof-of-grass.png", { type: "image/png" });
            });
        } catch (e) {
          console.warn("[photo] preview cache failed:", e?.message);
        }
      };
      logo.onload = () => {
        ctx.save(); ctx.globalAlpha=0.55;
        ctx.drawImage(logo, BL_X-4, BL_BASE-72, 36, 36);
        ctx.restore(); cacheForPreview(canvas.toDataURL("image/png"));
      };
      logo.onerror = () => cacheForPreview(canvas.toDataURL("image/png"));
      logo.src = "/touchgrass-transparent.png";
    } catch(canvasErr) {
      console.error("[canvas] render error:", canvasErr?.message, canvasErr);
      try { setDownloadUrl(canvas.toDataURL("image/png")); } catch {}
    }};
    img.src = imageSrc;
  }, [imageSrc, dateStr, currentStreak, selectedTheme]);

  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:24,width:"100%"}}>

      <canvas ref={canvasRef} style={{display:"none"}} />

      <div style={{width:"100%"}}>
        <div style={{width:"100%",overflow:"hidden",borderRadius:6,border:"1px solid #1a3a1e",boxShadow:"0 0 80px rgba(74,222,128,0.08)"}}>
          {downloadUrl ? (
            <img src={downloadUrl} alt="Proof of Grass Certificate" style={{width:"100%",height:"auto",display:"block",maxWidth:"100%"}} />
          ) : (
            <div style={{width:"100%",aspectRatio:"1/1",background:"#0a140b",display:"flex",alignItems:"center",justifyContent:"center"}}>
              <span style={{fontFamily:"monospace",color:"#2a4a2d",fontSize:11,letterSpacing:"0.3em"}}>generating…</span>
            </div>
          )}
        </div>
      </div>

      {downloadUrl && (
        <a href={downloadUrl} download="proof-of-grass.png"
          
          style={{display:"inline-flex",alignItems:"center",gap:10,padding:"12px 32px",fontFamily:"monospace",fontSize:13,fontWeight:700,letterSpacing:"0.15em",textTransform:"uppercase",color:"#0e1108",background:"#93a85a",borderRadius:3,textDecoration:"none",boxShadow:"0 0 20px rgba(147,168,90,0.3)"}}>
          ↓ Download Certificate
        </a>
      )}

      {isInAppBrowser && !inAppBrowserMode && (
        <div style={{
          width:"100%", borderRadius:14, overflow:"hidden",
          border:"1px solid rgba(200,168,75,0.45)",
          boxShadow:"0 4px 24px rgba(200,168,75,0.12)",
        }}>
          {/* Header */}
          <div style={{
            background:"linear-gradient(135deg,rgba(200,168,75,0.22),rgba(200,168,75,0.08))",
            padding:"14px 16px",
            display:"flex", alignItems:"center", gap:12,
          }}>
            <div style={{
              width:38, height:38, borderRadius:10, flexShrink:0,
              background:"rgba(200,168,75,0.2)", border:"1px solid rgba(200,168,75,0.4)",
              display:"flex", alignItems:"center", justifyContent:"center", fontSize:18,
            }}>⚠️</div>
            <div>
              <div style={{fontSize:13,fontWeight:700,color:"#f0efea",marginBottom:2}}>
                Open in Safari or Chrome
              </div>
              <div style={{fontSize:11,color:"rgba(200,168,75,0.75)",lineHeight:1.5}}>
                The X browser can't attach your result card image.
              </div>
            </div>
          </div>
          {/* Steps */}
          <div style={{background:"rgba(14,16,11,0.9)",padding:"12px 16px",display:"flex",flexDirection:"column",gap:8}}>
            {[
              ["1","Tap  ···  in the top right corner of X"],
              ["2",'Select "Open in Browser"'],
              ["3","Return to Proof of Grass and share your card"],
            ].map(([n,text]) => (
              <div key={n} style={{display:"flex",alignItems:"center",gap:10}}>
                <div style={{
                  width:20,height:20,borderRadius:"50%",flexShrink:0,
                  background:"rgba(200,168,75,0.15)",border:"1px solid rgba(200,168,75,0.35)",
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:9,fontWeight:800,color:"#c8a84b",
                }}>{n}</div>
                <div style={{fontSize:11,color:"rgba(240,239,234,0.65)",lineHeight:1.4}}>{text}</div>
              </div>
            ))}
          </div>
          {/* Why this matters */}
          <div style={{
            background:"rgba(200,168,75,0.05)",
            borderTop:"1px solid rgba(200,168,75,0.15)",
            padding:"10px 16px",
            fontSize:10, color:"rgba(200,168,75,0.5)", lineHeight:1.5,
          }}>
            Your result card and outdoor photo can only be attached in a real browser — not inside X.
          </div>
        </div>
      )}

      {inAppBrowserMode && (
        <div style={{background:"rgba(147,168,90,0.06)",border:"1px solid rgba(147,168,90,0.3)",borderRadius:10,padding:"18px 16px",display:"flex",flexDirection:"column",alignItems:"center",gap:12,textAlign:"center",width:"100%"}}>
          <div style={{fontSize:22}}>✓</div>
          <div style={{fontWeight:700,color:"#93a85a",fontSize:13,letterSpacing:"0.06em"}}>STREAK LOCKED IN</div>
          <div style={{fontSize:11,color:"rgba(240,239,234,0.5)",lineHeight:1.7}}>Your streak is saved. Open in Safari to share with image.</div>
          {downloadUrl && <a href={downloadUrl} download="proof-of-grass.png" style={{display:"inline-flex",alignItems:"center",gap:7,background:"#93a85a",color:"#080a06",borderRadius:8,padding:"10px 20px",fontSize:12,fontWeight:700,textDecoration:"none"}}>↓ Save Card to Photos</a>}
        </div>
      )}

      {downloadUrl && !inAppBrowserMode && submitStatus !== "success" && (
        <div style={{width:"100%",maxWidth:420}}>
          {locationMode === null ? (
            <div style={{display:"flex",flexDirection:"column",gap:8,background:"rgba(147,168,90,0.06)",border:"1px solid rgba(147,168,90,0.2)",borderRadius:10,padding:14}}>
              <div style={{fontSize:11,fontWeight:600,color:"#93a85a",letterSpacing:"0.04em"}}>📍 Add Location <span style={{color:"rgba(240,239,234,0.4)",fontWeight:400}}>(optional)</span></div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                <button onClick={requestGpsLocation} disabled={gpsRequesting} style={{flex:"1 1 auto",fontSize:11,fontWeight:600,padding:"8px 12px",borderRadius:7,border:"1px solid rgba(147,168,90,0.35)",background:"rgba(147,168,90,0.1)",color:"#93a85a",cursor:"pointer",opacity:gpsRequesting?0.6:1}}>{gpsRequesting?"Locating…":"📍 Use My Location"}</button>
                <button onClick={()=>setLocationMode("manual")} style={{flex:"1 1 auto",fontSize:11,fontWeight:600,padding:"8px 12px",borderRadius:7,border:"1px solid rgba(255,255,255,0.12)",background:"rgba(255,255,255,0.04)",color:"rgba(240,239,234,0.7)",cursor:"pointer"}}>✏️ Enter City</button>
                <button onClick={()=>setLocationMode("none")} style={{flex:"1 1 auto",fontSize:11,fontWeight:600,padding:"8px 12px",borderRadius:7,border:"1px solid rgba(255,255,255,0.08)",background:"transparent",color:"rgba(240,239,234,0.4)",cursor:"pointer"}}>Skip</button>
              </div>
              {gpsError && <div style={{fontSize:10,color:"#f87171"}}>{gpsError}</div>}
              <div style={{fontSize:9.5,color:"rgba(240,239,234,0.35)",lineHeight:1.5}}>We only show approximate locations. Exact location is never displayed.</div>
            </div>
          ) : locationMode === "manual" ? (
            <div style={{display:"flex",flexDirection:"column",gap:8,background:"rgba(147,168,90,0.06)",border:"1px solid rgba(147,168,90,0.2)",borderRadius:10,padding:14}}>
              <div style={{fontSize:11,fontWeight:600,color:"#93a85a"}}>📍 Enter Your City</div>
              <input value={locationCity} onChange={e=>setLocationCity(e.target.value)} placeholder="City (e.g. Margate)" style={{background:"rgba(0,0,0,0.3)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:7,padding:"8px 10px",fontSize:12,color:"#f0efea",outline:"none"}} />
              <div style={{display:"flex",gap:6}}>
                <input value={locationRegion} onChange={e=>setLocationRegion(e.target.value)} placeholder="State/Region" style={{flex:1,background:"rgba(0,0,0,0.3)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:7,padding:"8px 10px",fontSize:12,color:"#f0efea",outline:"none"}} />
                <input value={locationCountry} onChange={e=>setLocationCountry(e.target.value)} placeholder="Country" style={{flex:1,background:"rgba(0,0,0,0.3)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:7,padding:"8px 10px",fontSize:12,color:"#f0efea",outline:"none"}} />
              </div>
              <button onClick={()=>{if(!locationCity.trim())setLocationMode(null);}} style={{fontSize:10,color:"rgba(240,239,234,0.4)",background:"none",border:"none",cursor:"pointer",textAlign:"left",textDecoration:"underline"}}>← Back</button>
            </div>
          ) : locationMode === "gps" ? (
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,background:"rgba(147,168,90,0.08)",border:"1px solid rgba(147,168,90,0.25)",borderRadius:10,padding:"10px 14px"}}>
              <span style={{fontSize:11,color:"#93a85a"}}>📍 Approximate location added</span>
              <button onClick={()=>{setLocationMode(null);setGpsLat(null);setGpsLng(null);}} style={{fontSize:10,color:"rgba(240,239,234,0.4)",background:"none",border:"none",cursor:"pointer",textDecoration:"underline"}}>Remove</button>
            </div>
          ) : (
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:10,padding:"10px 14px"}}>
              <span style={{fontSize:11,color:"rgba(240,239,234,0.4)"}}>No location added</span>
              <button onClick={()=>setLocationMode(null)} style={{fontSize:10,color:"#93a85a",background:"none",border:"none",cursor:"pointer",textDecoration:"underline"}}>Add location</button>
            </div>
          )}
        </div>
      )}

      {/* Theme Selector — only shown if user has Premium Proofs */}
      {downloadUrl && !inAppBrowserMode && submitStatus !== "success" && hasPremiumProofs && (
        <div style={{ width:"100%", marginBottom:4 }}>
          <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.14em",
            textTransform:"uppercase", color:"rgba(167,139,250,0.7)",
            marginBottom:8 }}>✨ Premium+ Theme</div>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
            {Object.entries(THEMES).map(([key, theme]) => (
              <button key={key} onClick={() => setSelectedTheme(key)}
                style={{
                  padding:"6px 12px", borderRadius:20, fontSize:11,
                  fontWeight:600, cursor:"pointer",
                  background: selectedTheme===key
                    ? key==="classic" ? "#93a85a" : "rgba(167,139,250,0.25)"
                    : "rgba(255,255,255,0.05)",
                  color: selectedTheme===key
                    ? key==="classic" ? "#0e1108" : "#a78bfa"
                    : "rgba(240,239,234,0.45)",
                  border: selectedTheme===key
                    ? `1px solid ${key==="classic" ? "#93a85a" : "rgba(167,139,250,0.6)"}`
                    : "1px solid rgba(255,255,255,0.1)",
                  transition:"all 0.15s",
                }}>
                {theme.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── SHARE TO X ──────────────────────────────────────────────────── */}
      {downloadUrl && !inAppBrowserMode && submitStatus !== "success" && (
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:8,width:"100%"}}>
          <button
            onClick={() => setShowStylePicker(true)}
            aria-label="Share to X"
            style={{
              display:"inline-flex",alignItems:"center",gap:10,
              padding:"13px 32px",width:"100%",justifyContent:"center",
              fontFamily:"monospace",fontSize:13,fontWeight:700,
              letterSpacing:"0.15em",textTransform:"uppercase",
              borderRadius:3,cursor:"pointer",border:"1px solid #93a85a",
              background:"transparent",color:"#93a85a",
            }}>
            📤 Share to X
          </button>
          {shareHint && (
            <p style={{fontFamily:"monospace",fontSize:11,color:"#93a85a",letterSpacing:"0.08em",margin:0}}>
              select x from the share sheet, then post
            </p>
          )}
          {submitStatus==="error" && submitError && (
            <p style={{fontFamily:"monospace",fontSize:10,color:"#ef4444",textAlign:"center",margin:0}}>{submitError}</p>
          )}
        </div>
      )}

      {/* ── BIG CONFIRMATION BUTTON ──────────────────────────────────── */}
      {shared && submitStatus !== "success" && (
        <div style={{width:"100%",display:"flex",flexDirection:"column",gap:10}}>
          <button
            onClick={lockInStreak}
            disabled={submitStatus==="loading"}
            aria-label="I posted it — lock in my streak"
            style={{
              width:"100%",
              padding:"22px 16px",
              borderRadius:16,
              border:"none",
              background:"linear-gradient(135deg,#93a85a,#7a9148)",
              color:"#080a06",
              fontSize:22,
              fontWeight:900,
              letterSpacing:"0.02em",
              cursor: submitStatus==="loading" ? "default" : "pointer",
              opacity: submitStatus==="loading" ? 0.7 : 1,
              boxShadow:"0 8px 32px rgba(147,168,90,0.45)",
              display:"flex",
              alignItems:"center",
              justifyContent:"center",
              gap:12,
              transition:"transform 0.1s, box-shadow 0.1s",
            }}
            onMouseDown={e => e.currentTarget.style.transform="scale(0.98)"}
            onMouseUp={e => e.currentTarget.style.transform="scale(1)"}
            onTouchStart={e => e.currentTarget.style.transform="scale(0.98)"}
            onTouchEnd={e => e.currentTarget.style.transform="scale(1)"}
          >
            {submitStatus==="loading" ? (
              <>⟳ Locking in…</>
            ) : (
              <>✓ I Posted It</>
            )}
          </button>

          {submitStatus==="error" && submitError && (
            <div style={{padding:"10px 14px",borderRadius:10,background:"rgba(239,68,68,0.06)",border:"1px solid rgba(239,68,68,0.25)",display:"flex",flexDirection:"column",gap:8}}>
              <p style={{fontSize:11,color:"#ef4444",margin:0,textAlign:"center"}}>{submitError}</p>
              <button onClick={lockInStreak}
                style={{background:"transparent",border:"1px solid rgba(239,68,68,0.4)",color:"#ef4444",borderRadius:8,padding:"9px",fontSize:12,fontWeight:700,cursor:"pointer",width:"100%"}}>
                Try Again
              </button>
            </div>
          )}

          <button
            onClick={() => setShared(false)}
            style={{background:"none",border:"none",color:"rgba(240,239,234,0.22)",fontSize:11,cursor:"pointer",padding:"2px",textAlign:"center"}}>
            I haven't posted yet
          </button>
        </div>
      )}

      {/* ── SUCCESS — card stays accessible ────────────────────────── */}
      {submitStatus === "success" && (
        <div style={{width:"100%",borderRadius:14,overflow:"hidden",border:"1px solid rgba(147,168,90,0.3)"}}>
          {/* Confirmation bar */}
          <div style={{
            background:"linear-gradient(135deg,rgba(147,168,90,0.18),rgba(147,168,90,0.06))",
            padding:"14px 16px",
            display:"flex",alignItems:"center",gap:12,
          }}>
            <div style={{
              width:38,height:38,borderRadius:10,flexShrink:0,
              background:"rgba(147,168,90,0.2)",border:"1px solid rgba(147,168,90,0.4)",
              display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,
            }}>✓</div>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:700,color:"#93a85a",marginBottom:1}}>
                Day {currentStreak} Locked In
              </div>
              <div style={{fontSize:10,color:"rgba(147,168,90,0.6)"}}>
                Your streak is saved for today.
              </div>
            </div>
          </div>
          {/* Share again + download — card stays live */}
          <div style={{
            background:"rgba(14,16,11,0.9)",
            borderTop:"1px solid rgba(147,168,90,0.12)",
            padding:"12px 14px",
            display:"flex",gap:8,
          }}>
            <button
              onClick={() => setShowStylePicker(true)}
              aria-label="Share your card again"
              style={{
                flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:7,
                padding:"10px 14px",borderRadius:9,cursor:"pointer",
                background:"rgba(147,168,90,0.12)",
                border:"1px solid rgba(147,168,90,0.3)",
                color:"#93a85a",fontSize:12,fontWeight:700,letterSpacing:"0.04em",
              }}>
              📤 Share Again
            </button>
            <a
              href={downloadUrl}
              download={`proof-of-grass-day-${currentStreak}.png`}
              aria-label="Download your result card"
              style={{
                flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:7,
                padding:"10px 14px",borderRadius:9,cursor:"pointer",
                background:"transparent",
                border:"1px solid rgba(255,255,255,0.1)",
                color:"rgba(240,239,234,0.55)",fontSize:12,fontWeight:600,
                textDecoration:"none",letterSpacing:"0.04em",
              }}>
              ↓ Save Card
            </a>
          </div>
        </div>
      )}

      {/* ── STYLE PICKER MODAL ───────────────────────────────────────── */}
      {showStylePicker && (() => {
        const cardStyle = (style) => ({
          flex:"1 1 0",minWidth:0,
          border:`2px solid ${shareStyle===style ? "#93a85a" : "rgba(255,255,255,0.1)"}`,
          borderRadius:12,padding:"14px 12px",cursor:"pointer",
          background:shareStyle===style ? "rgba(147,168,90,0.08)" : "rgba(255,255,255,0.02)",
          display:"flex",flexDirection:"column",gap:8,
          transition:"all 0.15s",
          outline:"none",
        });
        return (
          <>
            {/* Backdrop */}
            <div
              onClick={() => setShowStylePicker(false)}
              role="button"
              aria-label="Close style picker"
              style={{position:"fixed",inset:0,zIndex:997,background:"rgba(0,0,0,0.65)",backdropFilter:"blur(3px)"}}
            />
            {/* Sheet */}
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Choose Your Proof Style"
              onKeyDown={e => { if(e.key==="Escape") setShowStylePicker(false); }}
              tabIndex={-1}
              style={{
                position:"fixed",left:0,right:0,bottom:0,zIndex:998,
                background:"#0e100b",borderTop:"1px solid rgba(255,255,255,0.1)",
                borderRadius:"20px 20px 0 0",
                padding:"24px 20px clamp(24px,env(safe-area-inset-bottom,24px)+24px,48px)",
                maxHeight:"90vh",overflowY:"auto",
              }}>
              {/* Handle */}
              <div style={{width:40,height:4,borderRadius:2,background:"rgba(255,255,255,0.15)",margin:"0 auto 20px"}} />
              <div style={{fontSize:15,fontWeight:700,color:"#f0efea",textAlign:"center",marginBottom:18,letterSpacing:"0.04em"}}>
                Choose Your Proof Style
              </div>

              <div style={{display:"flex",gap:12,marginBottom:20}}>
                {/* Outdoor Photo */}
                <button
                  style={cardStyle("outdoor_photo")}
                  onClick={() => selectShareStyle("outdoor_photo")}
                  aria-pressed={shareStyle==="outdoor_photo"}
                  aria-label="Outdoor Photo — Recommended">
                  {/* Preview */}
                  <div style={{width:"100%",aspectRatio:"4/3",borderRadius:8,overflow:"hidden",background:"#0a140b",flexShrink:0}}>
                    {imageSrc && (
                      <img src={imageSrc} alt="Your outdoor proof photo" style={{width:"100%",height:"100%",objectFit:"cover"}} />
                    )}
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <div style={{flex:1}}>
                      <div style={{fontSize:12,fontWeight:700,color:"#f0efea"}}>Outdoor Photo</div>
                      <div style={{fontSize:10,color:"rgba(240,239,234,0.5)"}}>Authentic and simple</div>
                    </div>
                    {shareStyle==="outdoor_photo" && <span style={{fontSize:16}}>✓</span>}
                  </div>
                  <div style={{fontSize:9,fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase",color:"#93a85a",background:"rgba(147,168,90,0.12)",borderRadius:20,padding:"2px 10px",alignSelf:"flex-start"}}>
                    Recommended
                  </div>
                </button>

                {/* Result Card */}
                <button
                  style={cardStyle("result_card")}
                  onClick={() => selectShareStyle("result_card")}
                  aria-pressed={shareStyle==="result_card"}
                  aria-label="Result Card — Branded">
                  {/* Preview */}
                  <div style={{width:"100%",aspectRatio:"4/3",borderRadius:8,overflow:"hidden",background:"#0a140b",flexShrink:0}}>
                    {downloadUrl && (
                      <img src={downloadUrl} alt="Proof of Grass branded result card" style={{width:"100%",height:"100%",objectFit:"cover"}} />
                    )}
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <div style={{flex:1}}>
                      <div style={{fontSize:12,fontWeight:700,color:"#f0efea"}}>Result Card</div>
                      <div style={{fontSize:10,color:"rgba(240,239,234,0.5)"}}>Branded and streak-focused</div>
                    </div>
                    {shareStyle==="result_card" && <span style={{fontSize:16}}>✓</span>}
                  </div>
                </button>
              </div>

              {/* Caption preview */}
              <div style={{background:"rgba(0,0,0,0.3)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:10,padding:"12px 14px",marginBottom:16,fontSize:11,color:"rgba(240,239,234,0.6)",lineHeight:1.7,fontFamily:"monospace",whiteSpace:"pre-wrap",wordBreak:"break-word"}}>
                {buildShareText()}
              </div>

              <div style={{display:"flex",gap:8}}>
                <button
                  onClick={() => setShowStylePicker(false)}
                  aria-label="Cancel"
                  style={{flex:"0 0 auto",padding:"12px 18px",borderRadius:8,border:"1px solid rgba(255,255,255,0.12)",background:"transparent",color:"rgba(240,239,234,0.5)",fontSize:13,cursor:"pointer"}}>
                  Cancel
                </button>
                <button
                  onClick={async () => { setShowStylePicker(false); const text = buildShareText(); const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent ?? ""); const canShareFiles = !isInAppBrowser && isMobile && typeof navigator.share === "function" && typeof navigator.canShare === "function"; const file = await buildShareFile(shareStyle); if (canShareFiles && file && navigator.canShare({ files:[file] })) { setShareHint(true); try { await navigator.share({ files:[file], text }); setShared(true); setShareHint(false); } catch(err) { setShareHint(false); if(err?.name !== "AbortError") { navigator.clipboard.writeText(text).catch(()=>{}); window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, "_blank"); setShared(true); } } } else { navigator.clipboard.writeText(text).catch(()=>{}); window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, "_blank"); setShared(true); } }}
                  aria-label="Continue to X"
                  style={{flex:1,padding:"13px",borderRadius:8,border:"none",background:"#93a85a",color:"#0e1108",fontSize:13,fontWeight:700,cursor:"pointer",letterSpacing:"0.08em"}}>
                  Continue to X →
                </button>
              </div>
            </div>
          </>
        );
      })()}



      {/* Share to Instagram — uses feed format, no streak lock */}
      {downloadUrl && !inAppBrowserMode && (
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:8,width:"100%"}}>
          <button onClick={shareToInstagram} style={{display:"inline-flex",alignItems:"center",justifyContent:"center",gap:10,padding:"13px 32px",width:"100%",fontFamily:"monospace",fontSize:13,fontWeight:700,letterSpacing:"0.15em",textTransform:"uppercase",borderRadius:3,cursor:"pointer",border:"none",background:"linear-gradient(135deg,#833ab4,#fd1d1d,#f77737)",color:"#fff"}}>
            📸 share to instagram
          </button>
          {igCopied && <p style={{fontFamily:"monospace",fontSize:11,color:"#a78bfa",textAlign:"center",letterSpacing:"0.06em",margin:0,lineHeight:1.6}}>✓ caption copied — paste it into instagram after the image loads</p>}
          {igDesktop && <p style={{fontFamily:"monospace",fontSize:11,color:"rgba(147,168,90,0.55)",textAlign:"center",letterSpacing:"0.06em",margin:0,lineHeight:1.6}}>card saved · open instagram on your phone → new post → camera roll</p>}
        </div>
      )}

      {/* More platforms — opens drawer, shown after streak locked */}
      {downloadUrl && !inAppBrowserMode && submitStatus === "success" && (
        <button onClick={()=>setDrawerOpen(true)} style={{display:"inline-flex",alignItems:"center",justifyContent:"center",gap:8,padding:"11px 24px",width:"100%",fontFamily:"monospace",fontSize:11,fontWeight:600,letterSpacing:"0.12em",textTransform:"uppercase",borderRadius:3,cursor:"pointer",border:"1px solid rgba(255,255,255,0.1)",background:"transparent",color:"rgba(240,239,234,0.5)"}}>
          ··· more platforms
        </button>
      )}

      {/* Caption Generator */}
      <div style={{width:"100%"}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
          <div style={{flex:1,height:1,background:"linear-gradient(to right,transparent,#1f3d22)"}}/>
          <span style={{fontFamily:"monospace",fontSize:10,letterSpacing:"0.3em",color:"#3a5e3d",textTransform:"uppercase"}}>Caption Generator</span>
          <div style={{flex:1,height:1,background:"linear-gradient(to left,transparent,#1f3d22)"}}/>
        </div>
        <div style={{position:"relative",borderRadius:4,border:"1px solid #1a3520",background:"#0a140b",padding:"20px 24px",boxShadow:"inset 0 1px 0 rgba(74,222,128,0.06),0 0 24px rgba(0,0,0,0.4)"}}>
          {[{t:0,l:0},{t:0,r:0},{b:0,l:0},{b:0,r:0}].map((_,i)=>(
            <span key={i} style={{position:"absolute",width:10,height:10,top:i<2?0:undefined,bottom:i>=2?0:undefined,left:i%2===0?0:undefined,right:i%2===1?0:undefined,borderTop:i<2?"1px solid rgba(147,168,90,0.25)":undefined,borderBottom:i>=2?"1px solid rgba(147,168,90,0.25)":undefined,borderLeft:i%2===0?"1px solid rgba(147,168,90,0.25)":undefined,borderRight:i%2===1?"1px solid rgba(147,168,90,0.25)":undefined}}/>
          ))}
          <p style={{fontFamily:"monospace",fontSize:14,color:"#d1fae5",lineHeight:1.7,textAlign:"center",margin:0}}>{caption}</p>
          <p style={{fontFamily:"monospace",fontSize:11,color:"#93a85a",textAlign:"center",marginTop:12,letterSpacing:"0.08em",lineHeight:1.7,opacity:0.6}}>
            {TAGS}<br/><span style={{opacity:0.7}}>{HANDLE} · proofofgrass.app</span>
          </p>
        </div>
        <div style={{display:"flex",gap:10,marginTop:10}}>
          <button onClick={handleNewCaption} style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:7,padding:"10px 16px",border:"1px solid #1f3d22",background:"#0a140b",color:"#93a85a",fontFamily:"monospace",fontSize:11,letterSpacing:"0.12em",textTransform:"uppercase",borderRadius:3,cursor:"pointer"}}>↺ New Caption</button>
          <button onClick={handleCopy} style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:7,padding:"10px 16px",border:copied?"1px solid #93a85a":"1px solid transparent",background:copied?"#2a3018":"#93a85a",color:copied?"#93a85a":"#0e1108",fontFamily:"monospace",fontSize:11,letterSpacing:"0.12em",textTransform:"uppercase",borderRadius:3,cursor:"pointer",fontWeight:700}}>{copied?"✓ Copied!":"⎘ Copy Caption"}</button>
        </div>
      </div>

      {/* Share Drawer */}
      {drawerOpen && (
        <>
          <div onClick={()=>setDrawerOpen(false)} style={{position:"fixed",inset:0,zIndex:998,background:"rgba(0,0,0,0.65)",backdropFilter:"blur(4px)"}} />
          <div style={{position:"fixed",left:0,right:0,bottom:0,zIndex:999,background:"#0e100b",borderTop:"1px solid rgba(147,168,90,0.2)",borderRadius:"20px 20px 0 0",padding:"24px 20px 48px",maxWidth:540,margin:"0 auto",boxShadow:"0 -20px 60px rgba(0,0,0,0.65)"}}>
            <div style={{width:36,height:4,background:"rgba(255,255,255,0.14)",borderRadius:2,margin:"0 auto 20px"}} />
            <div style={{fontFamily:"monospace",fontSize:10,letterSpacing:"0.24em",textTransform:"uppercase",color:"rgba(147,168,90,0.55)",marginBottom:16,textAlign:"center"}}>Share Proof</div>
            {igCopied && <div style={{fontSize:11,color:"#a78bfa",textAlign:"center",marginBottom:12,padding:"8px 12px",background:"rgba(167,139,250,0.08)",border:"1px solid rgba(167,139,250,0.18)",borderRadius:8,lineHeight:1.5}}>✓ caption copied — paste it into instagram after the image loads</div>}
            {igDesktop && <div style={{fontSize:11,color:"rgba(240,239,234,0.45)",textAlign:"center",marginBottom:12,padding:"8px 12px",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:8,lineHeight:1.5}}>card saved · open instagram on your phone → new post → camera roll</div>}
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {SHARE_OPTIONS.map(opt => {
                const isX = opt.id === "x";
                const status = shareStatus[opt.id];
                const disabled = false;
                return (
                  <button key={opt.id}
                    onClick={()=>{ if(isX){handleShareAndSubmit();setDrawerOpen(false);}else handlePlatformShare(opt.id); }}
                    disabled={disabled||status==="sharing"}
                    style={{display:"flex",alignItems:"center",gap:14,padding:"14px 16px",borderRadius:12,cursor:disabled||status==="sharing"?"default":"pointer",border:"1px solid rgba(255,255,255,0.07)",background:isX?"rgba(255,255,255,0.06)":"rgba(255,255,255,0.03)",opacity:disabled?0.38:1,textAlign:"left",width:"100%"}}>
                    <span style={{fontSize:22,width:28,textAlign:"center"}}>{opt.icon}</span>
                    <div style={{flex:1}}>
                      <div style={{fontFamily:"monospace",fontSize:13,fontWeight:700,color:isX?"#f0efea":"rgba(240,239,234,0.85)",letterSpacing:"0.04em"}}>
                        {opt.label}{opt.locksStreak&&<span style={{fontSize:10,color:"#93a85a",fontWeight:400,marginLeft:8,letterSpacing:"0.06em"}}>· locks streak</span>}
                      </div>
                      <div style={{fontSize:10,color:"rgba(240,239,234,0.32)",fontFamily:"monospace",letterSpacing:"0.04em",marginTop:2}}>{opt.sub}</div>
                    </div>
                    <div style={{fontSize:11,color:"rgba(240,239,234,0.28)",fontFamily:"monospace",flexShrink:0}}>{status==="sharing"?"…":status==="done"?"✓":"→"}</div>
                  </button>
                );
              })}
              <button onClick={handleDownloadAll} disabled={!downloadUrl}
                style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,padding:"13px 16px",borderRadius:12,cursor:downloadUrl?"pointer":"default",border:"1px solid rgba(147,168,90,0.18)",background:"rgba(147,168,90,0.05)",opacity:downloadUrl?1:0.38,marginTop:4,width:"100%"}}>
                <span style={{fontFamily:"monospace",fontSize:12,color:"#93a85a",letterSpacing:"0.1em",fontWeight:600}}>⬇ Download All 4 Formats</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Lucky Touch Modal */}
      {luckyTouch?.triggered && (
        <div style={{position:"fixed",inset:0,zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(4,5,3,0.85)",backdropFilter:"blur(8px)",padding:"24px"}} onClick={()=>setLuckyTouch(null)}>
          <div style={{position:"relative",background:luckyTouch.tier==="legendary"?"linear-gradient(145deg,#1a1200,#2d2000,#1a0e00)":luckyTouch.tier==="rare"?"linear-gradient(145deg,#0a0e14,#141e2a,#0a0e14)":"linear-gradient(145deg,#0a100a,#141e10,#0a100a)",border:`1px solid ${luckyTouch.tier==="legendary"?"#c8a84b":luckyTouch.tier==="rare"?"#a78bfa":"#93a85a"}`,borderRadius:20,padding:"40px 32px",maxWidth:340,width:"100%",textAlign:"center",boxShadow:luckyTouch.tier==="legendary"?"0 0 60px rgba(200,168,75,0.35), 0 0 120px rgba(200,168,75,0.15)":luckyTouch.tier==="rare"?"0 0 40px rgba(167,139,250,0.3)":"0 0 30px rgba(147,168,90,0.2)",animation:"ltPop 0.4s cubic-bezier(0.34,1.56,0.64,1)"}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:luckyTouch.tier==="legendary"?56:48,marginBottom:16,filter:luckyTouch.tier==="legendary"?"drop-shadow(0 0 16px rgba(200,168,75,0.8))":luckyTouch.tier==="rare"?"drop-shadow(0 0 12px rgba(167,139,250,0.7))":"drop-shadow(0 0 8px rgba(147,168,90,0.6))"}}>{luckyTouch.tier==="legendary"?"☀️":"🍀"}</div>
            <div style={{fontSize:9,fontWeight:700,letterSpacing:"0.22em",textTransform:"uppercase",marginBottom:10,color:luckyTouch.tier==="legendary"?"#c8a84b":luckyTouch.tier==="rare"?"#a78bfa":"#93a85a"}}>{luckyTouch.tier==="legendary"?"☀ Sun's Blessing":luckyTouch.tier==="rare"?"🍀 Rare Lucky Touch":"🍀 Lucky Touch"}</div>
            <div style={{fontFamily:"'Cormorant Garamond',Georgia,serif",fontSize:luckyTouch.tier==="legendary"?32:28,fontWeight:700,lineHeight:1.1,marginBottom:12,color:"#f0efea"}}>{luckyTouch.tier==="legendary"?"A Rare Blessing":luckyTouch.tier==="rare"?"Rare Reward":"Lucky Touch"}</div>
            <div style={{fontFamily:"'Cormorant Garamond',Georgia,serif",fontSize:22,fontWeight:600,marginBottom:8,color:luckyTouch.tier==="legendary"?"#c8a84b":luckyTouch.tier==="rare"?"#a78bfa":"#93a85a"}}>{luckyTouch.type==="shield"?"🛡 +1 Shield":`🌱 +${luckyTouch.points} Grass Score`}</div>
            <div style={{fontSize:12,color:"rgba(240,239,234,0.45)",lineHeight:1.6,marginBottom:28}}>{luckyTouch.tier==="legendary"?"A rare blessing from the Touch Grass Sun.":luckyTouch.tier==="rare"?"Not everyone gets this. Keep touching grass.":"Keep touching grass."}</div>
            <button onClick={()=>setLuckyTouch(null)} style={{width:"100%",padding:"14px",background:luckyTouch.tier==="legendary"?"#c8a84b":luckyTouch.tier==="rare"?"#a78bfa":"#93a85a",color:luckyTouch.tier==="rare"?"#f0efea":"#0e1108",border:"none",borderRadius:10,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",fontSize:13,fontWeight:700,letterSpacing:"0.06em"}}>Keep Going ✦</button>
          </div>
          <style>{`@keyframes ltPop{from{opacity:0;transform:scale(0.82) translateY(16px);}to{opacity:1;transform:scale(1) translateY(0);}}`}</style>
        </div>
      )}

    </div>
  );
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r); ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h); ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r); ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath();
}

function drawGlowRule(ctx, cx, y, halfW) {
  const grad=ctx.createLinearGradient(cx-halfW,y,cx+halfW,y); grad.addColorStop(0,"rgba(74,222,128,0)"); grad.addColorStop(0.3,"rgba(74,222,128,0.5)"); grad.addColorStop(0.7,"rgba(74,222,128,0.5)"); grad.addColorStop(1,"rgba(74,222,128,0)");
  ctx.save(); ctx.shadowColor="rgba(74,222,128,0.8)"; ctx.shadowBlur=8; ctx.strokeStyle=grad; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(cx-halfW,y); ctx.lineTo(cx+halfW,y); ctx.stroke(); ctx.restore();
}

function drawBrackets(ctx, x1, y1, x2, y2, size) {
  ctx.save(); ctx.strokeStyle="rgba(74,222,128,0.45)"; ctx.shadowColor="rgba(74,222,128,0.7)"; ctx.shadowBlur=12; ctx.lineWidth=1.5; ctx.lineCap="square";
  [[x1,y1,1,1],[x2,y1,-1,1],[x1,y2,1,-1],[x2,y2,-1,-1]].forEach(([cx,cy,sx,sy])=>{ctx.beginPath();ctx.moveTo(cx+sx*size,cy);ctx.lineTo(cx,cy);ctx.lineTo(cx,cy+sy*size);ctx.stroke();}); ctx.restore();
}