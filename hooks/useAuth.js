import { useState, useEffect } from "react";
import { supabase } from "../utils/supabase";

export function useAuth() {
  const [session,  setSession]  = useState(null);
  const [username, setUsername] = useState("");
  const [verified, setVerified] = useState(false);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    // Get current session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        const xUser = session.user?.user_metadata?.user_name
          || session.user?.user_metadata?.preferred_username;
        if (xUser) {
          const norm = xUser.toLowerCase().replace(/@/g, "").trim();
          setUsername(norm);
          setVerified(true);
          localStorage.setItem("pog_username", norm);
          localStorage.setItem("pog_auth_verified", "true");
        }
      } else {
        // Fall back to localStorage (unverified)
        const saved    = localStorage.getItem("pog_username") ?? "";
        const isVerif  = localStorage.getItem("pog_auth_verified") === "true";
        setUsername(saved);
        setVerified(isVerif);
      }
      setLoading(false);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        if (session) {
          const xUser = session.user?.user_metadata?.user_name
            || session.user?.user_metadata?.preferred_username;
          if (xUser) {
            const norm = xUser.toLowerCase().replace(/@/g, "").trim();
            setUsername(norm);
            setVerified(true);
            localStorage.setItem("pog_username", norm);
            localStorage.setItem("pog_auth_verified", "true");
          }
        } else {
          localStorage.removeItem("pog_auth_verified");
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signInWithX = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "x",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: "tweet.read users.read",
      },
    });
    if (error) console.error("OAuth error:", error.message);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("pog_auth_verified");
    // Keep pog_username so UI doesn't break immediately
    setVerified(false);
    setSession(null);
  };

  return { session, username, verified, loading, signInWithX, signOut };
}