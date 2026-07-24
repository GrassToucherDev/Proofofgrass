// pages/api/touchgrass-price.js
// Server-side price fetch — avoids CORS issues from browser

export default async function handler(req, res) {
  try {
    const MINT = "5314GTpDziP2ZdaANnt5KJEABGXy5Nn5Kyc3SFPYpump";
    const url  = `https://api.dexscreener.com/latest/dex/tokens/${MINT}`;
    const r    = await fetch(url, { headers:{ "Accept":"application/json" } });
    if (!r.ok) throw new Error(`dexscreener ${r.status}`);
    const data = await r.json();
    const pair = data?.pairs?.[0];
    const price = parseFloat(pair?.priceUsd ?? "0");
    res.setHeader("Cache-Control","s-maxage=30,stale-while-revalidate=60");
    res.json({ price, symbol:"TOUCHGRASS", updatedAt: Date.now() });
  } catch(e) {
    res.status(500).json({ error: e.message, price: 0 });
  }
}