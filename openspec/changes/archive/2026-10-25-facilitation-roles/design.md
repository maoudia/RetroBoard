# Design

## Decisions

- Roles are derived by folding signed `RoleGranted`/`RoleRevoked`/`FacilitatorHandedOver` events from the genesis key; co-facilitators are identified by their session public key.
- Hand-over makes the recipient's session signing key the facilitator (`lead`); the previous facilitator stays co-facilitator and the genesis key (creator's link) keeps role management rights. No secret is transferred, so a delegated role belongs to the recipient's browser tab: a new tab means a new grant. Changed during implementation (was: send a new facilitator secret through an X25519 sealed message) because it needs no secret on the wire and no extra key management; the sealed transfer can come later for roles that survive a new tab.
- Only the current facilitator or the genesis key may change roles; co-facilitators steer the board but do not grant roles. The facilitator cannot be revoked before handing over, and facilitators cannot be hidden.
- "Facilitation open to everyone" is a board setting: privileged commands are accepted from any participant, role changes are not.
- "Hide participant" is a signed event; every peer filters that key's later events from views (they stay in the log for audit until the board ends).
- Where it lives: `domain/facilitation` (Role, Policy), `application` (GrantRole, HandOver, HideParticipant), web UI badges.

Security and privacy note: E2E means a key holder can always read the board; the UI says so honestly.
