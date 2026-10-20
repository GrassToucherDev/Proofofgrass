// scripts/process-wago-claims.mjs
// Run with: node scripts/process-wago-claims.mjs
// Requires env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, TREASURY_WALLET_PRIVATE_KEY
// Optional: SOLANA_RPC_URL (use a devnet URL to test), WAGO_MAX_SOL_PER_CLAIM (default 1),
//           DRY_RUN=1 (print what would be sent, send nothing, change nothing)
// Pays "spl_token" rewards (any mint) and "sol" (native SOL) rewards.

import { createClient } from "@supabase/supabase-js";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
  clusterApiUrl,
} from "@solana/web3.js";
import {
  getOrCreateAssociatedTokenAccount,
  getMint,
  transfer,
} from "@solana/spl-token";
import bs58 from "bs58";
import { payoutEligibility, solToLamports, maxSolPerClaim, RENT_EXEMPT_MIN_LAMPORTS } from "../utils/wagoPayout.mjs";
import "dotenv/config";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const connection = new Connection(
  process.env.SOLANA_RPC_URL || clusterApiUrl("mainnet-beta"),
  "confirmed"
);

const treasuryKeypair = Keypair.fromSecretKey(
  bs58.decode(process.env.TREASURY_WALLET_PRIVATE_KEY)
);

console.log("Treasury wallet:", treasuryKeypair.publicKey.toBase58());
if (DRY_RUN) console.log("DRY RUN: nothing will be sent or changed.");

const DRY_RUN = process.env.DRY_RUN === "1";
const SOL_CAP = maxSolPerClaim(process.env);
const TX_FEE_BUFFER_LAMPORTS = 10_000;           // covers the network fee with headroom
const TREASURY_RESERVE_LAMPORTS = 5_000_000;     // always leave 0.005 SOL in the treasury

// Returns { hold: "reason" } if the payout must not be attempted (claim stays pending), else { ok: true }.
async function checkSol(wallet, amount) {
  const lamports = solToLamports(amount);
  if (lamports == null) return { hold: `Invalid SOL amount: ${amount}` };
  if (Number(amount) > SOL_CAP) return { hold: `Over the ${SOL_CAP} SOL per-claim limit (raise WAGO_MAX_SOL_PER_CLAIM if intended)` };
  const [treasuryBal, recipientBal] = await Promise.all([
    connection.getBalance(treasuryKeypair.publicKey),
    connection.getBalance(new PublicKey(wallet)),
  ]);
  if (treasuryBal < lamports + TX_FEE_BUFFER_LAMPORTS + TREASURY_RESERVE_LAMPORTS) {
    return { hold: `Treasury has ${(treasuryBal / 1e9).toFixed(4)} SOL, not enough for this payout` };
  }
  if (recipientBal === 0 && lamports < RENT_EXEMPT_MIN_LAMPORTS) {
    return { hold: "Amount is too small to open a brand-new wallet (needs ~0.00089 SOL)" };
  }
  return { ok: true, lamports };
}

async function sendSol(wallet, lamports) {
  const tx = new Transaction().add(SystemProgram.transfer({
    fromPubkey: treasuryKeypair.publicKey,
    toPubkey: new PublicKey(wallet),
    lamports,
  }));
  return sendAndConfirmTransaction(connection, tx, [treasuryKeypair], { commitment: "confirmed" });
}


