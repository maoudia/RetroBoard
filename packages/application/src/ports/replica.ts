/**
 * Local replica of encrypted boards (change stateless-relay-and-replication).
 * Records are opaque: `data` is a serialized envelope whose payload is already encrypted with
 * the room's content key, so the store never holds board content in clear.
 */
export interface ReplicaRecord {
  readonly id: string
  readonly data: string
}

export interface ReplicaStorePort {
  load(roomId: string): Promise<ReplicaRecord[]>
  /**
   * Synchronous, best effort write-ahead copy of records that `append` has not committed yet. The page shows an action
   * before an asynchronous store can commit it, and a tab left in between would lose it: staged records are returned by
   * `load` and committed by the store itself the next time it starts. `append` of the same ids supersedes them.
   */
  stage?(roomId: string, records: readonly ReplicaRecord[]): void
  /** Adds records (ignores ids already stored) and marks the room as used now. */
  append(roomId: string, records: readonly ReplicaRecord[]): Promise<void>
  /** Deletes rooms not used since `before` (epoch ms). Returns how many rooms were deleted. */
  purge(before: number): Promise<number>
  delete(roomId: string): Promise<void>
}
