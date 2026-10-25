/**
 * Peer-to-peer mesh topology (change p2p-presence-and-cursors). Pure functions: every peer
 * computes the same graph from the same sorted list of connection ids, so both ends of a link
 * agree on it and on who sends the offer, without any coordination.
 */

/** Up to this many participants, everybody links to everybody. */
export const FULL_MESH_MAX = 12
/** Above it, each peer links to its ring neighbours at distance 1..RING_REACH, plus the opposite peer. */
export const RING_REACH = 3

const ringDistance = (a: number, b: number, n: number) => Math.min(Math.abs(a - b), n - Math.abs(a - b))

/**
 * The peers `me` keeps a direct link with. Symmetric: b is in links(a) iff a is in links(b).
 * Partial mesh keeps the graph connected (the ring alone does) with a small diameter.
 */
export function meshLinks(me: string, conns: readonly string[], fullMeshMax = FULL_MESH_MAX): string[] {
  const ring = [...new Set(conns)].sort()
  const i = ring.indexOf(me)
  if (i < 0) return []
  const n = ring.length
  if (n <= fullMeshMax) return ring.filter((c) => c !== me)
  const half = Math.floor(n / 2)
  return ring.filter((_, j) => {
    if (j === i) return false
    const d = ringDistance(i, j, n)
    return d <= RING_REACH || d === half
  })
}

/** Whether the mesh is complete for me, in which case nobody needs to forward board events. */
export const isFullMesh = (n: number, fullMeshMax = FULL_MESH_MAX): boolean => n <= fullMeshMax

/** The side that sends the WebRTC offer: the lower connection id (avoids offer glare). */
export const isInitiator = (me: string, other: string): boolean => me < other

/**
 * The peer that re-seeds the relay when someone joins: the lowest connection id among the
 * participants that hold the board. Every peer computes the same answer from the same list, so
 * exactly one of them uploads (the others stay quiet). null when nobody holds the board.
 */
export function seederOf(holders: readonly string[]): string | null {
  return [...holders].sort()[0] ?? null
}

/** Splits a list into chunks (data channel messages stay well under the 256 KB SCTP limit). */
export function chunks<T>(items: readonly T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += Math.max(1, size)) out.push(items.slice(i, i + Math.max(1, size)))
  return out
}

/** Bounded set of recently seen ids, to forward each frame at most once (flooding). */
export class SeenSet {
  private readonly order: string[] = []
  private readonly set = new Set<string>()
  constructor(private readonly max = 2_000) {}

  /** True the first time an id is seen. */
  add(id: string): boolean {
    if (this.set.has(id)) return false
    this.set.add(id)
    this.order.push(id)
    if (this.order.length > this.max) this.set.delete(this.order.shift()!)
    return true
  }
}
