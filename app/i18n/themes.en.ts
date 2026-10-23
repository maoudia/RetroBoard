export interface ThemeText { tagline: string; hero: string; emptyColumn: string; privateHint: string }

/** English texts of the themes. French lives next to each theme definition. */
export const THEMES_EN: Readonly<Record<string, ThemeText>> = {
  studio: { tagline: 'White and grey, clean', hero: 'A clear, real-time retrospective. The link is all you need.', emptyColumn: 'Nothing here yet.', privateHint: 'Only visible to you until you publish.' },
  corporate: { tagline: 'Bright, blue, committee-ready', hero: 'A structured retrospective, in real time. The link is enough, no account.', emptyColumn: 'No notes yet.', privateHint: 'Only visible to you until you publish.' },
  slate: { tagline: 'Dark, sober, focused', hero: 'A quiet retro. One link, zero accounts.', emptyColumn: 'Nothing to report.', privateHint: 'Local draft, published when you decide.' },
  paper: { tagline: 'Editorial, warm paper, serif', hero: 'Take the time to reread the sprint. One link is enough.', emptyColumn: 'The page is blank.', privateHint: 'Your draft, for your eyes only.' },
  minimal: { tagline: 'Sober, clear, no distraction', hero: 'One retro, one link, zero accounts.', emptyColumn: 'No notes.', privateHint: 'Only visible to you until you publish.' },
  halloween: { tagline: 'Crypt, bats and pumpkins', hero: 'The board link is the invitation. No account, no ghost to identify.', emptyColumn: 'Nothing lurks here... yet.', privateHint: 'Write in your crypt, nobody sees.' },
  noel: { tagline: 'Tree, snow and garlands', hero: 'A retro board by the fireside. The link is enough, nobody needs an account.', emptyColumn: 'Not a gift under the tree.', privateHint: 'Your secret list, visible only to you.' },
  cyber: { tagline: 'Neon, grid and terminal', hero: 'A real-time retro. No account: the link is the key.', emptyColumn: 'No data. For now.', privateHint: 'Drafts encrypted by... your browser.' },
  sakura: { tagline: 'Cherry blossoms, soft and bright', hero: 'Breathe. Share. The link is enough, no account.', emptyColumn: 'The garden is calm.', privateHint: 'Your notebook, visible only to you.' },
}
