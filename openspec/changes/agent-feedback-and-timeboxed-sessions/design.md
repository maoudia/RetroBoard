# Design

## Decisions
- Time box as a signed grant event with `expiresAt` (HLC time); events from the agent after expiry are rejected by the fold, so every peer agrees.
- Agent ideas are pending by default: visible to facilitators only until approved (open question: allow auto-approve per board).
- Board text read by agents is untrusted data; agents never receive keys beyond the scope of the grant.
