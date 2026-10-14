import { createClient } from "@supabase/supabase-js";
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
export default async function handler(req, res) {
  const { data, error } = await supabase
    .from("wago_drop_locations")
    .select("*")
    .gte("lat", 27).lte("lat", 28)
    .gte("lng", -83).lte("lng", -82);
  return res.status(200).json({ data, error });
}