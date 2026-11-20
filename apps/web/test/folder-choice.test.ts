import { describe, expect, it } from 'vitest'
import { createFakeDirectory } from '@retroboard/testkit'
import { classifyFolder, copyVault, inspectFolder } from '../app/adapters/sync/folder-choice'
import { openVaultFolder } from '../app/adapters/sync/folder-handle'
import { createFolderTarget } from '../app/adapters/sync/folder-target'

const idOf = (bytes: Uint8Array): string | null => { try { return (JSON.parse(new TextDecoder().decode(bytes)) as { vaultId?: string }).vaultId ?? null } catch { return null } }
const info = (vaultId: string) => new TextEncoder().encode(JSON.stringify({ vaultId }))

/** A picked folder that holds a vault: its `RetroBoard` subfolder with an `info.json`. */
async function folderWith(vaultId: string | null, name = 'Picked') {
  const dir = createFakeDirectory(name)
  if (vaultId !== null) await createFolderTarget(await openVaultFolder(dir, true)).put('info.json', info(vaultId))
  return dir
}

describe('what a picked folder holds (change sync-ux, 2.1)', () => {
  it('an empty folder, the same vault, another vault, and a vault whose info cannot be read yet', async () => {
    expect(await inspectFolder(await folderWith(null), idOf)).toEqual({ kind: 'empty' })
    expect(await inspectFolder(await folderWith('v1'), idOf)).toEqual({ kind: 'vault', id: 'v1' })
    const half = createFakeDirectory('Half')
    await createFolderTarget(await openVaultFolder(half, true)).put('info.json', new TextEncoder().encode('{'))
    expect(await inspectFolder(half, idOf)).toEqual({ kind: 'vault', id: null })
  })

  it('classifies the move by vault id: the same vault continues, another is asked about, an empty folder is offered a copy, nothing connected means a fresh setup', async () => {
    const same = await inspectFolder(await folderWith('v1'), idOf)
    const other = await inspectFolder(await folderWith('v2'), idOf)
    const empty = await inspectFolder(await folderWith(null), idOf)
    expect(classifyFolder(same, 'v1')).toBe('same')
    expect(classifyFolder(other, 'v1')).toBe('other')
    expect(classifyFolder({ kind: 'vault', id: null }, 'v1')).toBe('other')
    expect(classifyFolder(empty, 'v1')).toBe('empty')
    for (const content of [same, other, empty]) expect(classifyFolder(content, null)).toBe('new')
  })

  it('a vault moved with the person\'s own tools is the same vault wherever the folder is', async () => {
    const before = await folderWith('v1', 'OldPlace')
    const after = createFakeDirectory('NewPlace')
    await copyVault(createFolderTarget(await openVaultFolder(before, false)), createFolderTarget(await openVaultFolder(after, true)))
    expect(classifyFolder(await inspectFolder(after, idOf), 'v1')).toBe('same')
  })

  it('copies every object as it is, and only into the vault folder of the new place', async () => {
    const from = await folderWith('v1')
    const source = createFolderTarget(await openVaultFolder(from, false))
    await source.put('a1b2.rbs', new Uint8Array([1, 2, 3]))
    const to = createFakeDirectory('Empty')
    const copied = await copyVault(source, createFolderTarget(await openVaultFolder(to, true)))
    expect(copied).toBe(2)
    const target = createFolderTarget(await openVaultFolder(to, false))
    expect(Array.from((await target.get('a1b2.rbs'))!.bytes)).toEqual([1, 2, 3])
    expect(idOf((await target.get('info.json'))!.bytes)).toBe('v1')
  })
})
