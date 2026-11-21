/**
 * The command of a poker room inside a signed event (change scrum-poker, ADR-0042). The wire only checks the shape: the fold is the judge of
 * every value (round id, key, sealed card, deck, name), identically on every replica, so the schema does not repeat those rules.
 */
import * as v from 'valibot'

const Text = v.string()

export const PokerCommandSchema = v.variant('t', [
  v.strictObject({ t: v.literal('seat.join'), name: Text }),
  v.strictObject({ t: v.literal('settings.update'), deck: v.optional(v.array(Text)), autoReveal: v.optional(v.boolean()) }),
  v.strictObject({ t: v.literal('round.start'), round: Text, pub: Text, revote: v.optional(v.boolean()) }),
  v.strictObject({ t: v.literal('vote.seal'), round: Text, sealed: Text }),
  v.strictObject({ t: v.literal('round.reveal'), round: Text, key: Text }),
])
