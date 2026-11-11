import { describe, expect, it } from 'vitest'
import { alice, bob, harness } from '@retroboard/testkit'
import { sealedReveal } from '../src'

describe('sealedReveal', () => {
  function board() {
    const h = harness()
    h.run({ t: 'note.add', columnId: h.col(0), text: 'a' })
    h.run({ t: 'note.add', columnId: h.col(0), text: 'b' })
    h.run({ t: 'settings.update', sealedBallot: true, ballotKey: 'k'.repeat(43), voteLimit: 2 })
    const [a, b] = Object.values(h.state.notes).sort((x, y) => x.text.localeCompare(y.text)).map((n) => n.id) as [string, string]
    return { h, a, b }
  }
  const sealed = (n: number) => `S${n}`.padEnd(134, 'x')

  it('opens every ballot in log order and reveals counts only', async () => {
    const { h, a, b } = board()
    h.run({ t: 'vote.seal', sealed: sealed(1) }, alice)
    h.run({ t: 'vote.seal', sealed: sealed(2) }, bob)
    h.run({ t: 'vote.seal', sealed: sealed(3) }, bob)
    const choices: Record<string, { kind: 'note'; id: string } | null> = { [sealed(1)]: { kind: 'note', id: a }, [sealed(2)]: { kind: 'note', id: a }, [sealed(3)]: { kind: 'note', id: b } }
    const asked: string[] = []
    const reveal = await sealedReveal(h.state, async (voter, value) => { asked.push(`${voter}:${value}`); return choices[value]! })
    expect(asked).toEqual([`${alice.cid}:${sealed(1)}`, `${bob.cid}:${sealed(2)}`, `${bob.cid}:${sealed(3)}`])
    expect(reveal).toEqual({ t: 'vote.reveal', counts: [{ kind: 'note', id: a, votes: 2 }, { kind: 'note', id: b, votes: 1 }].sort((x, y) => (x.id < y.id ? -1 : 1)) })
    expect(JSON.stringify(reveal)).not.toContain(alice.cid)
    expect(h.run(reveal, alice).ok).toBe(true)
  })

  it('skips ballots that do not open and reveals nothing for a board without ballots', async () => {
    const { h, a } = board()
    h.run({ t: 'vote.seal', sealed: sealed(1) }, alice)
    h.run({ t: 'vote.seal', sealed: sealed(2) }, bob)
    const reveal = await sealedReveal(h.state, async (_voter, value) => (value === sealed(1) ? null : { kind: 'note', id: a }))
    expect(reveal.counts).toEqual([{ kind: 'note', id: a, votes: 1 }])
    // Nothing to open on a board without ballots: the opener is never asked.
    const asked: unknown[] = []
    expect(await sealedReveal(harness().state, async (...args) => { asked.push(args); return null })).toEqual({ t: 'vote.reveal', counts: [] })
    expect(asked).toEqual([])
  })
})
