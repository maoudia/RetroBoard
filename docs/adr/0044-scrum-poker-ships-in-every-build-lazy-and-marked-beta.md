---
status: accepted
date: 2026-11-21
decision-makers: Moncef Aoudia
---

# Scrum Poker ships in every build, lazy and marked beta

## Context and Problem Statement

ADR-0042 chose a poker room as a second room kind and, at the owner's request, let its first playable slice exist only in a build made with `NUXT_PUBLIC_POKER_DEMO=1`, so that nothing changed for users and the bundle budget did not move. The slice is now a complete round (create a room with a deck, join by link with a name, sealed cards, simultaneous reveal, results, vote again, next round) in French and English on phone and desktop, and the owner wants release 1.63 to put it in front of normal users. Change `scrum-poker`, tasks 1.1 and 2.1.

## Decision Drivers

* A user of the normal application must find it and use it with no build switch
* The landing page, the boards and the bundle budget (entry 56.5 kB, total 500 kB) must not pay for pages most visitors never open
* A poker room is never indexed and a poker link must never be mistaken for a board
* No second code path to maintain: one build, one set of tests

## Considered Options

* Keep the flag and build a second deployment with it on
* remove the flag; lazy routes with their own strings, marked beta
* Remove the flag and move the poker strings into the shared dictionaries

## Decision Outcome

Chosen option: "remove the flag; lazy routes with their own strings, marked beta", because it is the only option with one build and one test matrix, and the poker pages, their strings, decks and statistics load only when `/poker` is opened (about 14 kB gzip of lazy chunks, counted in the 500 kB total, none in the entry chunk or the landing page chunk).

* `/poker` and `/poker/room` are in every build. The flag, its build-time route filter and the skipping of its end-to-end spec are gone.
* Entries: a "Scrum Poker" button with a "Beta" mark on the landing page (the same shape as "Try it solo"), a link in its header on wide screens, a button on the library page and a line in the boards menu. Three shared labels (`poker.entry*`) are the only poker strings in the shared dictionaries.
* Indexing is as before: `/poker/room` is a private prefix of the Worker, the shell and the sitemap; `/poker` carries `noindex` and is not in the sitemap until its public page (task 7.1) exists, so the choice stays with the indexing switch of `site.json` then.
* A poker link is told from a board link by the kind in the encrypted genesis, which is the only place the ADR-0042 allows. A board page that meets a poker genesis hands the same fragment to `/poker/room` (a notice of the board transport); a pasted link whose path is `/poker/room` goes there directly. A client older than 1.63 drops the unknown genesis and shows an empty board: nothing can be done for it from here, and the pages are served with `no-cache`, so a reload loads the current client.
* The entry budget goes from 56 to 56.5 kB (56.3 measured): the two routes of the router table and the notice above.

### Consequences

* Good, because poker is real for every user from release 1.63, with the privacy of ADR-0042 unchanged (the relay still sees no kind)
* Good, because the poker end-to-end spec runs in the core gate on every build, and the demo skip logic is gone
* Bad, because the entry chunk grows by 0.3 kB for every page of the product
* Bad, because a poker link opened in a client older than 1.63 shows an empty board until the page is reloaded

## More Information

Amends the paragraph "The test and the demo" of ADR-0042 (the flag), not its decision. Follow-ups are task numbers of `openspec/changes/scrum-poker/tasks.md`: 2.1 (short code, shared transport, library entry), 2.2, 3.x, 7.1.
