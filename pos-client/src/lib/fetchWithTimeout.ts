import { SUPABASE_TIMEOUT_MS } from './withTimeout';

/** Fetch that always aborts when `timeoutMs` elapses, even if the caller passed a signal. */
export function fetchWithDeadline(
  input: RequestInfo | URL,
  init?: RequestInit,
  timeoutMs = SUPABASE_TIMEOUT_MS
): Promise<Response> {
  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  const signals = [timeoutSignal, init?.signal].filter(
    (signal): signal is AbortSignal => Boolean(signal)
  );
  const signal =
    signals.length > 1 && typeof AbortSignal.any === 'function'
      ? AbortSignal.any(signals)
      : signals[0];

  return fetch(input, { ...init, signal });
}
