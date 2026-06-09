/**
 * Proof of Grass — Icon Generator
 * Run: node scripts/generate-icons.js
 *
 * Requires: npm install sharp --save-dev
 *
 * Input:  public/touchgrass-transparent.png (existing logo)
 * Output: public/icons/*.png
 */

 const sharp = require("sharp");
 const path  = require("path");
 const fs    = require("fs");
 
 const INPUT  = path.join(__dirname, "../public/touchgrass-transparent.png");
 const OUTPUT = path.join(__dirname, "../public/icons");
 
 if (!fs.existsSync(OUTPUT)) fs.mkdirSync(OUTPUT, { recursive: true });
 
 const ICONS = [
   // Android / PWA manifest
   { name: "icon-192.png",       size: 192, bg: "#080a06", padding: 20 },
   { name: "icon-512.png",       size: 512, bg: "#080a06", padding: 52 },
   // Apple
   { name: "apple-touch-icon.png", size: 180, bg: "#080a06", padding: 18 },
   { name: "icon-152.png",       size: 152, bg: "#080a06", padding: 16 },
   { name: "icon-167.png",       size: 167, bg: "#080a06", padding: 18 },
   // Favicons
   { name: "favicon-32.png",     size: 32,  bg: "#080a06", padding: 4 },
   { name: "favicon-16.png",     size: 16,  bg: "#080a06", padding: 2 },
 ];
 
 const SPLASHES = [
   { name: "splash-1290x2796.png", w: 1290, h: 2796 }, // iPhone 14 Pro Max
   { name: "splash-1179x2556.png", w: 1179, h: 2556 }, // iPhone 14 Pro
   { name: "splash-1170x2532.png", w: 1170, h: 2532 }, // iPhone 14
   { name: "splash-750x1334.png",  w: 750,  h: 1334 }, // iPhone SE
 ];
 
 const SPLASH_OUTPUT = path.join(__dirname, "../public/splash");
 if (!fs.existsSync(SPLASH_OUTPUT)) fs.mkdirSync(SPLASH_OUTPUT, { recursive: true });
 
 async function generateIcons() {
   console.log("Generating icons from:", INPUT);
 
   for (const icon of ICONS) {
     const iconSize = icon.size - icon.padding * 2;
     await sharp({
       create: {
         width: icon.size, height: icon.size,
         channels: 4,
         background: icon.bg,
       }
     })
     .composite([{
       input: await sharp(INPUT).resize(iconSize, iconSize, { fit: "contain" }).toBuffer(),
       top: icon.padding, left: icon.padding,
     }])
     .png()
     .toFile(path.join(OUTPUT, icon.name));
     console.log(`  ✓ ${icon.name} (${icon.size}x${icon.size})`);
   }
 
   // Generate splash screens
   console.log("\nGenerating splash screens...");
   for (const splash of SPLASHES) {
     const logoSize = Math.min(splash.w, splash.h) * 0.3;
     const top  = Math.round((splash.h - logoSize) / 2);
     const left = Math.round((splash.w - logoSize) / 2);
     await sharp({
       create: { width: splash.w, height: splash.h, channels: 4, background: "#080a06" }
     })
     .composite([{
       input: await sharp(INPUT).resize(Math.round(logoSize), Math.round(logoSize), { fit:"contain" }).toBuffer(),
       top, left,
     }])
     .png()
     .toFile(path.join(SPLASH_OUTPUT, splash.name));
     console.log(`  ✓ ${splash.name} (${splash.w}x${splash.h})`);
   }
 
   console.log("\n✅ All icons and splash screens generated.");
   console.log("📁 Icons: public/icons/");
   console.log("📁 Splash: public/splash/");
 }
 
 generateIcons().catch(console.error);