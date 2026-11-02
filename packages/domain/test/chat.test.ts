import { describe, expect, it } from 'vitest'
import { alice, bob, harness } from '@retroboard/testkit'
import { allowedInPhase, buildSnapshot, CHAT_MAX_MESSAGES, CHAT_TEXT_MAX, isPrivileged, newAgenda, reduce } from '@retroboard/domain'

describe('board chat (change board-chat)', () => {
  it('posts a trimmed line with the author name, or none for an anonymous author', () => {
    const h = harness()
    expect(h.run({ t: 'chat.post', text: '  hello team  ' }, alice).ok).toBe(true)
    h.tick(5)
    h.run({ t: 'chat.post', text: 'psst' }, bob)
    expect(h.state.chat).toMatchObject([{ cid: alice.cid, name: 'Alice', text: 'hello team' }, { cid: bob.cid, name: null, text: 'psst' }])
    expect(h.state.chat![1]!.at).toBeGreaterThanOrEqual(h.state.chat![0]!.at)
    expect(new Set(h.state.chat!.map((m) => m.id)).size).toBe(2)
  })

  it('refuses an empty or too long message, also when it skips the protocol', () => {
    const h = harness()
    expect(h.run({ t: 'chat.post', text: '   ' })).toEqual({ ok: false, error: 'invalid' })
    expect(h.run({ t: 'chat.post', text: 'x'.repeat(CHAT_TEXT_MAX + 1) })).toEqual({ ok: false, error: 'invalid' })
    expect(h.run({ t: 'chat.post', text: 'x'.repeat(CHAT_TEXT_MAX) }).ok).toBe(true)
    const direct = (text: string) => reduce(h.state, { t: 'chat.post', text }, alice, { now: h.now, newId: () => 'idchat001' })
    expect(direct('   ')).toEqual({ ok: false, error: 'invalid' })
    expect(direct('x'.repeat(CHAT_TEXT_MAX + 1))).toEqual({ ok: false, error: 'invalid' })
    expect(h.state.chat).toHaveLength(1)
  })

  it('keeps the last 200 messages, oldest dropped first', () => {
    const h = harness()
    for (let i = 0; i < CHAT_MAX_MESSAGES + 5; i++) h.run({ t: 'chat.post', text: `m${i}` })
    expect(h.state.chat).toHaveLength(CHAT_MAX_MESSAGES)
    expect(h.state.chat![0]!.text).toBe('m5')
    expect(h.state.chat!.at(-1)!.text).toBe(`m${CHAT_MAX_MESSAGES + 4}`)
  })

  it('works on a locked board and in every phase of a running agenda', () => {
    const h = harness()
    h.run({ t: 'settings.update', locked: true })
    expect(h.run({ t: 'chat.post', text: 'still here' }).ok).toBe(true)
    const agenda = newAgenda([{ kind: 'write', minutes: 5 }], () => 'idphase01', { rules: true })
    expect(allowedInPhase({ ...agenda, current: 0, startedAt: 1 }, 'chat.post')).toBe(true)
  })

  it('clear empties the chat, is idempotent, and is a facilitator command', () => {
    const h = harness()
    h.run({ t: 'chat.post', text: 'one' })
    expect(isPrivileged({ t: 'cmd', cmd: { t: 'chat.clear' } } as never)).toBe(true)
    expect(isPrivileged({ t: 'cmd', cmd: { t: 'chat.post', text: 'x' } } as never)).toBe(false)
    const out = h.run({ t: 'chat.clear' })
    expect(out.ok && out.dirty.meta).toBe(true)
    expect(h.state.chat).toEqual([])
    const again = h.run({ t: 'chat.clear' })
    expect(again.ok && again.dirty.meta).toBe(false)
  })

  it('the snapshot lists the lines oldest first and marks the viewer\'s own', () => {
    const h = harness()
    h.run({ t: 'chat.post', text: 'from alice' }, alice)
    h.run({ t: 'chat.post', text: 'from bob' }, bob)
    const mine = buildSnapshot(h.state, { cid: alice.cid }, [], h.now)
    expect(mine.chat?.map((m) => [m.text, m.mine, m.name])).toEqual([['from alice', true, 'Alice'], ['from bob', false, null]])
    const theirs = buildSnapshot(h.state, { cid: bob.cid }, [], h.now)
    expect(theirs.chat?.map((m) => m.mine)).toEqual([false, true])
    expect(buildSnapshot(harness().state, { cid: alice.cid }, [], 0).chat).toEqual([])
  })
})
