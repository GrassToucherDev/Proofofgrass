// utils/wagoCoverUpload.js — resize + upload a campaign cover photo.
// Stored in the public `proof-photos` bucket under wago-drops/covers/.
import { supabase } from "./supabase";

function resizeToJpeg(file, maxSide = 1200) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const s = Math.min(1, maxSide / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      c.toBlob(b => (b ? resolve(b) : reject(new Error("Couldn't read that image"))), "image/jpeg", 0.85);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Couldn't read that image")); };
    img.src = url;
  });
}

export async function uploadCover(file) {
  const blob = await resizeToJpeg(file);
  const id = (crypto.randomUUID?.() || String(Date.now()) + Math.random().toString(36).slice(2));
  const path = `wago-drops/covers/${id}.jpg`;
  const { error } = await supabase.storage.from("proof-photos").upload(path, blob, { contentType: "image/jpeg" });
  if (error) throw new Error("Upload failed. Please try again.");
  return supabase.storage.from("proof-photos").getPublicUrl(path).data.publicUrl;
}
