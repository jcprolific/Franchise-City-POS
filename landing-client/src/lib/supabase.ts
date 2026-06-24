import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'Missing Supabase env vars. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in landing-client/.env.local, then restart the dev server.'
  );
}

// Lazy singleton — only instantiated when env vars are present so that
// pure-function unit tests (node environment, no .env.local) can import
// inquiry.ts without crashing. submitInquiry is covered by the live smoke test.
let _client: ReturnType<typeof createClient> | null = null;

export function getSupabaseClient() {
  if (!_client) {
    _client = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '');
  }
  return _client;
}

// Convenience re-export used by submitInquiry — resolves lazily.
export const supabase = new Proxy({} as ReturnType<typeof createClient>, {
  get(_target, prop) {
    return getSupabaseClient()[prop as keyof ReturnType<typeof createClient>];
  },
});

export function isSupabaseConfigured() {
  return Boolean(supabaseUrl && supabaseAnonKey);
}
