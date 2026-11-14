import { describe, expect, it } from 'vitest'
import { saveEntry } from '@retroboard/application'
import { deriveVaultKeys, randomKey, sealObject, utf8 } from '@retroboard/crypto'
import { createMemoryTarget } from '@retroboard/testkit'
import { createLibraryStore, createLocalVault } from '../app/adapters/sync/local-vault'

/** Change user-drive-storage: nothing a person typed reaches a target, whatever the target (here the in-memory fake with the guard). */
const CANARIES = [
  'CANARY-title-7f3a', 'CANARY-note-91bc', 'CANARY-name-c04e', 'CANARY-team-5d21', 'CANARY-setting-a8f6', 'CANARY-fragment-2e8d', 'CANARY-board-id-b7a9',
]
const [TITLE, NOTE, NAME, TEAM, SETTING, FRAGMENT, BOARD] = CANARIES as [string, string, string, string, string, string, string]

describe('plaintext canary on the fake target', () => {
  async function seeded() {
    const target = createMemoryTarget()
    const key = randomKey()
    const vault = createLocalVault(target, async () => key)
    const library = createLibraryStore(vault)
    await library.update((l) => saveEntry(l, { boardId: BOARD, title: TITLE, teamId: TEAM, role: 'facilitator', origin: 'created', fragment: `#c=${FRAGMENT}`, hasPasscode: true }, 1000, 'dev'))
    // The streams of the next group, written through the same sealing: settings, identity, workspace (team names, saved actions).
    await vault.update('settings', () => ({ locale: 'fr', defaultTheme: SETTING, shortcuts: false }))
    await vault.update('identity', () => ({ name: NAME, showName: true }))
    await vault.update('workspace', () => ({ teams: { t1: { value: { id: 't1', name: TEAM }, stamp: { at: 1, device: 'dev' } } }, retros: [{ boardId: BOARD, title: TITLE, actions: [{ text: NOTE }] }], owners: [NAME] }))
    // A board stream: the notes of a board in a segment, sealed with a stream key as the engine will.
    const keys = await deriveVaultKeys(key, 'local')
    const stream = await keys.streamId(`board:${BOARD}`)
    await target.put(`s/${stream}/dev-1-abcdefgh.rbs`, await sealObject(await keys.stream(stream), '6c6f63616c000001', { pathClass: 'seg', stream }, utf8(JSON.stringify([{ note: NOTE, author: NAME }]))))
    return { target, library }
  }

  it('finds no title, note, name, team, setting, link or board id in any path or any stored byte', async () => {
    const { target } = await seeded()
    expect(target.seenBodies.length).toBeGreaterThanOrEqual(5)
    expect(() => target.assertNoPlaintext(CANARIES)).not.toThrow()
    for (const path of target.objects().keys()) expect(path).toMatch(/^s\/[a-z2-7]{26}\/(local\.rbs|dev-1-abcdefgh\.rbs)$/)
  })

  it('still reads everything back through the vault', async () => {
    const { library } = await seeded()
    expect(Object.keys(await library.load())).toEqual([BOARD])
  })

  it('would catch a plaintext write: the guard fails when a title is planted in a body or a path', async () => {
    const bodyLeak = await seeded()
    await bodyLeak.target.put('s/aaaaaaaaaaaaaaaaaaaaaaaaaa/leak.rbs', utf8(`{"title":"${TITLE}"}`))
    expect(() => bodyLeak.target.assertNoPlaintext(CANARIES)).toThrow(/plaintext reached the target/)
    const pathLeak = await seeded()
    await pathLeak.target.put(`s/${NAME.toLowerCase()}/x.rbs`, new Uint8Array(4))
    expect(() => pathLeak.target.assertNoPlaintext(CANARIES)).toThrow(/in the path/)
  })
})
