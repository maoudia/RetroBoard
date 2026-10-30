import { agendaRunning, allowedInPhase, type Snapshot } from '@retroboard/domain'

/**
 * What participants can do about votes right now (change facilitator-controls-v2):
 * - open: votes are accepted;
 * - overridden: the phase does not allow voting but the facilitator opened it for everyone (ends at the next phase change);
 * - phase-closed: the current phase is not the Vote phase;
 * - closed: the facilitator closed voting (results are shown).
 */
export type VotingState = 'open' | 'overridden' | 'phase-closed' | 'closed'

export function votingState(s: Pick<Snapshot, 'settings' | 'agenda'>): VotingState {
  if (s.settings.votingClosed) return 'closed'
  if (!allowedInPhase(s.agenda, 'vote.add')) return 'phase-closed'
  return agendaRunning(s.agenda) && s.agenda.voteOpen && s.agenda.rules && s.agenda.phases[s.agenda.current]?.kind !== 'vote' ? 'overridden' : 'open'
}
