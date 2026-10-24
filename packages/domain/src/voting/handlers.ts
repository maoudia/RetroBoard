import { done, fail, type HandlerMap } from '../shared/outcome'

/** Voting context: dot votes with a per-person limit. */
export const votingHandlers: HandlerMap<'vote.toggle'> = {
  'vote.toggle': (s, c, a) => {
    if (s.settings.locked) return fail('locked')
    const n = s.notes[c.id]
    if (!n) return fail('not-found')
    const has = n.voters.includes(a.cid)
    if (!has) {
      const used = Object.values(s.notes).filter((x) => x.voters.includes(a.cid)).length
      if (used >= s.settings.voteLimit) return fail('vote-limit')
    }
    const voters = has ? n.voters.filter((v) => v !== a.cid) : [...n.voters, a.cid]
    return done({ ...s, notes: { ...s.notes, [n.id]: { ...n, voters } } }, { notes: [n.id] })
  },
}
