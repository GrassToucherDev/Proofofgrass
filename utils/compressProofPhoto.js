// Fallback for a failed upload: phone cameras produce 5–15 MB files that can fail on weak mobile connections.
// Used only on the retry. Longest side 2000px, JPEG ~0.88. Falls back to the original file if anything goes wrong
// or if the result isn't smaller.
export async function compressProofPhoto(file, maxSide = 2000, quality = 0.88, force = false) {
  try {
    if (!(file instanceof Blob) || typeof document === "undefined") return file;
    if (!force && file.size < 600 * 1024 && /jpe?g|png|webp/i.test(file.type || "")) return file;   // already small
    let bmp;
    try { bmp = await createImageBitmap(file, { imageOrientation: "from-image" }); }
    catch {
      bmp = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = URL.createObjectURL(file); });
    }
    const w0 = bmp.width || bmp.naturalWidth, h0 = bmp.height || bmp.naturalHeight;
    if (!w0 || !h0) return file;
    const s = Math.min(1, maxSide / Math.max(w0, h0));
    const c = document.createElement("canvas"); c.width = Math.round(w0 * s); c.height = Math.round(h0 * s);
    c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise((res) => c.toBlob(res, "image/jpeg", quality));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], (file.name || "proof").replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch { return file; }
}
