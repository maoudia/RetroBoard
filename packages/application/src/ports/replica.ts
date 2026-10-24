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
  /** Adds records (ignores ids already stored) and marks the room as used now. */
  append(roomId: string, records: readonly ReplicaRecord[]): Promise<void>
  /** Deletes rooms not used since `before` (epoch ms). Returns how many rooms were deleted. */
  purge(before: number): Promise<number>
  delete(roomId: string): Promise<void>
}
