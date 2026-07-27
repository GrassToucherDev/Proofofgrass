import "../styles/globals.css";
import { useState, useEffect } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import "@solana/wallet-adapter-react-ui/styles.css";

const RPC_ENDPOINT = process.env.NEXT_PUBLIC_SOLANA_RPC_URL
  || "https://solana-mainnet.rpc.extrnode.com";

export default function App({ Component, pageProps }) {
  const [wallets, setWallets] = useState([]);

  useEffect(() => {
    // Import individual adapters directly — avoids pulling in @solana/wallet-adapter-wallets
    // which chains through WalletConnect → pino → thread-stream (Node.js only, breaks Turbopack)
    Promise.all([
      import("@solana/wallet-adapter-phantom"),
      import("@solana/wallet-adapter-solflare"),
    ]).then(([{ PhantomWalletAdapter }, { SolflareWalletAdapter }]) => {
      setWallets([
        new PhantomWalletAdapter(),
        new SolflareWalletAdapter(),
      ]);
    }).catch(e => console.warn("wallet adapter load failed:", e));
  }, []);

  return (
    <ConnectionProvider endpoint={RPC_ENDPOINT}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <Component {...pageProps} />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}