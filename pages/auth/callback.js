import { useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../utils/supabase";

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const handleAuth = async () => {
      try {
        // Exchange the OAuth code in the URL for a real session
        const { data, error } = await supabase.auth.exchangeCodeForSession(
          window.location.href
        );

        if (error || !data?.session) {
          console.error("Auth callback error:", error?.message ?? "no session");
          router.replace("/?auth=error");
          return;
        }

        const session = data.session;

        // Extract X username from metadata
        const xUsername =
          session.user?.user_metadata?.user_name ||
          session.user?.user_metadata?.preferred_username ||
          session.user?.user_metadata?.name ||
          "";

        if (xUsername) {
          const normalized = String(xUsername).toLowerCase().replace(/@/g, "").trim();
          localStorage.setItem("pog_username",      normalized);
          localStorage.setItem("pog_auth_verified", "true");
          localStorage.setItem("pog_user_id",       session.user.id);
          console.log("[auth] verified as:", normalized);
        } else {
          console.warn("[auth] no username in metadata", session.user?.user_metadata);
        }

        router.replace("/");
      } catch (err) {
        console.error("Auth callback exception:", err);
        router.replace("/?auth=error");
      }
    };

    handleAuth();
  }, [router]);

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0a0b08",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 16,
      fontFamily: "'DM Sans', sans-serif",
    }}>
      <img
        src="/touchgrass-transparent.png"
        alt=""
        style={{ width: 56, height: 56, opacity: 0.7,
          animation: "spin 1.5s linear infinite" }}
      />
      <div style={{ fontSize: 13, color: "rgba(240,239,234,0.4)",
        letterSpacing: "0.1em" }}>
        Verifying your account…
      </div>
      <style>{`
        @keyframes spin {
          0%,100% { transform: scale(1); opacity: 0.7; }
          50%      { transform: scale(1.08); opacity: 1; }
        }
      `}</style>
    </div>
  );
}