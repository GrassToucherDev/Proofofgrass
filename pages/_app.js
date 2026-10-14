// pages/_app.js
import "../styles/globals.css";
import { useState, useEffect } from "react";
import { SessionProvider } from "next-auth/react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import "@solana/wallet-adapter-react-ui/styles.css";

const RPC_ENDPOINT = process.env.NEXT_PUBLIC_SOLANA_RPC_URL
  || "https://solana-mainnet.rpc.extrnode.com"
  || "https://api.mainnet-beta.solana.com";

export default function App({ Component, pageProps: { session, ...pageProps } }) {
  const [wallets, setWallets] = useState([]);

  useEffect(() => {
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
    <SessionProvider session={session}>
      <ConnectionProvider endpoint={RPC_ENDPOINT}>
        <WalletProvider wallets={wallets} autoConnect>
          <WalletModalProvider>
            <Component {...pageProps} />
          </WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    </SessionProvider>
  );
}