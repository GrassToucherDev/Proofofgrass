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

function loadImgEl(src) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = src;
  });
}

function coverFill(ctx, img, x, y, w, h) {
  const scale = Math.max(w / img.width, h / img.height);
  const dw = img.width * scale, dh = img.height * scale;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

function cardGhost(ctx, text, x, y, size, align, col, weight) {
  ctx.save();
  ctx.font = `${weight || 400} ${size}px 'Helvetica Neue',Helvetica,Arial,sans-serif`;
  ctx.fillStyle = col || "rgba(255,255,255,0.92)";
  ctx.textAlign = align || "left";
  ctx.letterSpacing = "0.08em";
  ctx.shadowColor = "rgba(0,0,0,0.85)";
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 1;
  ctx.fillText(text, x, y);
  ctx.restore();
}

function cardTierLabel(streak) {
  if (streak >= 180) return "MYTHIC";
  if (streak >= 100) return "IMMORTAL";
  if (streak >= 50)  return "LEGENDARY";
  if (streak >= 30)  return "ELITE";
  if (streak >= 14)  return "LOCKED IN";
  if (streak >= 7)   return "ROOTED";
  return null;
}

function cardAccent(streak) { return streak >= 50 ? "rgba(212,175,55,1)" : "rgba(160,230,160,1)"; }
function cardMuted(streak)  { return streak >= 50 ? "rgba(212,175,55,0.8)" : "rgba(255,255,255,0.7)"; }

// FORMAT 1: Landscape 1600x900 — X, Discord, Telegram
async function renderLandscape(img, { streak, dateStr }) {
  const W = 1600, H = 900;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");
  const scale = Math.max(W/img.width, H/img.height);
  const dw = img.width*scale, dh = img.height*scale, overflow = dw-W;
  ctx.drawImage(img, overflow>0?-overflow*0.65:(W-dw)/2, (H-dh)/2, dw, dh);
  const vTop=ctx.createLinearGradient(0,0,0,H*0.28); vTop.addColorStop(0,"rgba(0,0,0,0.52)"); vTop.addColorStop(1,"rgba(0,0,0,0)"); ctx.fillStyle=vTop; ctx.fillRect(0,0,W,H*0.28);
  const vBot=ctx.createLinearGradient(0,H*0.72,0,H); vBot.addColorStop(0,"rgba(0,0,0,0)"); vBot.addColorStop(1,"rgba(0,0,0,0.58)"); ctx.fillStyle=vBot; ctx.fillRect(0,H*0.72,W,H*0.28);
  const vLeft=ctx.createLinearGradient(0,0,W*0.18,0); vLeft.addColorStop(0,"rgba(0,0,0,0.28)"); vLeft.addColorStop(1,"rgba(0,0,0,0)"); ctx.fillStyle=vLeft; ctx.fillRect(0,0,W*0.18,H);
  const vRight=ctx.createLinearGradient(W*0.82,0,W,0); vRight.addColorStop(0,"rgba(0,0,0,0)"); vRight.addColorStop(1,"rgba(0,0,0,0.32)"); ctx.fillStyle=vRight; ctx.fillRect(W*0.82,0,W*0.18,H);
  const INSET=22, accent=cardAccent(streak), muted=cardMuted(streak);
  ctx.strokeStyle=streak>=50?"rgba(212,175,55,0.55)":"rgba(255,255,255,0.22)"; ctx.lineWidth=0.8; ctx.strokeRect(INSET,INSET,W-INSET*2,H-INSET*2);
  ctx.strokeStyle=streak>=50?"rgba(212,175,55,0.80)":"rgba(255,255,255,0.55)"; ctx.lineWidth=1.2;
  [[INSET,INSET,1,1],[W-INSET,INSET,-1,1],[INSET,H-INSET,1,-1],[W-INSET,H-INSET,-1,-1]].forEach(([cx,cy,sx,sy])=>{ctx.beginPath();ctx.moveTo(cx+sx*28,cy);ctx.lineTo(cx,cy);ctx.lineTo(cx,cy+sy*28);ctx.stroke();});
  const TL_X=INSET+22,TL_Y=INSET+44; cardGhost(ctx,"PROOF OF GRASS",TL_X,TL_Y,16,"left","rgba(255,255,255,0.95)",600); cardGhost(ctx,"verified outdoors",TL_X,TL_Y+22,20,"left","rgba(255,255,255,0.88)",700);
  ctx.strokeStyle="rgba(255,255,255,0.25)"; ctx.lineWidth=0.6; ctx.beginPath(); ctx.moveTo(TL_X,TL_Y+32); ctx.lineTo(TL_X+160,TL_Y+32); ctx.stroke();
  const TR_X=W-INSET-28,TR_Y=INSET+44; cardGhost(ctx,"STREAK",TR_X,TR_Y,13,"right",muted,500);
  ctx.save(); ctx.shadowColor="rgba(0,0,0,0.9)"; ctx.shadowBlur=14; ctx.textAlign="right";
  const numStr=` ${streak}`; ctx.font=`300 88px 'Helvetica Neue',Helvetica,Arial,sans-serif`; ctx.fillStyle="rgba(255,255,255,0.95)"; ctx.fillText("DAY",TR_X-ctx.measureText(numStr).width,TR_Y+92);
  ctx.fillStyle=accent; ctx.font=`400 88px 'Helvetica Neue',Helvetica,Arial,sans-serif`; ctx.fillText(numStr,TR_X,TR_Y+92); ctx.restore();
  const tl=cardTierLabel(streak); if(tl) cardGhost(ctx,`· ${tl} ·`,TR_X,TR_Y+118,14,"right",accent,400);
  ctx.save(); ctx.translate(INSET+16,H*0.72); ctx.rotate(-Math.PI/2); ctx.font="300 12px 'Helvetica Neue',Helvetica,Arial,sans-serif"; ctx.fillStyle="rgba(255,255,255,0.40)"; ctx.shadowColor="rgba(0,0,0,0.70)"; ctx.shadowBlur=5; ctx.letterSpacing="0.18em"; ctx.textAlign="center"; ctx.fillText("KEEP GOING.  LIVE BETTER.  TOUCH MORE.",0,0); ctx.restore();
  ctx.save(); ctx.translate(W-INSET-16,H*0.42); ctx.rotate(Math.PI/2); ctx.font="300 12px 'Helvetica Neue',Helvetica,Arial,sans-serif"; ctx.fillStyle="rgba(255,255,255,0.35)"; ctx.shadowColor="rgba(0,0,0,0.70)"; ctx.shadowBlur=5; ctx.letterSpacing="0.18em"; ctx.textAlign="center"; ctx.fillText("REAL MOMENTS.  REAL LIFE.",0,0); ctx.restore();
  const BL_X=INSET+22,BL_BASE=H-INSET-28; cardGhost(ctx,"DATE OF CERTIFICATION",BL_X,BL_BASE-22,12,"left",muted,500); cardGhost(ctx,dateStr,BL_X,BL_BASE,20,"left","rgba(255,255,255,0.95)",300);
  const BR_X=W-INSET-28,BR_BASE=H-INSET-28; cardGhost(ctx,"CERTIFIED BY",BR_X,BR_BASE-24,12,"right",muted,400); cardGhost(ctx,"touch grass",BR_X,BR_BASE,19,"right","rgba(255,255,255,0.95)",300);
  const topPct=getTopPercent(streak);
  if(topPct){const SCX=BR_X-55,SCY=BR_BASE-108; ctx.save(); ctx.strokeStyle=accent; ctx.lineWidth=1.4; ctx.shadowColor="rgba(0,0,0,0.70)"; ctx.shadowBlur=8; ctx.globalAlpha=0.90; ctx.beginPath(); ctx.arc(SCX,SCY,46,0,Math.PI*2); ctx.stroke(); ctx.restore(); cardGhost(ctx,`TOP ${topPct}%`,SCX,SCY-4,16,"center",accent,600); cardGhost(ctx,"grass touchers",SCX,SCY+18,15,"center","rgba(255,255,255,0.92)",700); ctx.save(); ctx.strokeStyle=accent; ctx.lineWidth=0.8; ctx.globalAlpha=0.55; [[-40,-5],[40,-5]].forEach(([ox,oy])=>{ctx.beginPath();ctx.moveTo(SCX+ox,SCY+oy-10);ctx.lineTo(SCX+ox,SCY+oy+10);ctx.stroke();}); ctx.restore();}
  try{const logo=await loadImgEl("/touchgrass-transparent.png"); ctx.save(); ctx.globalAlpha=0.60; ctx.drawImage(logo,BR_X-36,BR_BASE-72,36,36); ctx.restore();}catch{}
  return canvas.toDataURL("image/png");
}

// FORMAT 2: Instagram Story 1080x1920
async function renderStory(img, { streak, dateStr }) {
  const W=1080,H=1920; const canvas=document.createElement("canvas"); canvas.width=W; canvas.height=H; const ctx=canvas.getContext("2d");
  coverFill(ctx,img,0,0,W,H);
  const topG=ctx.createLinearGradient(0,0,0,H*0.35); topG.addColorStop(0,"rgba(0,0,0,0.72)"); topG.addColorStop(1,"rgba(0,0,0,0)"); ctx.fillStyle=topG; ctx.fillRect(0,0,W,H*0.35);
  const botG=ctx.createLinearGradient(0,H*0.68,0,H); botG.addColorStop(0,"rgba(0,0,0,0)"); botG.addColorStop(1,"rgba(0,0,0,0.75)"); ctx.fillStyle=botG; ctx.fillRect(0,H*0.68,W,H*0.32);
  const accent=cardAccent(streak),muted=cardMuted(streak),PAD=56;
  cardGhost(ctx,"PROOF OF GRASS",PAD,PAD+48,22,"left","rgba(255,255,255,0.95)",700); cardGhost(ctx,"Verified Outdoors",PAD,PAD+82,28,"left","rgba(255,255,255,0.88)",300);
  const TR_X=W-PAD; cardGhost(ctx,"DAY",TR_X,PAD+52,20,"right",muted,400);
  ctx.save(); ctx.textAlign="right"; ctx.font=`700 120px 'Helvetica Neue',Helvetica,Arial,sans-serif`; ctx.fillStyle=accent; ctx.shadowColor="rgba(0,0,0,0.9)"; ctx.shadowBlur=20; ctx.fillText(`${streak}`,TR_X,PAD+168); ctx.restore();
  const tl=cardTierLabel(streak); if(tl) cardGhost(ctx,`· ${tl} ·`,TR_X,PAD+198,18,"right",accent,400);
  ctx.strokeStyle="rgba(255,255,255,0.18)"; ctx.lineWidth=1; ctx.strokeRect(20,20,W-40,H-40);
  ctx.strokeStyle=streak>=50?"rgba(212,175,55,0.7)":"rgba(255,255,255,0.45)"; ctx.lineWidth=1.5;
  [[20,20,1,1],[W-20,20,-1,1],[20,H-20,1,-1],[W-20,H-20,-1,-1]].forEach(([cx,cy,sx,sy])=>{ctx.beginPath();ctx.moveTo(cx+sx*36,cy);ctx.lineTo(cx,cy);ctx.lineTo(cx,cy+sy*36);ctx.stroke();});
  cardGhost(ctx,"DATE OF CERTIFICATION",PAD,H-PAD-52,16,"left",muted,500); cardGhost(ctx,dateStr,PAD,H-PAD-20,22,"left","rgba(255,255,255,0.95)",300);
  cardGhost(ctx,"CERTIFIED BY",W-PAD,H-PAD-52,16,"right",muted,400); cardGhost(ctx,"touch grass",W-PAD,H-PAD-20,22,"right","rgba(255,255,255,0.95)",300);
  try{const logo=await loadImgEl("/touchgrass-transparent.png"); ctx.save(); ctx.globalAlpha=0.65; ctx.drawImage(logo,PAD-4,H-PAD-100,44,44); ctx.restore();}catch{}
  return canvas.toDataURL("image/png");
}

// FORMAT 3: Instagram Feed 1080x1350
async function renderFeed(img, { streak, dateStr }) {
  const W=1080,H=1350; const canvas=document.createElement("canvas"); canvas.width=W; canvas.height=H; const ctx=canvas.getContext("2d");
  const photoH=Math.round(H*0.72); coverFill(ctx,img,0,0,W,photoH);
  const fadeG=ctx.createLinearGradient(0,photoH*0.6,0,photoH); fadeG.addColorStop(0,"rgba(6,8,5,0)"); fadeG.addColorStop(1,"rgba(6,8,5,1)"); ctx.fillStyle=fadeG; ctx.fillRect(0,photoH*0.6,W,photoH*0.4);
  ctx.fillStyle="#060805"; ctx.fillRect(0,photoH,W,H-photoH);
  const topG=ctx.createLinearGradient(0,0,0,photoH*0.28); topG.addColorStop(0,"rgba(0,0,0,0.55)"); topG.addColorStop(1,"rgba(0,0,0,0)"); ctx.fillStyle=topG; ctx.fillRect(0,0,W,photoH*0.28);
  const accent=cardAccent(streak),muted=cardMuted(streak),PAD=52;
  cardGhost(ctx,"PROOF OF GRASS",PAD,PAD+40,18,"left","rgba(255,255,255,0.95)",700); cardGhost(ctx,"verified outdoors",PAD,PAD+68,22,"left","rgba(255,255,255,0.85)",300);
  const TR_X=W-PAD; cardGhost(ctx,"STREAK",TR_X,PAD+40,13,"right",muted,500);
  ctx.save(); ctx.textAlign="right"; ctx.font=`300 96px 'Helvetica Neue',Helvetica,Arial,sans-serif`; ctx.fillStyle="rgba(255,255,255,0.95)"; ctx.shadowColor="rgba(0,0,0,0.9)"; ctx.shadowBlur=16; ctx.fillText("DAY",TR_X-ctx.measureText(` ${streak}`).width,PAD+136); ctx.fillStyle=accent; ctx.font=`400 96px 'Helvetica Neue',Helvetica,Arial,sans-serif`; ctx.fillText(` ${streak}`,TR_X,PAD+136); ctx.restore();
  const tl=cardTierLabel(streak); if(tl) cardGhost(ctx,`· ${tl} ·`,TR_X,PAD+164,14,"right",accent,400);
  const LOWER_TOP=photoH+40;
  const divG=ctx.createLinearGradient(PAD,0,W-PAD,0); divG.addColorStop(0,"transparent"); divG.addColorStop(0.5,streak>=50?"rgba(212,175,55,0.4)":"rgba(147,168,90,0.35)"); divG.addColorStop(1,"transparent"); ctx.strokeStyle=divG; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(PAD,LOWER_TOP-10); ctx.lineTo(W-PAD,LOWER_TOP-10); ctx.stroke();
  cardGhost(ctx,"DATE OF CERTIFICATION",PAD,LOWER_TOP+32,13,"left",muted,500); cardGhost(ctx,dateStr,PAD,LOWER_TOP+62,22,"left","rgba(255,255,255,0.95)",300);
  cardGhost(ctx,"CERTIFIED BY",W-PAD,LOWER_TOP+32,13,"right",muted,400); cardGhost(ctx,"touch grass",W-PAD,LOWER_TOP+62,22,"right","rgba(255,255,255,0.95)",300);
  const topPct=getTopPercent(streak); if(topPct){const SCX=W/2,SCY=LOWER_TOP+130; ctx.save(); ctx.strokeStyle=accent; ctx.lineWidth=1.2; ctx.shadowColor="rgba(0,0,0,0.6)"; ctx.shadowBlur=8; ctx.globalAlpha=0.85; ctx.beginPath(); ctx.arc(SCX,SCY,42,0,Math.PI*2); ctx.stroke(); ctx.restore(); cardGhost(ctx,`TOP ${topPct}%`,SCX,SCY-2,15,"center",accent,600); cardGhost(ctx,"grass touchers",SCX,SCY+18,14,"center","rgba(255,255,255,0.9)",700);}
  try{const logo=await loadImgEl("/touchgrass-transparent.png"); ctx.save(); ctx.globalAlpha=0.55; ctx.drawImage(logo,PAD-4,LOWER_TOP+16,38,38); ctx.restore();}catch{}
  ctx.strokeStyle="rgba(255,255,255,0.12)"; ctx.lineWidth=1; ctx.strokeRect(16,16,W-32,H-32);
  return canvas.toDataURL("image/png");
}

// FORMAT 4: Square 1080x1080 — Telegram, Discord, Facebook
async function renderSquare(img, { streak, dateStr }) {
  const W=1080,H=1080; const canvas=document.createElement("canvas"); canvas.width=W; canvas.height=H; const ctx=canvas.getContext("2d");
  coverFill(ctx,img,0,0,W,H);
  const topG=ctx.createLinearGradient(0,0,0,H*0.32); topG.addColorStop(0,"rgba(0,0,0,0.6)"); topG.addColorStop(1,"rgba(0,0,0,0)"); ctx.fillStyle=topG; ctx.fillRect(0,0,W,H*0.32);
  const botG=ctx.createLinearGradient(0,H*0.65,0,H); botG.addColorStop(0,"rgba(0,0,0,0)"); botG.addColorStop(1,"rgba(0,0,0,0.72)"); ctx.fillStyle=botG; ctx.fillRect(0,H*0.65,W,H*0.35);
  const accent=cardAccent(streak),muted=cardMuted(streak),PAD=48;
  cardGhost(ctx,"PROOF OF GRASS",PAD,PAD+42,18,"left","rgba(255,255,255,0.95)",700); cardGhost(ctx,"verified outdoors",PAD,PAD+68,21,"left","rgba(255,255,255,0.85)",300);
  const TR_X=W-PAD; cardGhost(ctx,"STREAK",TR_X,PAD+42,13,"right",muted,500);
  ctx.save(); ctx.textAlign="right"; ctx.font=`300 86px 'Helvetica Neue',Helvetica,Arial,sans-serif`; ctx.fillStyle="rgba(255,255,255,0.95)"; ctx.shadowColor="rgba(0,0,0,0.9)"; ctx.shadowBlur=14; ctx.fillText("DAY",TR_X-ctx.measureText(` ${streak}`).width,PAD+130); ctx.fillStyle=accent; ctx.font=`400 86px 'Helvetica Neue',Helvetica,Arial,sans-serif`; ctx.fillText(` ${streak}`,TR_X,PAD+130); ctx.restore();
  const tl=cardTierLabel(streak); if(tl) cardGhost(ctx,`· ${tl} ·`,TR_X,PAD+156,14,"right",accent,400);
  ctx.strokeStyle="rgba(255,255,255,0.18)"; ctx.lineWidth=0.8; ctx.strokeRect(18,18,W-36,H-36);
  ctx.strokeStyle=streak>=50?"rgba(212,175,55,0.75)":"rgba(255,255,255,0.5)"; ctx.lineWidth=1.2;
  [[18,18,1,1],[W-18,18,-1,1],[18,H-18,1,-1],[W-18,H-18,-1,-1]].forEach(([cx,cy,sx,sy])=>{ctx.beginPath();ctx.moveTo(cx+sx*28,cy);ctx.lineTo(cx,cy);ctx.lineTo(cx,cy+sy*28);ctx.stroke();});
  const BL_X=PAD,BR_X=W-PAD,BASE=H-PAD-24;
  cardGhost(ctx,"DATE OF CERTIFICATION",BL_X,BASE-22,12,"left",muted,500); cardGhost(ctx,dateStr,BL_X,BASE,19,"left","rgba(255,255,255,0.95)",300);
  cardGhost(ctx,"CERTIFIED BY",BR_X,BASE-22,12,"right",muted,400); cardGhost(ctx,"touch grass",BR_X,BASE,19,"right","rgba(255,255,255,0.95)",300);
  const topPct=getTopPercent(streak); if(topPct){const SCX=BR_X-50,SCY=BASE-108; ctx.save(); ctx.strokeStyle=accent; ctx.lineWidth=1.3; ctx.shadowColor="rgba(0,0,0,0.7)"; ctx.shadowBlur=8; ctx.globalAlpha=0.88; ctx.beginPath(); ctx.arc(SCX,SCY,42,0,Math.PI*2); ctx.stroke(); ctx.restore(); cardGhost(ctx,`TOP ${topPct}%`,SCX,SCY-2,14,"center",accent,600); cardGhost(ctx,"grass touchers",SCX,SCY+16,13,"center","rgba(255,255,255,0.9)",700);}
  try{const logo=await loadImgEl("/touchgrass-transparent.png"); ctx.save(); ctx.globalAlpha=0.6; ctx.drawImage(logo,BR_X-36,BASE-68,34,34); ctx.restore();}catch{}
  return canvas.toDataURL("image/png");
}

async function generateAllCards(imageSrc, { streak, dateStr }) {
  const img = await loadImgEl(imageSrc);
  const [landscape, story, feed, square] = await Promise.all([
    renderLandscape(img, { streak, dateStr }),
    renderStory(img, { streak, dateStr }),
    renderFeed(img, { streak, dateStr }),
    renderSquare(img, { streak, dateStr }),
  ]);
  return { landscape, story, feed, square };
}

// ─── Supabase Storage helpers ─────────────────────────────────────────────────

async function dataUrlToBlob(dataUrl) {
  const res = await fetch(dataUrl);
  return res.blob();
}

async function uploadCard(dataUrl, username, submissionId, format) {
  const blob = await dataUrlToBlob(dataUrl);
  const path = `${username}/${submissionId}/${format}.png`;
  const { error } = await supabase.storage.from("proof-cards").upload(path, blob, { contentType:"image/png", upsert:true });
  if (error) throw error;
  const { data } = supabase.storage.from("proof-cards").getPublicUrl(path);
  return data.publicUrl;
}

async function uploadAllCards(cards, username, submissionId) {
  const [landscapeUrl, storyUrl, feedUrl, squareUrl] = await Promise.all([
    uploadCard(cards.landscape, username, submissionId, "landscape"),
    uploadCard(cards.story,     username, submissionId, "story"),
    uploadCard(cards.feed,      username, submissionId, "feed"),
    uploadCard(cards.square,    username, submissionId, "square"),
  ]);
  return { landscapeUrl, storyUrl, feedUrl, squareUrl };
}

async function saveUrlsToSubmission(submissionId, urls) {
  const { error } = await supabase.from("Submissions").update({
    proof_landscape_url: urls.landscapeUrl,
    proof_story_url:     urls.storyUrl,
    proof_feed_url:      urls.feedUrl,
    proof_square_url:    urls.squareUrl,
  }).eq("id", submissionId);
  if (error) console.error("[proof-cards] failed to save URLs:", error.message);
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ResultCard({ imageSrc, username, initialStreak = 1, onStreakUpdate, hasPremiumProofs = false }) {
  const canvasRef = useRef(null);
  const [downloadUrl, setDownloadUrl] = useState(null);
  const sharableFileRef = useRef(null);
  const [caption, setCaption] = useState(() => pickCaption(initialStreak, null));
  const [copied, setCopied] = useState(false);
  const [currentStreak, setCurrentStreak] = useState(initialStreak);

  // ── NEW: 4-format card state ──────────────────────────────────────────────
  const [cards, setCards] = useState(null);
  const [cardUrls, setCardUrls] = useState(null);
  const [cardsGenerating, setCardsGenerating] = useState(false);
  const [cardsReady, setCardsReady] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [shareStatus, setShareStatus] = useState({});

  useEffect(() => {
    setCurrentStreak(initialStreak);
    setCaption((prev) => pickCaption(initialStreak, prev));
  }, [initialStreak]);

  const [tweetUrl, setTweetUrl] = useState("");
  const [submitStatus, setSubmitStatus] = useState(null);
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
  const buildTags = () => `${TAGS}\n${HANDLE} · proofofgrass.app`;

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(`${caption}\n\nDay ${currentStreak} · proof of grass 🌿\n\n${TAGS}\n${HANDLE} · proofofgrass.app`).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    });
  }, [caption, currentStreak]);

  const [shared, setShared] = useState(false);
  const [shareHint, setShareHint] = useState(false);

  const buildShareText = useCallback(() =>
    `${caption}\n\nDay ${currentStreak} · proof of grass 🌿\n\n${TAGS}\n${HANDLE} · proofofgrass.app`,
  [caption, currentStreak]);

  // ── NEW: generate + upload all 4 cards after successful submission ────────
  const generateAndUploadCards = useCallback(async (submissionId, streak, dStr) => {
    if (!imageSrc || !submissionId) return;
    setCardsGenerating(true);
    try {
      const generated = await generateAllCards(imageSrc, { streak, dateStr: dStr });
      setCards(generated);
      setDownloadUrl(generated.landscape);
      const urls = await uploadAllCards(generated, username, submissionId);
      setCardUrls(urls);
      await saveUrlsToSubmission(submissionId, urls);
      setCardsReady(true);
    } catch(e) {
      console.error("[proof-cards] pipeline error:", e?.message);
      setCardsReady(true); // still allow sharing from data URLs
    }
    setCardsGenerating(false);
  }, [imageSrc, username]);

  const lockInStreak = useCallback(async () => {
    if (!username) return;
    setSubmitStatus("loading");
    setSubmitError("");
    try {
      const locationPayload = locationMode === "gps"
        ? { p_location_lat_rounded:gpsLat, p_location_lng_rounded:gpsLng, p_location_label:"Nearby Region", p_location_source:"gps" }
        : locationMode === "manual" && locationCity.trim()
        ? { p_location_city:locationCity.trim()||null, p_location_region:locationRegion.trim()||null,
            p_location_country:locationCountry.trim()||null,
            p_location_label:[locationCity.trim(),locationRegion.trim()].filter(Boolean).join(", ")||null,
            p_location_source:"manual" }
        : { p_location_source:"none" };

      const { data: result, error: rpcError } = await supabase.rpc("lock_in_streak", {
        p_username: username, p_tweet_url: null, p_verification: "self_attested",
        ...locationPayload,
      });

      if (rpcError) { console.error("lock_in_streak RPC error", rpcError); setSubmitError("Streak log failed — tap again."); setSubmitStatus("error"); return; }

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

  const handleShareAndSubmit = useCallback(async () => {
    if (!downloadUrl) return;
    const text = buildShareText();
    const isMobile = typeof navigator !== "undefined" && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const canShareFiles = !isInAppBrowser && isMobile && typeof navigator.share === "function" && typeof navigator.canShare === "function";
    let cancelled = false;

    if (isInAppBrowser) { await lockInStreak(); setInAppBrowserMode(true); return; }

    if (canShareFiles) {
      let file = sharableFileRef.current;
      if (!file && downloadUrl.startsWith("data:")) {
        try { const res = await fetch(downloadUrl); const blob = await res.blob(); file = new File([blob], "proof-of-grass.png", { type:"image/png" }); sharableFileRef.current = file; } catch(e) { file = null; }
      }
      if (file && navigator.canShare({ files:[file] })) {
        setShareHint(true);
        try {
          await navigator.share({ files:[file], text });
          setShared(true); setTimeout(() => { setShared(false); setShareHint(false); }, 4000);
        } catch(err) {
          setShareHint(false);
          if (err?.name === "AbortError") { cancelled = true; }
          else { navigator.clipboard.writeText(text).catch(()=>{}); window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`,"_blank"); setShared(true); setTimeout(() => setShared(false), 2500); }
        }
      } else { navigator.clipboard.writeText(text).catch(()=>{}); window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`,"_blank"); setShared(true); setTimeout(() => setShared(false), 2500); }
    } else { navigator.clipboard.writeText(text).catch(()=>{}); window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`,"_blank"); setShared(true); setTimeout(() => setShared(false), 2500); }

    if (!cancelled) await lockInStreak();
  }, [downloadUrl, buildShareText, lockInStreak, isInAppBrowser]);

  const handleShareAndPost = handleShareAndSubmit;

  const handleSubmit = useCallback(async () => {
    if (!username) { setSubmitError("No username found. Please refresh and try again."); setSubmitStatus("error"); return; }
    if (tweetUrl.trim() && !isValidXStatusUrl(tweetUrl)) { setSubmitError("That doesn't look like a valid X post link. You can leave it blank for now."); setSubmitStatus("error"); return; }
    setSubmitStatus("loading"); setSubmitError("");
    const { data: result, error: rpcError } = await supabase.rpc("lock_in_streak", { p_username:username, p_tweet_url:tweetUrl.trim()||null, p_verification:"self_attested" });
    if (rpcError) { console.error("lock_in_streak RPC failed", rpcError); setSubmitError("Something went wrong. Try again."); setSubmitStatus("error"); return; }
    if (result?.status === "already_submitted") { setSubmitError("You've already submitted today. Come back tomorrow. 🌿"); setSubmitStatus("error"); return; }
    if (result?.status !== "success") { setSubmitError("Unexpected response. Try again."); setSubmitStatus("error"); return; }
    const newStreak = result.current_streak ?? currentStreak;
    setCurrentStreak(newStreak); onStreakUpdate?.(newStreak); setSubmitStatus("success"); setTweetUrl("");
    if (result?.lucky_touch?.triggered) setLuckyTouch(result.lucky_touch);
  }, [username, tweetUrl, currentStreak, onStreakUpdate]);

  // ── NEW: Instagram share — uses feed format, no streak lock ──────────────
  const shareToInstagram = useCallback(async () => {
    const dataUrl = cards?.feed || downloadUrl;
    if (!dataUrl) return;
    const igCaption = `${caption}\n\nDay ${currentStreak} · proof of grass 🌿\n\n${TAGS}\n${HANDLE} · proofofgrass.app`;
    const isMob = typeof navigator !== "undefined" && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    try { await navigator.clipboard.writeText(igCaption); setIgCopied(true); setTimeout(() => setIgCopied(false), 4000); } catch {}
    if (isMob && typeof navigator.share === "function" && typeof navigator.canShare === "function") {
      try {
        const blob = await dataUrlToBlob(dataUrl);
        const file = new File([blob], "proof-of-grass-feed.png", { type:"image/png" });
        if (navigator.canShare({ files:[file] })) { await navigator.share({ files:[file] }); return; }
      } catch(e) { if (e?.name === "AbortError") return; }
      const link = document.createElement("a"); link.download = "proof-of-grass-feed.png"; link.href = dataUrl; link.click();
    } else {
      const link = document.createElement("a"); link.download = "proof-of-grass-feed.png"; link.href = dataUrl; link.click();
      setIgDesktop(true); setTimeout(() => setIgDesktop(false), 6000);
    }
  }, [cards, downloadUrl, caption, currentStreak]);

  // ── NEW: platform share for drawer — no streak lock ───────────────────────
  const handlePlatformShare = useCallback(async (platform) => {
    setShareStatus(s => ({ ...s, [platform]:"sharing" }));
    const text = buildShareText();
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent ?? "");
    const formatMap = {
      "ig-story": { dataUrl:cards?.story,  filename:"proof-story.png"  },
      "ig-feed":  { dataUrl:cards?.feed,   filename:"proof-feed.png"   },
      "telegram": { dataUrl:cards?.square, filename:"proof-square.png" },
      "discord":  { dataUrl:cards?.square, filename:"proof-square.png" },
    };
    const { dataUrl, filename } = formatMap[platform] ?? {};
    if (!dataUrl) { setShareStatus(s => ({ ...s, [platform]:null })); return; }
    try { await navigator.clipboard.writeText(text); } catch {}
    if (isMobile && typeof navigator.share === "function" && typeof navigator.canShare === "function") {
      try {
        const blob = await dataUrlToBlob(dataUrl);
        const file = new File([blob], filename, { type:"image/png" });
        if (navigator.canShare({ files:[file] })) {
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
  }, [cards, buildShareText]);

  // ── NEW: download all 4 ───────────────────────────────────────────────────
  const handleDownloadAll = useCallback(() => {
    if (!cards) return;
    [["landscape","proof-landscape.png"],["story","proof-story.png"],["feed","proof-feed.png"],["square","proof-square.png"]].forEach(([key,name]) => {
      if (!cards[key]) return; const a=document.createElement("a"); a.href=cards[key]; a.download=name; a.click();
    });
  }, [cards]);

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

      const vTop = ctx.createLinearGradient(0, 0, 0, H * 0.28);
      vTop.addColorStop(0, "rgba(0,0,0,0.52)"); vTop.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = vTop; ctx.fillRect(0, 0, W, H * 0.28);
      const vBot = ctx.createLinearGradient(0, H * 0.72, 0, H);
      vBot.addColorStop(0, "rgba(0,0,0,0)"); vBot.addColorStop(1, "rgba(0,0,0,0.58)");
      ctx.fillStyle = vBot; ctx.fillRect(0, H * 0.72, W, H * 0.28);
      const vLeft = ctx.createLinearGradient(0, 0, W * 0.18, 0);
      vLeft.addColorStop(0, "rgba(0,0,0,0.28)"); vLeft.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = vLeft; ctx.fillRect(0, 0, W * 0.18, H);
      const vRight = ctx.createLinearGradient(W * 0.82, 0, W, 0);
      vRight.addColorStop(0, "rgba(0,0,0,0)"); vRight.addColorStop(1, "rgba(0,0,0,0.32)");
      ctx.fillStyle = vRight; ctx.fillRect(W * 0.82, 0, W * 0.18, H);

      // ── Theme (must be declared before any theme.* usage) ───────────────
      const theme          = THEMES[selectedTheme] || THEMES.classic;
      const defaultAccent  = currentStreak >= 50 ? "rgba(212,175,55,1.0)"  : "rgba(160,230,160,1.0)";
      const defaultMuted   = currentStreak >= 50 ? "rgba(212,175,55,0.80)" : "rgba(255,255,255,0.70)";
      const accentText     = theme.accent || defaultAccent;
      const mutedText      = theme.muted  || defaultMuted;

      // Theme overlay tint (applied over photo, under text)
      if (theme.bgOverlay) {
        ctx.fillStyle = theme.bgOverlay;
        ctx.fillRect(0, 0, W, H);
      }

      const INSET = 22;
      const defaultBorder  = currentStreak >= 50 ? "rgba(212,175,55,0.55)" : "rgba(255,255,255,0.22)";
      const defaultBracket = currentStreak >= 50 ? "rgba(212,175,55,0.80)" : "rgba(255,255,255,0.55)";
      ctx.strokeStyle = theme.border  || defaultBorder;
      ctx.lineWidth = 0.8; ctx.strokeRect(INSET, INSET, W - INSET * 2, H - INSET * 2);
      const bracketLen = 28, bGap = INSET;
      ctx.strokeStyle = theme.bracket || defaultBracket;
      ctx.lineWidth = 1.2;
      [[bGap,bGap,1,1],[W-bGap,bGap,-1,1],[bGap,H-bGap,1,-1],[W-bGap,H-bGap,-1,-1]].forEach(([cx,cy,sx,sy]) => {
        ctx.beginPath(); ctx.moveTo(cx+sx*bracketLen,cy); ctx.lineTo(cx,cy); ctx.lineTo(cx,cy+sy*bracketLen); ctx.stroke();
      });

      const ghost = (text, x, y, size, align="left", col="rgba(255,255,255,0.90)", font="400") => {
        ctx.save(); ctx.font=`${font} ${size}px 'Helvetica Neue',Helvetica,Arial,sans-serif`; ctx.fillStyle=col; ctx.textAlign=align;
        ctx.letterSpacing="0.10em"; ctx.shadowColor="rgba(0,0,0,0.80)"; ctx.shadowBlur=8; ctx.shadowOffsetX=0; ctx.shadowOffsetY=1;
        ctx.fillText(text, x, y); ctx.restore();
      };

      const TL_X = INSET+22, TL_Y = INSET+44;
      ghost("PROOF OF GRASS", TL_X, TL_Y, 16, "left", "rgba(255,255,255,0.95)", "600");
      ghost("verified outdoors", TL_X, TL_Y+22, 20, "left", "rgba(255,255,255,0.88)", "700");
      ctx.strokeStyle = "rgba(255,255,255,0.25)"; ctx.lineWidth = 0.6;
      ctx.beginPath(); ctx.moveTo(TL_X, TL_Y+32); ctx.lineTo(TL_X+160, TL_Y+32); ctx.stroke();

      const TR_X = W-INSET-28, TR_Y = INSET+44;
      ghost("STREAK", TR_X, TR_Y, 13, "right", mutedText, "500");
      ctx.save(); ctx.shadowColor="rgba(0,0,0,0.90)"; ctx.shadowBlur=14; ctx.textAlign="right"; ctx.letterSpacing="-0.01em";
      const dayStr = "DAY", numStr = ` ${currentStreak}`;
      ctx.font=`300 88px 'Helvetica Neue',Helvetica,Arial,sans-serif`; ctx.fillStyle="rgba(255,255,255,0.95)";
      ctx.fillText(dayStr, TR_X-ctx.measureText(numStr).width, TR_Y+92);
      ctx.fillStyle=accentText; ctx.font=`400 88px 'Helvetica Neue',Helvetica,Arial,sans-serif`;
      ctx.fillText(numStr, TR_X, TR_Y+92); ctx.restore();

      if (currentStreak >= 7) {
        const tierLabel = currentStreak>=180?"MYTHIC":currentStreak>=100?"IMMORTAL":currentStreak>=50?"LEGENDARY":currentStreak>=30?"ELITE":currentStreak>=14?"LOCKED IN":"ROOTED";
        ghost(`· ${tierLabel} ·`, TR_X, TR_Y+118, 14, "right", accentText, "400");
      }

      ctx.save(); ctx.translate(INSET+16, H*0.72); ctx.rotate(-Math.PI/2);
      ctx.font="300 12px 'Helvetica Neue',Helvetica,Arial,sans-serif"; ctx.fillStyle="rgba(255,255,255,0.40)";
      ctx.shadowColor="rgba(0,0,0,0.70)"; ctx.shadowBlur=5; ctx.letterSpacing="0.18em"; ctx.textAlign="center";
      ctx.fillText("KEEP GOING.  LIVE BETTER.  TOUCH MORE.", 0, 0); ctx.restore();

      ctx.save(); ctx.translate(W-INSET-16, H*0.42); ctx.rotate(Math.PI/2);
      ctx.font="300 12px 'Helvetica Neue',Helvetica,Arial,sans-serif"; ctx.fillStyle="rgba(255,255,255,0.35)";
      ctx.shadowColor="rgba(0,0,0,0.70)"; ctx.shadowBlur=5; ctx.letterSpacing="0.18em"; ctx.textAlign="center";
      ctx.fillText("REAL MOMENTS.  REAL LIFE.", 0, 0); ctx.restore();

      const BL_X = INSET+22, BL_BASE = H-INSET-28;
      ghost("DATE OF CERTIFICATION", BL_X, BL_BASE-22, 12, "left", mutedText, "500");
      ghost(dateStr, BL_X, BL_BASE, 20, "left", "rgba(255,255,255,0.95)", "300");
      const BR_X = W-INSET-28, BR_BASE = H-INSET-28;
      ghost("CERTIFIED BY", BR_X, BR_BASE-24, 12, "right", mutedText, "400");
      ghost("touch grass", BR_X, BR_BASE, 19, "right", "rgba(255,255,255,0.95)", "300");

      const topPct = getTopPercent(currentStreak);
      if (topPct !== null) {
        const SEAL_CX = BR_X-55, SEAL_Y = BR_BASE-108;
        ctx.save(); ctx.strokeStyle=accentText; ctx.lineWidth=1.4; ctx.shadowColor="rgba(0,0,0,0.70)"; ctx.shadowBlur=8; ctx.globalAlpha=0.90;
        ctx.beginPath(); ctx.arc(SEAL_CX, SEAL_Y, 46, 0, Math.PI*2); ctx.stroke(); ctx.restore();
        ghost(`TOP ${topPct}%`, SEAL_CX, SEAL_Y-4, 16, "center", accentText, "600");
        ghost("grass touchers", SEAL_CX, SEAL_Y+18, 15, "center", "rgba(255,255,255,0.92)", "700");
        ctx.save(); ctx.strokeStyle=accentText; ctx.lineWidth=0.8; ctx.globalAlpha=0.55;
        [[-40,-5],[40,-5]].forEach(([ox,oy]) => { ctx.beginPath(); ctx.moveTo(SEAL_CX+ox,SEAL_Y+oy-10); ctx.lineTo(SEAL_CX+ox,SEAL_Y+oy+10); ctx.stroke(); });
        ctx.restore();
      }

      const logo = new Image();
      const cacheForPreview = (dataUrl) => {
        setDownloadUrl(dataUrl);
        try { fetch(dataUrl).then(r=>r.blob()).then(blob => { sharableFileRef.current = new File([blob],"proof-of-grass.png",{type:"image/png"}); }); }
        catch(e) { console.warn("[photo] preview cache failed:", e?.message); }
      };
      logo.onload = () => { ctx.save(); ctx.globalAlpha=0.60; ctx.drawImage(logo, BR_X-36, BR_BASE-72, 36, 36); ctx.restore(); cacheForPreview(canvas.toDataURL("image/png")); };
      logo.onerror = () => cacheForPreview(canvas.toDataURL("image/png"));
      logo.src = "/touchgrass-transparent.png";
    } catch(canvasErr) {
      console.error("[canvas] render error:", canvasErr?.message, canvasErr);
      // Still try to produce a preview even if something failed
      try { setDownloadUrl(canvas.toDataURL("image/png")); } catch {}
    }};
    img.src = imageSrc;
  }, [imageSrc, dateStr, currentStreak, selectedTheme]);

  const SHARE_OPTIONS = [
    { id:"x",        label:"X",               icon:"𝕏",  sub:"Landscape 16:9 · best for feeds", locksStreak:true  },
    { id:"ig-story", label:"Instagram Story", icon:"📸", sub:"Story 9:16 · full screen",         locksStreak:false },
    { id:"ig-feed",  label:"Instagram Feed",  icon:"📷", sub:"Feed 4:5 · optimized",             locksStreak:false },
    { id:"telegram", label:"Telegram",        icon:"💬", sub:"Square 1:1 · clean format",        locksStreak:false },
    { id:"discord",  label:"Discord",         icon:"🎮", sub:"Square 1:1 · server ready",        locksStreak:false },
  ];

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
        {cardsGenerating && (
          <div style={{display:"flex",alignItems:"center",gap:7,marginTop:8,fontFamily:"monospace",fontSize:11,color:"rgba(147,168,90,0.55)",letterSpacing:"0.08em"}}>
            <span style={{animation:"spin 1.2s linear infinite",display:"inline-block"}}>◌</span>
            generating share cards for all platforms…
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        )}
        {cardsReady && !cardsGenerating && submitStatus==="success" && (
          <div style={{fontSize:11,fontFamily:"monospace",color:"rgba(147,168,90,0.55)",letterSpacing:"0.08em",marginTop:8}}>✓ all 4 share cards ready</div>
        )}
      </div>

      {downloadUrl && (
        <a href={downloadUrl} download="proof-of-grass.png"
          onClick={()=>{ if (submitStatus!=="success") lockInStreak(); }}
          style={{display:"inline-flex",alignItems:"center",gap:10,padding:"12px 32px",fontFamily:"monospace",fontSize:13,fontWeight:700,letterSpacing:"0.15em",textTransform:"uppercase",color:"#0e1108",background:"#93a85a",borderRadius:3,textDecoration:"none",boxShadow:"0 0 20px rgba(147,168,90,0.3)"}}>
          ↓ Download Certificate
        </a>
      )}

      {isInAppBrowser && !inAppBrowserMode && downloadUrl && (
        <div style={{background:"rgba(200,168,75,0.08)",border:"1px solid rgba(200,168,75,0.4)",borderRadius:10,padding:"14px 16px",fontSize:12,color:"#c8a84b",lineHeight:1.6,width:"100%"}}>
          <div style={{fontWeight:700,marginBottom:4}}>⚠ You're in the X in-app browser</div>
          <div style={{fontSize:11,color:"rgba(200,168,75,0.7)"}}>Tap <b>···</b> → <b>Open in browser</b> to share with your image.</div>
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

      {/* Share to X + lock in streak */}
      {downloadUrl && !inAppBrowserMode && (
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:8,width:"100%"}}>
          <button onClick={handleShareAndSubmit} disabled={submitStatus==="loading"||submitStatus==="success"}
            style={{display:"inline-flex",alignItems:"center",gap:10,padding:"13px 32px",width:"100%",justifyContent:"center",fontFamily:"monospace",fontSize:13,fontWeight:700,letterSpacing:"0.15em",textTransform:"uppercase",borderRadius:3,cursor:"pointer",border:"1px solid #93a85a",background:submitStatus==="success"?"#2a3018":submitStatus==="loading"?"#1e2410":"transparent",color:"#93a85a",opacity:submitStatus==="loading"||submitStatus==="success"?0.7:1}}>
            {submitStatus==="loading"?"posting…":submitStatus==="success"?"✓ streak locked in":"📤 share to x + lock in streak"}
          </button>
          {shareHint && <p style={{fontFamily:"monospace",fontSize:11,color:"#93a85a",letterSpacing:"0.08em",margin:0}}>select x, then tap post</p>}
          {!shareHint && submitStatus!=="success" && (
            <p style={{fontFamily:"monospace",fontSize:11,color:"rgba(147,168,90,0.45)",textAlign:"center",letterSpacing:"0.06em",margin:0,lineHeight:1.6}}>
              {isInAppBrowser?"tap ··· → open in browser to share with image":"opens X with your caption · save & attach your certificate image"}
            </p>
          )}
          {submitStatus==="error" && submitError && <p style={{fontFamily:"monospace",fontSize:10,color:"#ef4444",textAlign:"center",margin:0}}>{submitError}</p>}
        </div>
      )}

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
          ··· more platforms {cardsGenerating&&<span style={{fontSize:10,opacity:0.6}}>(generating…)</span>}
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
                const disabled = !isX && !cardsReady;
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
              <button onClick={handleDownloadAll} disabled={!cardsReady}
                style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,padding:"13px 16px",borderRadius:12,cursor:cardsReady?"pointer":"default",border:"1px solid rgba(147,168,90,0.18)",background:"rgba(147,168,90,0.05)",opacity:cardsReady?1:0.38,marginTop:4,width:"100%"}}>
                <span style={{fontFamily:"monospace",fontSize:12,color:"#93a85a",letterSpacing:"0.1em",fontWeight:600}}>⬇ Download All 4 Formats</span>
              </button>
            </div>
            {!cardsReady && <p style={{fontFamily:"monospace",fontSize:10,color:"rgba(147,168,90,0.38)",textAlign:"center",marginTop:14,letterSpacing:"0.06em"}}>{cardsGenerating?"⟳ generating cards…":"lock in your streak to generate share cards"}</p>}
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