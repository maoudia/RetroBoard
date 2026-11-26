# Launch kit

The material to announce RetroBoard in public, kept in the repository. Change: `public-launch` (group 2). The owner posts it; nothing here is automated.

## Contents

| Path | What |
|---|---|
| `posts/<channel>.<fr\|en>.md` | One post per channel and language, ready to paste. Channels: `show-hn`, `product-hunt`, `linkedin`, `devto`. |
| `media/` | Demo video and screenshots per theme (task 2.2 of the change, not generated yet). |

Every post says what the product does, that it is built in public and source available under PolyForm Noncommercial 1.0.0 (never "open source"), that nothing is stored and boards are end-to-end encrypted, and links the landing, the repository and the user guide. `scripts/launch/test/posts.test.ts` pins this: both languages per channel, the three links, the license, and only features that the landing names (`landing.f.*.h` in `packages/i18n`). When a post changes, run `pnpm test`.

## Channels and order

| Order | Channel | Language to post | Who | Notes |
|---|---|---|---|---|
| 1 | Show HN | `en` | Owner | Link post to the landing, then paste the first comment. Tuesday to Thursday, morning US Eastern. Stay online for the first two hours to answer. |
| 2 | LinkedIn | `fr`, then `en` | Owner, personal profile | Attach the demo video once `media/` has it. |
| 3 | dev.to | `en`, optionally `fr` | Owner | Set `published: true` in the header when posting. |
| 4 | Product Hunt | `en` | Owner (maker account) | Same day as Show HN or a week later: open question of the change design (two launches on one day split the attention). Schedule it in the Product Hunt dashboard. |

French posts go to French-speaking audiences (LinkedIn France, French dev communities); English posts everywhere else.

## Day-of checklist

Before posting:

- [ ] `pnpm launch:check` passes and `docs/launch/readiness.md` carries today's date (task group 3 of the change; until it lands, check the gates of `docs/roadmap.md` by hand).
- [ ] `docs/runbooks/deploy.md`: the `indexing` switch decision is taken and, if on, deployed (the format pages are only found by search once it is).
- [ ] The landing and the guide load in both languages (`/`, `/guide/en/`, `/guide/fr/`), a new board can be created and joined from a second browser.
- [ ] The latest release is green on main and the repository README renders (badges, license line).
- [ ] Each post reads as the landing does: re-read it against `packages/i18n` if the landing copy changed.

While posting:

- [ ] Paste the post of the channel, check the three links resolve and carry no tracking parameter.
- [ ] Reply to every comment the first day. Answer encryption questions with `docs/adr/0004-end-to-end-encryption-with-keys-in-the-link.md`.
- [ ] Note feedback as GitHub issues, not in chat threads.

After posting:

- [ ] Record the date and the links of the posts in the epic issue.
- [ ] Archive the change `public-launch` once the posts are out and the readiness report of the day is committed.
