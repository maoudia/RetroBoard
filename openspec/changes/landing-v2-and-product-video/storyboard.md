# Storyboard: the product walkthrough (task 1.1, draft for the owner's review)

Seven scenes, about 6 s each, 42 s in all, looping. Built from the real interface (HTML and CSS, no video file). Each scene has one
caption in the page language (fr source, en), at most 8 words so it fits a phone at 360 px and the pseudo-locale (+40 %). A pause
button stops the loop; with reduced motion the seven frames are shown as a static, captioned sequence.

| # | Scene | What moves on screen | Caption fr | Caption en |
|---|---|---|---|---|
| 1 | Create | The creation form: a format is picked, a theme applied, "Start" is pressed. | Choisis un format et un theme. | Pick a format and a theme. |
| 2 | Share | The board opens; the link and the QR code appear; three avatars join one by one. | Un lien, et l'equipe est la. | One link and the team is in. |
| 3 | Write | Drafts appear privately in each column (dashed outline), then are published and become sticky notes. | Ecris en prive, publie d'un clic. | Write in private, publish in one click. |
| 4 | Group | One note is dragged onto another; they stack and a group title appears. | Glisse un post-it pour regrouper. | Drop a note to group. |
| 5 | Vote | The agenda ring moves to the vote phase; dots are spent on the groups, the counters fall. | Vote avec un nombre limite de points. | Vote with a limited number of dots. |
| 6 | Podium | The ring closes; the three most voted groups climb the podium. | Les idees gagnantes montent au podium. | The winning ideas climb the podium. |
| 7 | Actions | A podium idea becomes an action with an owner and a due date; the Markdown export is offered. | Decide des actions, exporte le compte rendu. | Decide the actions, export the summary. |

## Rules

- Every string goes through i18n (`landing.video.*`), fr and en, and passes the pseudo-locale overflow check at 360 px.
- No inline style or script (strict CSP); motion is CSS only and stops under `prefers-reduced-motion`.
- The pause control is a real button with an accessible name and a visible focus ring; the current caption is in a polite live region only when the
  visitor presses play (a looping caption must not talk over a screen reader).
- The sample content is neutral (Sprint 42 notes, as in the hero mock) and uses the shared design tokens.
- Budget: the walkthrough adds no request on first paint (it hydrates below the fold) and keeps the landing's Lighthouse mobile score above 95.

## Open questions for the owner

1. Scenes and order: keep these seven, or merge Share into Create to get six?
2. Length: 6 s per scene, or a faster 4 s?
3. Captions: confirm the tone (informal "tu" in fr, as on the rest of the landing).
4. Is a spoken-free social cut (task 1.3, WebM) wanted with the same captions burnt in?

Approval is the owner's comment on the pull request; task 1.1 stays unticked until then, and 1.2 and 1.3 do not start before.
