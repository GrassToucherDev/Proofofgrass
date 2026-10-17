// utils/verifyWalletSignature.js  (server only)
// Verifies a Solana wallet's ed25519 signature using Node's built-in crypto —
// no extra dependency. A Solana address is the base58 of the 32-byte public key.
import crypto from "crypto";
import bs58 from "bs58";

const ED25519_SPKI_PREFIX = Buffer.from("302a300506032b6570032100", "hex");

export function verifyWalletSignature({ wallet, message, signatureB64 }) {
  try {
    const pub = Buffer.from(bs58.decode(wallet));
    if (pub.length !== 32) return false;
    const sig = Buffer.from(signatureB64, "base64");
    if (sig.length !== 64) return false;
    const key = crypto.createPublicKey({
      key: Buffer.concat([ED25519_SPKI_PREFIX, pub]),
      format: "der",
      type: "spki",
    });
    return crypto.verify(null, Buffer.from(message, "utf8"), key, sig);
  } catch {
    return false;
  }
}
