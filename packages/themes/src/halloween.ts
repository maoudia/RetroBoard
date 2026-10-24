import type { ThemeDefinition } from './types'

export const halloween: ThemeDefinition = {
  id: 'halloween',
  name: 'Halloween',
  tagline: 'Crypte, chauves-souris et citrouilles',
  group: 'fun',
  scheme: 'dark',
  tokens: {
    bg: '#120e1a', bg2: '#241538', surface: '#1c1628', surface2: '#271e38', border: '#3d3058',
    text: '#f1e9da', muted: '#b3a8c9', accent: '#ff8a1f', accent2: '#a78bfa', accentInk: '#1c1424',
    danger: '#ff7a66', success: '#7ee2a0', noteInk: '#1c1424',
  },
  /** The light variant (each participant picks light or dark; the board theme stays the same). */
  alt: {
    bg: '#fbf6ef', bg2: '#f1e6d6', surface: '#ffffff', surface2: '#f7efe3', border: '#e2cfb4', text: '#1f1726', muted: '#5f5470', accent: '#b4520a', accent2: '#6d4bc9', accentInk: '#ffffff', danger: '#b3261e', success: '#1d7a45', noteInk: '#1c1424',
  },
  noteColors: ['#ffb561', '#dce4ff', '#c9bfe8', '#a8e6a2', '#ffb3cc', '#fff0a8', '#9ee7e0', '#ffc9a8'],
  fonts: { display: '"Pirata One", Georgia, serif', body: '"Alegreya Sans", system-ui, sans-serif', mono: 'ui-monospace, monospace' },
  radius: { card: 10, control: 8 },
  motion: { enter: 'drop', leave: 'poof', enterMs: 640, ease: 'cubic-bezier(.34,1.56,.64,1)', ambient: 'bats' },
  copy: {
    hero: 'Le lien du board sert d\'invitation. Aucun compte, aucun fantôme à identifier.',
    emptyColumn: 'Rien ne rôde ici... pour l\'instant.',
    privateHint: 'Écris dans ta crypte, personne ne voit.',
  },
  loadFonts: () => Promise.all([
    import('@fontsource/pirata-one/latin-400.css'),
    import('@fontsource/alegreya-sans/latin-400.css'),
    import('@fontsource/alegreya-sans/latin-500.css'),
    import('@fontsource/alegreya-sans/latin-700.css'),
  ]),
}
