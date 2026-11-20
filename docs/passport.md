# WAGO Passport (`/passport`)

A collector connects the Solana wallet they minted with, sees their verified WAGO Origins and Screen Touchers,
picks a cover and downloads a 1600x900 PNG. No Proof of Grass account is needed.

## Environment variables (server only, none are `NEXT_PUBLIC_`)

| Variable | Required | What it is |
| --- | --- | --- |
| `PASSPORT_DAS_RPC_URL` | yes (or `SOLANA_RPC_URL`) | A **DAS-capable** Solana RPC (Helius, Triton, QuickNode...). Must support `getAssetsByOwner` and `getAsset`. A plain RPC like `api.mainnet-beta.solana.com` will not work. It usually contains an API key, so keep it server-side. Falls back to the existing `SOLANA_RPC_URL`, which only works if that RPC supports DAS. |
| `WAGO_ORIGINS_COLLECTION` | yes | Verified collection address for WAGO Origins (the LaunchMyNFT collection). Not set anywhere in the repo yet. Never guessed. |
| `SCREEN_TOUCHERS_COLLECTION` | yes | Verified collection address for Screen Touchers. Not set anywhere in the repo yet. |
| `PASSPORT_IPFS_GATEWAY` | no | Gateway used for `ipfs://` image links. Default `https://ipfs.io/ipfs/`. |

"Collection address" means the verified **collection** (grouping) address that the NFTs belong to, not a candy
machine, mint authority or marketplace slug. If the wrong kind of address is set, wallets will look empty.
Until the three required values are set, `/api/passport/collection` answers `503 not_configured` and the page
shows "Passport is almost ready". The missing names are logged server-side only.

## How verification works
- `GET /api/passport/collection?wallet=<address>` reads the wallet's assets from the DAS RPC, then keeps only
  assets that are owned by that wallet, not burnt, and whose **verified** collection equals a configured address.
  The browser never sends or is trusted for NFT data. Holdings are public chain data, so no signature is needed.
- `GET /api/passport/image?mint=<id>` re-checks that the mint is a verified member of a configured collection,
  then serves the image from the same origin (so the PNG export isn't blocked by CORS). It only fetches https
  URLs and refuses private/loopback addresses and non-image content.
- Proof of Grass activity (streak, proofs) is returned only when the viewer is signed in AND their profile has a
  signature-verified wallet (`Profiles.wallet_verified`) equal to the connected wallet. Otherwise nothing about
  Proof of Grass is shown or sent.
- The downloaded PNG contains the artwork, the display name, the NFT name and the counts. No wallet address,
  and the filename is always `wago-passport.png`.

## Needs a real mint to verify
- That the two collection addresses are the verified-collection addresses the DAS index groups assets under.
- That LaunchMyNFT mints land in the indexer quickly, and how long the "not indexed yet" window really is.
- Image hosting (IPFS/Arweave/CDN) response times and content types for real WAGO art.
- That your DAS provider returns Metaplex Core assets if the mint uses Core.