async function processClaims() {
  // Fetch all pending claims
  const { data: claims, error } = await supabase
    .from("wago_drop_claims")
    .select("*")
    .eq("status", "pending")
    .order("claimed_at", { ascending: true });

  if (error) {
    console.error("Failed to fetch claims:", error.message);
    process.exit(1);
  }

  if (!claims?.length) {
    console.log("No pending claims.");
    return;
  }

  console.log(`Processing ${claims.length} pending claim(s)...`);

  for (const claim of claims) {
    // Verified wallets only: hold anything whose wallet hasn't proven ownership.
    const { data: account } = await supabase
      .from("wago_google_accounts")
      .select("linked_wallet, wallet_verified")
      .eq("google_id", claim.google_id)
      .maybeSingle();
    const gate = payoutEligibility(claim, account);
    if (!gate.eligible) {
      console.log(`\nClaim ${claim.id} — HELD: ${gate.reason}`);
      continue;
    }

    console.log(`\nClaim ${claim.id} — wallet: ${claim.wallet_address}, amount: ${claim.reward_amount} ${claim.reward_token_mint}`);

    let txSig = null;
    try {
      if (claim.reward_type === "sol") {
        const chk = await checkSol(claim.wallet_address, claim.reward_amount);
        if (chk.hold) { console.log(`  HELD: ${chk.hold}`); continue; }
        if (DRY_RUN) { console.log(`  [dry run] would send ${claim.reward_amount} SOL`); continue; }
        console.log(`  Sending ${claim.reward_amount} SOL (${chk.lamports} lamports)...`);
        txSig = await sendSol(claim.wallet_address, chk.lamports);
        console.log("  ✓ TX:", txSig);
        const { error: uErr } = await supabase.from("wago_drop_claims")
          .update({ status: "completed", tx_signature: txSig }).eq("id", claim.id);
        if (uErr) console.error(`  ! Sent but DB update failed — record manually. TX ${txSig}:`, uErr.message);
        continue;
      }
      if (claim.reward_type !== "spl_token" || !claim.reward_token_mint) {
        console.log("  Skipping — unsupported reward type:", claim.reward_type);
        continue;
      }
      if (DRY_RUN) { console.log(`  [dry run] would send ${claim.reward_amount} of ${claim.reward_token_mint}`); continue; }

      const mintPubkey = new PublicKey(claim.reward_token_mint);
      const recipientPubkey = new PublicKey(claim.wallet_address);

      // Get or create treasury ATA
      const treasuryATA = await getOrCreateAssociatedTokenAccount(
        connection,
        treasuryKeypair,
        mintPubkey,
        treasuryKeypair.publicKey
      );

      // Get or create recipient ATA
      const recipientATA = await getOrCreateAssociatedTokenAccount(
        connection,
        treasuryKeypair, // payer
        mintPubkey,
        recipientPubkey
      );

      // Amount — reward_amount is a human amount like "1"; convert with THIS token's decimals.
      const TOKEN_DECIMALS = (await getMint(connection, mintPubkey)).decimals;
      const amount = BigInt(Math.round(parseFloat(claim.reward_amount) * 10 ** TOKEN_DECIMALS));

      console.log(`  Sending ${claim.reward_amount} tokens (${amount} raw units)...`);

      const txSig = await transfer(
        connection,
        treasuryKeypair,
        treasuryATA.address,
        recipientATA.address,
        treasuryKeypair,
        amount
      );

      console.log("  ✓ TX:", txSig);

      // Mark completed
      await supabase
        .from("wago_drop_claims")
        .update({ status: "completed", tx_signature: txSig })
        .eq("id", claim.id);

    } catch (err) {
      console.error("  ✗ Failed:", err.message);
      if (txSig) { console.error(`  ! A transaction was sent (${txSig}) — check it on-chain before retrying. Not marking failed.`); continue; }

      // Mark failed
      await supabase
        .from("wago_drop_claims")
        .update({ status: "failed", reward_metadata: { ...claim.reward_metadata, error: err.message } })
        .eq("id", claim.id);
    }
  }

  console.log("\nDone.");
}

