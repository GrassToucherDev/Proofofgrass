// pages/api/auth/[...nextauth].js
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId:     process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],

  secret: process.env.NEXTAUTH_SECRET,

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },

  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider !== "google") return false;

      const { error } = await supabase
        .from("wago_google_accounts")
        .upsert(
          {
            google_id:    user.id,
            email:        user.email,
            display_name: user.name,
            avatar_url:   user.image,
            last_sign_in: new Date().toISOString(),
          },
          { onConflict: "google_id", ignoreDuplicates: false }
        );

      if (error) {
        console.error("[nextauth] wago_google_accounts upsert failed:", error);
      }

      return true;
    },

    async jwt({ token, account, user }) {
      if (account?.provider === "google") {
        token.google_id = user.id;
      }
      return token;
    },

    async session({ session, token }) {
      if (token?.google_id) {
        session.user.google_id = token.google_id;
      }
      return session;
    },
  },

  pages: {
    signIn: "/wago-drops",
  },
};

export default NextAuth(authOptions);