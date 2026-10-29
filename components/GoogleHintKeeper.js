import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { rememberGoogleHint } from "../utils/googleSignIn";

// Renders nothing. Remembers the signed-in Google email on this device so re-signing in is one tap.
export default function GoogleHintKeeper() {
  const { data: session, status } = useSession();
  useEffect(() => {
    if (status === "authenticated" && session?.user?.email) rememberGoogleHint(session.user.email);
  }, [status, session?.user?.email]);
  return null;
}