// Trail completion rewards (wago_trail_progress.reward_status = 'pending').
async function processTrailRewards() {
  const { data: rows, error } = await supabase
    .from("wago_trail_progress")
    .select("id, google_id, reward_wallet, reward_metadata, wago_trails ( name, reward_type, reward_amount, reward_token_mint )")
    .eq("reward_status", "pending")
    .order("completed_at", { ascending: true });
  if (error) { console.error("Failed to fetch trail rewards:", error.message); return; }
  if (!rows?.length) { console.log("No pending Trail rewards."); return; }
  console.log(`\nProcessing ${rows.length} Trail reward(s)...`);

  for (const row of rows) {
    const t = row.wago_trails;
    const { data: account } = await supabase
      .from("wago_google_accounts").select("linked_wallet, wallet_verified").eq("google_id", row.google_id).maybeSingle();
    // Same gate as drop claims: pay only the verified linked wallet.
    const gate = payoutEligibility({ wallet_address: row.reward_wallet, wallet_verified: false }, account);
    if (!gate.eligible) { console.log(`Trail reward ${row.id} — HELD: ${gate.reason}`); continue; }
    if (t?.reward_type === "sol") {
      console.log(`Trail reward ${row.id} (${t.name}) → ${row.reward_wallet}: ${t.reward_amount} SOL`);
      let solSig = null;
      try {
        const chk = await checkSol(row.reward_wallet, t.reward_amount);
        if (chk.hold) { console.log(`  HELD: ${chk.hold}`); continue; }
        if (DRY_RUN) { console.log(`  [dry run] would send ${t.reward_amount} SOL`); continue; }
        solSig = await sendSol(row.reward_wallet, chk.lamports);
        console.log("  ✓ TX:", solSig);
        const { error: uErr } = await supabase.from("wago_trail_progress")
          .update({ reward_status: "completed", reward_tx_signature: solSig }).eq("id", row.id);
        if (uErr) console.error(`  ! Sent but DB update failed — record manually. TX ${solSig}:`, uErr.message);
      } catch (err) {
        console.error("  ✗ Failed:", err.message);
        if (!solSig) {
          await supabase.from("wago_trail_progress")
            .update({ reward_status: "failed", reward_metadata: { ...(row.reward_metadata || {}), error: err.message } }).eq("id", row.id);
        }
      }
      continue;
    }
    if (!t || t.reward_type !== "spl_token" || !t.reward_token_mint) { console.log(`Trail reward ${row.id} — skipping unsupported type:`, t?.reward_type); continue; }
    if (DRY_RUN) { console.log(`Trail reward ${row.id} — [dry run] would send ${t.reward_amount} of ${t.reward_token_mint}`); continue; }

    console.log(`Trail reward ${row.id} (${t.name}) → ${row.reward_wallet}: ${t.reward_amount}`);
    let txSig = null;
    try {
      const mintPubkey = new PublicKey(t.reward_token_mint);
      const recipientPubkey = new PublicKey(row.reward_wallet);
      const treasuryATA = await getOrCreateAssociatedTokenAccount(connection, treasuryKeypair, mintPubkey, treasuryKeypair.publicKey);
      const recipientATA = await getOrCreateAssociatedTokenAccount(connection, treasuryKeypair, mintPubkey, recipientPubkey);
      const decimals = (await getMint(connection, mintPubkey)).decimals;
      const amount = BigInt(Math.round(parseFloat(t.reward_amount) * 10 ** decimals));
      txSig = await transfer(connection, treasuryKeypair, treasuryATA.address, recipientATA.address, treasuryKeypair, amount);
      console.log("  ✓ TX:", txSig);
      const { error: uErr } = await supabase.from("wago_trail_progress")
        .update({ reward_status: "completed", reward_tx_signature: txSig }).eq("id", row.id);
      if (uErr) console.error(`  ! Sent but DB update failed — record manually. TX ${txSig}:`, uErr.message);
    } catch (err) {
      console.error("  ✗ Failed:", err.message);
      if (!txSig) {
        await supabase.from("wago_trail_progress")
          .update({ reward_status: "failed", reward_metadata: { ...(row.reward_metadata || {}), error: err.message } }).eq("id", row.id);
      }
    }
  }
}

processClaims().then(processTrailRewards);
