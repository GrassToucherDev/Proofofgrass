// utils/fingerprint.js
// Generates a device fingerprint hash from browser signals
// Called at proof submission time — fire and forget, never blocks the user

async function hashString(str) {
  try {
    const buf = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(str)
    );
    return Array.from(new Uint8Array(buf))
      .map(b => b.toString(16).padStart(2,"0"))
      .join("")
      .slice(0, 32); // first 32 chars is enough
  } catch {
    return null;
  }
}

function getCanvasFingerprint() {
  try {
    const c = document.createElement("canvas");
    const ctx = c.getContext("2d");
    ctx.textBaseline = "top";
    ctx.font = "14px 'Arial'";
    ctx.fillStyle = "#f60";
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = "#069";
    ctx.fillText("Proof of Grass 🌿", 2, 15);
    ctx.fillStyle = "rgba(102,204,0,0.7)";
    ctx.fillText("Proof of Grass 🌿", 4, 17);
    return c.toDataURL().slice(-50); // last 50 chars is the unique part
  } catch {
    return "";
  }
}

export async function collectAndSendFingerprint(username) {
  if (typeof window === "undefined" || !username) return;

  try {
    const signals = [
      navigator.userAgent,
      navigator.language,
      screen.width + "x" + screen.height,
      screen.colorDepth,
      new Date().getTimezoneOffset(),
      navigator.hardwareConcurrency || "",
      navigator.deviceMemory || "",
      getCanvasFingerprint(),
    ].join("|");

    const fingerprintHash = await hashString(signals);
    if (!fingerprintHash) return;

    // Fire and forget — never await, never block
    fetch("/api/fingerprint", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username,
        fingerprintHash,
        userAgent:        navigator.userAgent,
        screenResolution: screen.width + "x" + screen.height,
        timezone:         Intl.DateTimeFormat().resolvedOptions().timeZone,
      }),
    }).catch(() => {}); // silent fail

  } catch {
    // Never surface fingerprint errors to the user
  }
}