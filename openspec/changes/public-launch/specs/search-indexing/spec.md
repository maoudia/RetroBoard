# Spec Delta

## Purpose
Which pages of the site search engines may index and how they are described to them: robots rules, canonical URLs, language alternates, a sitemap and one indexable page per retro format, while board pages stay out of every index.

## ADDED Requirements

### Requirement: Public pages indexable, board pages never
The site SHALL allow indexing of its public pages (landing, setup, legal notice, privacy, terms, accessibility statement, user guide, format pages) through `robots.txt`, the `robots` meta tag and the `X-Robots-Tag` header, and MUST keep every board, join, check, offline and development route out of every index with `noindex, nofollow` on all three channels whatever the setting; the switch between "nothing indexed" (before the launch) and "public pages indexed" SHALL be one configuration value.

#### Scenario: Crawler fetches the landing once indexing is on
- **WHEN** a crawler requests `/` and `/robots.txt` with indexing switched on
- **THEN** the HTML carries no `noindex`, the response carries no `X-Robots-Tag: noindex` and `robots.txt` allows `/` and names the sitemap

#### Scenario: Crawler fetches a board route
- **WHEN** a crawler requests `/boards/` or `/board/`, with indexing switched on or off
- **THEN** the response carries `X-Robots-Tag: noindex, nofollow` and the HTML carries the same `robots` meta

#### Scenario: Indexing switched off
- **WHEN** indexing is switched off
- **THEN** `robots.txt` disallows everything and every HTML page carries `noindex, nofollow`, as before the launch

### Requirement: Canonical and language metadata
Every indexable page SHALL declare its canonical URL on the site origin, its language in the `lang` attribute and, when the page exists in the other language, `hreflang` alternates for French, English and `x-default`; the title and description of the page SHALL be in the language of the page.

#### Scenario: English format page
- **WHEN** a crawler fetches the English page of a format
- **THEN** it finds `lang="en"`, a canonical pointing at that page, an `hreflang="fr"` alternate pointing at the French page and an English title and description

### Requirement: Sitemap
The build SHALL generate `sitemap.xml` at the site origin listing every indexable page in both languages with its last modification date and nothing else, and `robots.txt` SHALL reference it.

#### Scenario: A format is added to the catalogue
- **WHEN** the catalogue gains a format and the site is generated
- **THEN** the sitemap lists its French and English pages without a manual edit

#### Scenario: No private URL in the sitemap
- **WHEN** the sitemap is read
- **THEN** it contains no `/boards`, `/board`, `/check`, `/offline` or `/dev` URL

### Requirement: Format pages
The site SHALL serve one page per retro format of the catalogue, in French and in English at their own URLs, with the format name, what it is for, its columns with their hints, the goals and time it suits, a "Start this format" action that opens the setup page with that format selected, and links to the other formats; the content SHALL come from the catalogue so that a page cannot describe a format the product does not offer.

#### Scenario: Visitor starts from a format page
- **WHEN** a visitor opens the Starfish page and chooses "Start this format"
- **THEN** the setup page opens with Starfish selected and the visitor continues the usual creation flow

#### Scenario: Lighthouse on a format page
- **WHEN** Lighthouse audits a format page on mobile
- **THEN** the SEO score is 100, accessibility reports no violation and no request left the site origin

#### Scenario: Format changed in the catalogue
- **WHEN** the name or the columns of a format change in the catalogue
- **THEN** its pages show the new text at the next generation without a change to the pages
