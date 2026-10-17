// utils/wagoWalletDeeplink.js (client only)
// Mobile wallet linking WITHOUT the wallet's in-app browser, using the
// Phantom / Solflare universal-link protocol (connect + signMessage):
//   page → wallet app (connect) → back to this site → wallet app (sign) → back → link.
// The user stays in their normal browser, so Google sign-in and location keep working.
import nacl from "tweetnacl";
import bs58 from "bs58";
import { buildLinkMessage } from "./wagoWalletLink";

const KEY = "wago_deeplink_v1";
const TTL_MS = 15 * 60 * 1000;
export const CALLBACK_PATH = "/wago-drops/wallet-callback";

export const DEEPLINK_PROVIDERS = {
  phantom:  { label: "Phantom",  base: "https://phantom.app/ul/v1",    pkParam: "phantom_encryption_public_key" },
  solflare: { label: "Solflare", base: "https://solflare.com/ul/v1",   pkParam: "solflare_encryption_public_key" },
};

function save(state) { localStorage.setItem(KEY, JSON.stringify({ ...state, ts: Date.now() })); }
export function loadDeeplinkState() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || "null");
    if (!s || Date.now() - s.ts > TTL_MS) return null;
    return s;
  } catch { return null; }
}
export function clearDeeplinkState() { try { localStorage.removeItem(KEY); } catch {} }

const enc = encodeURIComponent;

// Step 1: ask the wallet app to connect (returns the wallet's public key).
export function startConnect(providerId, googleId) {
  const prov = DEEPLINK_PROVIDERS[providerId];
  const kp = nacl.box.keyPair();
  save({ provider: providerId, googleId, step: "connect", secretKey: bs58.encode(kp.secretKey), publicKey: bs58.encode(kp.publicKey) });
  const redirect = `${window.location.origin}${CALLBACK_PATH}`;
  window.location.href =
    `${prov.base}/connect?app_url=${enc(window.location.origin)}` +
    `&dapp_encryption_public_key=${enc(bs58.encode(kp.publicKey))}` +
    `&redirect_link=${enc(redirect)}&cluster=mainnet-beta`;
}

function sharedFor(state, walletPk) {
  return nacl.box.before(bs58.decode(walletPk), bs58.decode(state.secretKey));
}

function decrypt(state, walletPk, nonce, data) {
  const out = nacl.box.open.after(bs58.decode(data), bs58.decode(nonce), sharedFor(state, walletPk));
  if (!out) throw new Error("Couldn't read the wallet's reply. Please try again.");
  return JSON.parse(new TextDecoder().decode(out));
}

// Handle the redirect back from the wallet. Returns { step: "signed", wallet, signature, issuedAt }
// once signing is done, or { step: "connected", ... } after connect (caller then calls startSign()).
export function handleCallback(params) {
  const state = loadDeeplinkState();
  if (!state) throw new Error("This wallet link expired. Please start again from Settings.");
  if (params.errorCode || params.errorMessage) {
    throw new Error(params.errorMessage ? decodeURIComponent(String(params.errorMessage)) : "The wallet request was cancelled.");
  }
  const prov = DEEPLINK_PROVIDERS[state.provider];
  const { nonce, data } = params;
  if (!nonce || !data) throw new Error("Missing wallet response. Please try again.");

  if (state.step === "connect") {
    const walletPk = params[prov.pkParam] || params.phantom_encryption_public_key || params.solflare_encryption_public_key;
    if (!walletPk) throw new Error("Missing wallet key. Please try again.");
    const res = decrypt(state, walletPk, nonce, data);
    if (!res.public_key || !res.session) throw new Error("The wallet didn't return an account.");
    save({ ...state, step: "sign", walletPk, wallet: res.public_key, session: res.session });
    return { step: "connected", wallet: res.public_key };
  }

  if (state.step === "signing") {
    const res = decrypt(state, state.walletPk, nonce, data);
    if (!res.signature) throw new Error("The wallet didn't return a signature.");
    const sig = bs58.decode(res.signature);
    return { step: "signed", wallet: state.wallet, issuedAt: state.issuedAt,
             signature: btoa(String.fromCharCode(...sig)) };
  }
  throw new Error("Unexpected wallet reply. Please start again.");
}

// Step 2: ask the wallet to sign the link message.
export function startSign() {
  const state = loadDeeplinkState();
  if (!state || state.step !== "sign") throw new Error("This wallet link expired. Please start again from Settings.");
  const prov = DEEPLINK_PROVIDERS[state.provider];
  const issuedAt = new Date().toISOString();
  const message = buildLinkMessage({ googleId: state.googleId, wallet: state.wallet, issuedAt });
  const nonce = nacl.randomBytes(24);
  const payload = nacl.box.after(
    new TextEncoder().encode(JSON.stringify({ session: state.session, message: bs58.encode(new TextEncoder().encode(message)), display: "utf8" })),
    nonce, sharedFor(state, state.walletPk));
  save({ ...state, step: "signing", issuedAt });
  const redirect = `${window.location.origin}${CALLBACK_PATH}`;
  window.location.href =
    `${prov.base}/signMessage?dapp_encryption_public_key=${enc(state.publicKey)}` +
    `&nonce=${enc(bs58.encode(nonce))}&redirect_link=${enc(redirect)}&payload=${enc(bs58.encode(payload))}`;
}
