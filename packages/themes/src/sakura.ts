import type { ThemeDefinition } from './types'

export const sakura: ThemeDefinition = {
  id: 'sakura',
  name: 'Sakura',
  tagline: 'Cerisiers en fleurs, doux et lumineux',
  group: 'fun',
  scheme: 'light',
  tokens: {
    bg: '#fff6f9', bg2: '#ffe3ee', surface: '#ffffff', surface2: '#fff0f5', border: '#f1c6d6',
    text: '#3a2230', muted: '#7d5568', accent: '#b93562', accent2: '#3b7a46', accentInk: '#ffffff',
    danger: '#c62a47', success: '#2d7742', noteInk: '#3a2230',
  },
  /** The dark variant (each participant picks light or dark; the board theme stays the same). */
  alt: {
    bg: '#1e1218', bg2: '#2a1822', surface: '#26161f', surface2: '#311d29', border: '#4d2c3d', text: '#fbeef3', muted: '#d1a7ba', accent: '#ff7aa6', accent2: '#7fd08a', accentInk: '#2b0714', danger: '#ff7d93', success: '#7fd08a', noteInk: '#3a2230',
  },
  noteColors: ['#ffd1dc', '#ffe8b3', '#d4f0d0', '#d0e6ff', '#e6d4ff', '#ffd9c2', '#cdf3ee', '#fff4b8'],
  fonts: { display: '"Zen Maru Gothic", system-ui, sans-serif', body: '"Quicksand Variable", system-ui, sans-serif', mono: 'ui-monospace, monospace' },
  radius: { card: 22, control: 14 },
  motion: { enter: 'bloom', leave: 'fade', enterMs: 680, ease: 'cubic-bezier(.25,1.2,.4,1)', ambient: 'petals' },
  copy: {
    hero: 'Respire. Partage. Le lien suffit, sans compte.',
    emptyColumn: 'Le jardin est calme.',
    privateHint: 'Ton carnet, visible de toi seul.',
  },
  loadFonts: () => Promise.all([
    import('@fontsource/zen-maru-gothic/latin-500.css'),
    import('@fontsource/zen-maru-gothic/latin-700.css'),
    import('@fontsource-variable/quicksand/index.css'),
  ]),
}
