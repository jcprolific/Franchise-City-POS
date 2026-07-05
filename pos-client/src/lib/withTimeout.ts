/** Reject if a promise does not settle within `ms` milliseconds. */
export function withTimeout<T>(
  promise: PromiseLike<T>,
  ms: number,
  message = 'Request timed out'
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(message)), ms);
    Promise.resolve(promise)
      .then((value) => {
        window.clearTimeout(timer);
        resolve(value);
      })
      .catch((error: unknown) => {
        window.clearTimeout(timer);
        reject(error);
      });
  });
}

export const SUPABASE_TIMEOUT_MS = 8_000;
