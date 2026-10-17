import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// External Supabase backend. Publishable key only — never a service-role key.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

export const supabase: SupabaseClient | null = url && key ? createClient(url, key) : null;
