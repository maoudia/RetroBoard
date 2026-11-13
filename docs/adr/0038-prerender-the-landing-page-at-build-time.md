---
status: accepted
date: 2026-11-13
decision-makers: Moncef Aoudia
---

# Prerender the landing page at build time

## Context and Problem Statement

Every route was a client-rendered shell (`ssr: false`): the HTML of the landing carried no content, so its first paint
and its largest contentful paint (the hero subtitle) waited for the whole entry bundle (about 190 KiB of modulepreloaded
scripts), then the page chunk, then its stylesheet. On the mobile profile Lighthouse scored 90 locally (LCP 3.6 s) and
91 in the launch study; the R2 gate asks for more than 95 on the landing (`docs/roadmap.md`, change
`landing-speed-and-accessibility`). How does the landing paint before any script, within the constraints of
a static site under a strict CSP?

## Decision Drivers

* The R2 launch gate: Lighthouse mobile above 95 on the landing, accessibility without violation.
* Strict CSP without `'unsafe-inline'` (openspec/config.yaml): a style attribute written in the markup is refused.
* No server-side state: settings, recent boards and identity live in the visitor's browser only.
* The board stays client-rendered (crypto, storage and sockets need the browser); zero infrastructure cost.

## Considered Options

* Keep the shell and trim the critical path (fewer preloads, a lazily loaded transport): LCP estimated around 2 s on the
  simulated 4G profile, a borderline 95.
* A static loading template that repeats the hero text: one language only, markup duplicated by hand.
* Prerender the landing with Nuxt hybrid rendering: `ssr: true` with `routeRules` keeping every other route a
  client-rendered shell; the content is in `index.html` and the largest contentful paint comes with the stylesheet.

## Decision Outcome

Chosen option: "Prerender the landing with Nuxt hybrid rendering", because the paint no longer depends on the scripts at
all (LCP equals the arrival of the CSS), the light background shows from the first frame instead of after hydration, and
every other route keeps its shell, so the board code is untouched.

### Consequences

* Good, because the landing is readable before any script and the Lighthouse mobile score clears the gate with margin
  (measurements in the pull request of task group 3).
* Good, because every page is still a prerendered file (ADR-0034): `nitro.prerender.routes` is built from the pages
  directory, the crawler is off. App routes are written as `route.html` (`autoSubfolderIndex: false`), so a direct load
  of `/new` or of an invite link `/boards#...` is answered at once instead of a 307 to the trailing-slash form; the
  guide under `public/guide/` keeps its folders.
* Bad, because prerendered markup must not carry a style attribute: a value that depends on data is bound once mounted
  (dialog width, avatar hue, stage tilt) or comes from a stylesheet (theme swatches, delays, hero mock colours). The Nitro
  plugin `apps/web/server/plugins/prerendered-markup.ts` drops Iconify's empty `style=""` and fails the build on any other.
* Bad, because the client must not hydrate its stores from the build-time snapshot: `plugins/prerender-payload.server.ts`
  removes the Pinia state from the payload; the stores read the visitor's storage as before.
* Bad, because hydration happens in the rendered language (French, the default locale): the visitor's language is
  applied on `app:suspense:resolve`, before the next frame, so the markup matches first (`plugins/theme.client.ts`).
* Bad, because the setup code reached from the landing runs at build time too: `document`, `window` and `navigator`
  reads are guarded (`adapters/webmcp.ts`, `composables/useJoinByCode.ts`, `utils/storage.ts`, `components/FeedbackLinks.vue`).

## More Information

* ADR-0032 and ADR-0034: the Worker and the asset layer; every app route is a prerendered file.
* Revisit when the public pages (legal notice, privacy, terms, accessibility statement) should be prerendered too: add
  them to `routeRules` and keep their components free of inline styles.
