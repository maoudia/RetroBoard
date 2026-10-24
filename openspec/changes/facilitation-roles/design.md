# Design

## Decisions

- Roles are derived by folding signed `RoleGranted`/`RoleRevoked`/`FacilitatorHandedOver` events from the genesis key; co-facilitators are identified by their session public key.
- Hand-over transfers a new facilitator secret through an X25519 sealed message to the recipient's key; the old secret stays valid for co-facilitator rights only.
- "Hide participant" is a signed event; every peer filters that key's later events from views (they stay in the log for audit until the board ends).
- Where it lives: `domain/facilitation` (Role, Policy), `application` (GrantRole, HandOver, HideParticipant), web UI badges.

Security and privacy note: E2E means a key holder can always read the board; the UI says so honestly.
