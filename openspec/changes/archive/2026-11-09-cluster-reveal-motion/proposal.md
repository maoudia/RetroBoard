# Proposal

## Why

Clusters hide their notes behind a stack. Participants want to peek inside quickly (hover on a computer, tap on a phone) and the opening and closing should feel smooth and natural, like the system animations people know from their phones. The best interaction is not known yet: the owner wants to try several.

## What Changes

- Peek: on pointer devices, hovering a cluster for 300 ms shows its notes in a floating preview; on touch devices a tap opens it (no hover on touch).
- Open and close with a spring animation from the stack to the expanded notes and back, respecting reduced motion.
- Three variants built behind a local setting so the team can compare them on real boards: accordion (expand in place), fan (notes spread like a hand of cards), sheet (a panel slides up). One becomes the default after the comparison; the others are removed.

Out of scope: merge and split (already shipped), cluster titles.

Bounded contexts: Ideation (presentation only). No relay traffic.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `grouping`: peek and open interactions, animation.

## Impact

- Web: GroupCard, GroupPanel, a `useClusterReveal` composable, profile setting for the variant during the trial.
