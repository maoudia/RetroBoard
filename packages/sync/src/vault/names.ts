/**
 * The names of a vault's objects (change user-drive-storage, design "Local folder adapter"): lowercase ASCII only, at most
 * 64 characters, so they are safe on every file system and sync client. A name never carries user data: the stream id is a
 * keyed hash and the rest is a device id, counters and random bits.
 */
export const INFO_PATH = 'info.json'
export const MANIFEST_PREFIX = 'm/'
export const STREAM_PREFIX = 's/'

const DEVICE = /^[a-z0-9]{4,13}$/
const STREAM = /^[a-z2-7]{26}$/
const COPY_TAG = /^copy-[0-9a-f]{8}$/

export const isDeviceId = (device: string): boolean => DEVICE.test(device)
export const isStreamId = (id: string): boolean => STREAM.test(id)

export const manifestPath = (device: string): string => `${MANIFEST_PREFIX}${device}.rbm`
export const streamPrefix = (streamId: string): string => `${STREAM_PREFIX}${streamId}/`
export const segmentPath = (streamId: string, device: string, seq: number, rand: string): string =>
  `${streamPrefix(streamId)}${device}-${seq.toString(16).padStart(8, '0')}-${rand}.rbs`
export const checkpointPath = (streamId: string, rand: string): string => `${streamPrefix(streamId)}c-${rand}.rbc`

/** `m/<device>.rbm`, or a conflict copy a sync client made of it (`m/<device>.copy-<hash>.rbm`, named by the adapter). */
export function parseManifestPath(path: string): { device: string; copy: boolean } | null {
  const m = /^m\/([a-z0-9]+)(?:\.(copy-[0-9a-f]{8}))?\.rbm$/.exec(path)
  if (!m || !DEVICE.test(m[1]!)) return null
  return { device: m[1]!, copy: m[2] !== undefined && COPY_TAG.test(m[2]) }
}

/** A conflict copy of `info.json` as an adapter names it: `info.copy-<hash>.json`. */
export const isInfoCopy = (path: string): boolean => /^info\.copy-[0-9a-f]{8}\.json$/.test(path)
