/**
 * The lead facilitator of a "One facilitator" board, for the crown on pointers and presence
 * markers. Null on open boards ("Everyone facilitates" has no lead).
 */
export function useLead() {
  const board = useBoardStore()
  const oneFacilitator = computed(() => board.settings?.openFacilitation === false)
  /** Relay connection of the lead (other than me); pointers and markers are matched on it. */
  const leadConn = computed(() => (oneFacilitator.value ? board.peers.find((p) => !p.me && p.role === 'facilitator')?.conn ?? null : null))
  const isLeadConn = (conn: string) => leadConn.value !== null && leadConn.value === conn
  return { oneFacilitator, leadConn, isLeadConn }
}
