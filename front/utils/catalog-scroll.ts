// Bridges the desired scroll position from the filter navigation to the catalog
// grid, so it can be restored *after* the new arts have laid out (avoids the
// page jumping to the top / clamping while results are reloading).
let pending: number | null = null

export const setPendingScroll = (y: number) => { pending = y }
export const consumePendingScroll = (): number | null => {
  const p = pending
  pending = null
  return p
}
