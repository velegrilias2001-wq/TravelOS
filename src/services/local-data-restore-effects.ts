/** A post-commit refresh failure must never be reported as a failed restore. */
export async function restoreWithRefresh(
  replace: () => Promise<void>,
  refresh: () => Promise<void>,
): Promise<{ refreshFailed: boolean }> {
  await replace();
  try {
    await refresh();
    return { refreshFailed: false };
  } catch {
    return { refreshFailed: true };
  }
}
