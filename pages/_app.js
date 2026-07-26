import "../styles/globals.css";
import { useMemo, useState, useEffect } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import "@solana/wallet-adapter-react-ui/styles.css";

const RPC_ENDPOINT = "https://api.mainnet-beta.solana.com";

export default function App({ Component, pageProps }) {
  const [wallets, setWallets] = useState([]);

  useEffect(() => {
    // Load wallet adapters client-side only — avoids SSR/Ledger ESM issues
    import("@solana/wallet-adapter-wallets").then(({ PhantomWalletAdapter, SolflareWalletAdapter }) => {
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