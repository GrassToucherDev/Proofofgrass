import { useState, useEffect, useCallback } from "react";
import { supabase } from "../utils/supabase";

/**
 * useFollow — manages follow/unfollow state for a viewer→subject pair
 *
 * @param {string} viewerUsername  — the logged-in user
 * @param {string} subjectUsername — the profile being viewed
 * @returns { isFollowing, followerCount, followingCount, toggle, loading }
 */
export function useFollow(viewerUsername, subjectUsername) {
  const [isFollowing,    setIsFollowing]    = useState(false);
  const [followerCount,  setFollowerCount]  = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [loading,        setLoading]        = useState(true);

  const norm = (v) => String(v ?? "").replace(/@/g, "").toLowerCase().trim();
  const viewer  = norm(viewerUsername);
  const subject = norm(subjectUsername);
  const canFollow = viewer && subject && viewer !== subject;

  useEffect(() => {
    if (!subject) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const [{ count: followers }, { count: following }, { data: myFollow }] =
          await Promise.all([
            // How many people follow the subject
            supabase.from("follows")
              .select("id", { count: "exact", head: true })
              .eq("following_username", subject),
            // How many people does the subject follow
            supabase.from("follows")
              .select("id", { count: "exact", head: true })
              .eq("follower_username", subject),
            // Does the viewer follow the subject
            viewer
              ? supabase.from("follows")
                  .select("id")
                  .eq("follower_username", viewer)
                  .eq("following_username", subject)
                  .maybeSingle()
              : Promise.resolve({ data: null }),
          ]);

        if (cancelled) return;
        setFollowerCount(followers ?? 0);
        setFollowingCount(following ?? 0);
        setIsFollowing(!!myFollow);
      } catch (e) {
        console.warn("[useFollow] fetch error:", e?.message);
      }
      if (!cancelled) setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [viewer, subject]);

  const toggle = useCallback(async () => {
    if (!canFollow) return;

    // Optimistic update
    const wasFollowing = isFollowing;
    setIsFollowing(!wasFollowing);
    setFollowerCount(c => wasFollowing ? c - 1 : c + 1);

    try {
      if (wasFollowing) {
        await supabase.from("follows")
          .delete()
          .eq("follower_username", viewer)
          .eq("following_username", subject);
      } else {
        await supabase.from("follows")
          .insert([{ follower_username: viewer, following_username: subject }]);
      }
    } catch (e) {
      // Rollback on error
      console.warn("[useFollow] toggle error:", e?.message);
      setIsFollowing(wasFollowing);
      setFollowerCount(c => wasFollowing ? c + 1 : c - 1);
    }
  }, [canFollow, isFollowing, viewer, subject]);

  return { isFollowing, followerCount, followingCount, toggle, loading, canFollow };
}

/**
 * useFollowingFeed — fetches activity only from users the viewer follows
 */
export function useFollowingFeed(viewerUsername) {
  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(true);

  const norm = (v) => String(v ?? "").replace(/@/g, "").toLowerCase().trim();
  const viewer = norm(viewerUsername);

  useEffect(() => {
    if (!viewer) { setLoading(false); return; }
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        // Get list of followed usernames
        const { data: followRows } = await supabase
          .from("follows")
          .select("following_username")
          .eq("follower_username", viewer);

        const followed = (followRows ?? []).map(r => r.following_username);
        // Include viewer's own activity
        const feedUsers = [...new Set([...followed, viewer])];

        if (feedUsers.length === 0) {
          if (!cancelled) { setItems([]); setLoading(false); }
          return;
        }

        // Fetch recent activity from followed users
        const [{ data: subs }, { data: chals }, { data: referrals }] =
          await Promise.all([
            supabase.from("Submissions")
              .select("username, created_at")
              .in("username", feedUsers)
              .in("status", ["pending", "approved"])
              .order("created_at", { ascending: false })
              .limit(25),
            supabase.from("Challenges")
              .select("challenger, challenged, duration_days, status, created_at, slug")
              .or(feedUsers.map(u => `challenger.eq.${u}`).join(","))
              .order("created_at", { ascending: false })
              .limit(10),
            supabase.from("Referrals")
              .select("referrer_username, referred_username, status, converted_at, created_at")
              .in("referrer_username", feedUsers)
              .order("created_at", { ascending: false })
              .limit(8),
          ]);

        if (cancelled) return;

        const feed = [];

        (subs ?? []).forEach(s => feed.push({
          type: "proof", username: s.username,
          text: "logged outdoor proof", emoji: "🌿", time: s.created_at,
        }));

        (chals ?? []).forEach(c => {
          if (c.status === "active" || c.status === "pending") {
            feed.push({
              type: "challenge", username: c.challenger,
              text: `challenged @${c.challenged} to a ${c.duration_days}-day streak`,
              emoji: "⚡", time: c.created_at,
              link: `/challenge/${c.slug}`,
            });
          }
          if (c.status === "completed") {
            feed.push({
              type: "challenge_done", username: c.challenger,
              text: `completed a ${c.duration_days}-day challenge`,
              emoji: "🏆", time: c.created_at,
            });
          }
        });

        (referrals ?? []).forEach(r => {
          if (r.status === "converted") {
            feed.push({
              type: "referral", username: r.referrer_username,
              text: `helped @${r.referred_username} reach Day 10`,
              emoji: "🤝", time: r.converted_at || r.created_at,
            });
          }
        });

        feed.sort((a, b) => new Date(b.time) - new Date(a.time));
        setItems(feed.slice(0, 25));
      } catch (e) {
        console.warn("[useFollowingFeed] error:", e?.message);
      }
      if (!cancelled) setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [viewer]);

  return { items, loading };
}

/**
 * useSuggestedTouchers — suggests users based on similar streak
 */
export async function fetchSuggestedTouchers(viewerUsername, currentStreak, limit = 5) {
  const norm = (v) => String(v ?? "").replace(/@/g, "").toLowerCase().trim();
  const viewer = norm(viewerUsername);
  if (!viewer) return [];

  try {
    // Get who viewer already follows
    const { data: followRows } = await supabase
      .from("follows")
      .select("following_username")
      .eq("follower_username", viewer);

    const alreadyFollowing = new Set((followRows ?? []).map(r => r.following_username));
    alreadyFollowing.add(viewer); // don't suggest self

    // Get active users ordered by streak proximity
    const { data: streaks } = await supabase
      .from("Streaks")
      .select("username, current_streak")
      .neq("username", viewer)
      .order("current_streak", { ascending: false })
      .limit(50);

    const candidates = (streaks ?? [])
      .filter(s => !alreadyFollowing.has(norm(s.username)))
      .sort((a, b) => {
        // Sort by streak proximity to viewer
        const diffA = Math.abs((a.current_streak ?? 0) - currentStreak);
        const diffB = Math.abs((b.current_streak ?? 0) - currentStreak);
        return diffA - diffB;
      })
      .slice(0, limit);

    return candidates;
  } catch (e) {
    console.warn("[suggested] error:", e?.message);
    return [];
  }
}