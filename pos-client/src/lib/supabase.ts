import { createClient } from '@supabase/supabase-js';
import { fetchWithDeadline } from './fetchWithTimeout';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'Missing Supabase env vars. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in pos-client/.env.local, then restart the dev server.'
  );
}

export const supabase = createClient(
  supabaseUrl ?? '',
  supabaseAnonKey ?? '',
  {
    global: {
      fetch: fetchWithDeadline,
    },
  }
);

export function isSupabaseConfigured() {
  return Boolean(supabaseUrl && supabaseAnonKey);
}
