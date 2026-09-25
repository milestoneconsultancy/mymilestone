import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://zvwyljkeltedtpdonlip.supabase.co";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_55A9upvydG91lmuiyAS5hg_ea-8D9R9";

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
