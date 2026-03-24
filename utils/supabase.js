import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://fndhqtnsdqlyedpwecys.supabase.co";
const supabaseAnonKey = "sb_publishable_VtcdAaymV20dOd5Q39ZrfQ_VcNInpSF";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);