export function editorClosePolicy(baseline: string | null, current: string, saving: boolean): 'blocked' | 'close' | 'confirm' {
  if (saving) return 'blocked';
  // No captured baseline yet: prefer retaining the draft to losing it.
  return baseline === current ? 'close' : 'confirm';
}
