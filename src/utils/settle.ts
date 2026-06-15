/**
 * Run every async task, then resolve with their concatenated results — but only
 * if all of them succeeded. If any task rejects, throw instead of silently
 * dropping its result.
 *
 * Why: multi-calendar fetches used `Promise.allSettled` + `flatMap`, which
 * dropped any failed calendar. On low network that turned a transient failure
 * into a *successful* partial/empty result, which TanStack Query then cached
 * over the last good data — events vanished. Throwing keeps the last good cache
 * (via keepPreviousData) and lets retry / refetch-on-reconnect heal it.
 */
export async function settleAllOrThrow<T>(
  tasks: ReadonlyArray<() => Promise<T[]>>,
): Promise<T[]> {
  if (tasks.length === 0) return [];

  const results = await Promise.allSettled(tasks.map((task) => task()));

  const failures = results.filter(
    (r): r is PromiseRejectedResult => r.status === 'rejected',
  );
  if (failures.length > 0) {
    const error = new Error(`${failures.length}/${results.length} fetch(es) failed`);
    (error as Error & { failures: unknown[] }).failures = failures.map((f) => f.reason);
    throw error;
  }

  return (results as PromiseFulfilledResult<T[]>[]).flatMap((r) => r.value);
}
