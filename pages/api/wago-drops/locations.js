// pages/api/wago-drops/locations.js
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function jitter(val, metres) {
  const deg = metres / 111320;
  return val + (Math.random() * 2 - 1) * deg;
}

function haversineM(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const session = await getServerSession(req, res, authOptions);
  const googleId = session?.user?.google_id || null;

  let { swLat, swLng, neLat, neLng } = req.query;
  swLat = parseFloat(swLat); swLng = parseFloat(swLng);
  neLat = parseFloat(neLat); neLng = parseFloat(neLng);

  if ([swLat,swLng,neLat,neLng].some(isNaN)) {
    return res.status(400).json({ error: "Invalid bounds" });
  }

  // Cap viewport size
  if ((neLat - swLat) >