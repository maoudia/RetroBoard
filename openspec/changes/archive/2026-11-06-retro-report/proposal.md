# Proposal

## Why

Teams want an automatic report of the retro: top ideas, decisions, participation and a few metrics, on a separate page they can keep or share, without us storing it.

## What Changes

- Report page generated on the device from the board: summary, podium, all ideas by column and cluster, actions, carried-over action outcomes, participation (counts, talk time shares), phase timings vs plan, vote distribution, ROTI.
- Shareable as a self-contained HTML file (optionally encrypted with a passphrase) and printable to PDF.
- Optional AI-written narrative summary when the local AI companion is enabled.

Out of scope: hosted report links (would require storage).

## Capabilities

### New Capabilities

- `retro-report`: generated report content, metrics and sharing.

### Modified Capabilities

None.

## Impact

- `packages/application` report read model, `packages/exporters` HTML report, web report page.
