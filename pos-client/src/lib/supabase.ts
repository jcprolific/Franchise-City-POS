import { createClient } from '@supabase/supabase-js';
import { SUPABASE_TIMEOUT_MS } from './withTimeout';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'Missing Supabase env vars. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in pos-client/.env.local, then restart the dev server.'
  );
}

function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  // Prefer the caller's signal when present. Otherwise apply our own timeout so
  // hung Auth/API calls fail with a clear message instead of hanging forever.
  if (init?.signal) {
    return fetch(input, init);
  }

  const signal =
    typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal
      ? AbortSignal.timeout(SUPABASE_TIMEOUT_MS)
      : undefined;

  return fetch(input, signal ? { ...init, signal } : init);
}

export const supabase = createClient(
  supabaseUrl ?? '',
  supabaseAnonKey ?? '',
  {
    global: {
      fetch: fetchWithTimeout,
    },
  }
);

export function isSupabaseConfigured() {
  return Boolean(supabaseUrl && supabaseAnonKey);
}
