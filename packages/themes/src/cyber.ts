import type { ThemeDefinition } from './types'

export const cyber: ThemeDefinition = {
  id: 'cyber',
  name: 'Cyber',
  tagline: 'Néons, grille et terminal',
  group: 'fun',
  scheme: 'dark',
  tokens: {
    bg: '#07080f', bg2: '#151238', surface: '#0f1224', surface2: '#181c36', border: '#2b3263',
    text: '#e9eeff', muted: '#a0a9d6', accent: '#2ee6ff', accent2: '#ff4df0', accentInk: '#03161a',
    danger: '#ff6b8b', success: '#6dffb0', noteInk: '#0a0c18',
  },
  /** The light variant (each participant picks light or dark; the board theme stays the same). */
  alt: {
    bg: '#f2f5ff', bg2: '#e3e8ff', surface: '#ffffff', surface2: '#eef1ff', border: '#c5cdf2', text: '#0a0c1e', muted: '#4a5280', accent: '#0a6f80', accent2: '#a3159a', accentInk: '#ffffff', danger: '#c4123d', success: '#0b7a45', noteInk: '#0a0c18',
  },
  noteColors: ['#7df9ff', '#c7a6ff', '#b8ff9e', '#ff9ee8', '#ffe66d', '#ffb38a', '#9ec5ff', '#8ff7c8'],
  fonts: { display: '"Space Grotesk Variable", system-ui, sans-serif', body: '"Space Grotesk Variable", system-ui, sans-serif', mono: '"JetBrains Mono", ui-monospace, monospace' },
  radius: { card: 14, control: 10 },
  motion: { enter: 'glitch', leave: 'fade', enterMs: 460, ease: 'cubic-bezier(.2,.9,.3,1)', ambient: 'matrix' },
  copy: {
    hero: 'Une rétro en temps réel. Pas de compte: le lien est la clé.',
    emptyColumn: 'Aucune donnée. Pour l\'instant.',
    privateHint: 'Brouillons chiffrés par... ton navigateur.',
  },
  loadFonts: () => Promise.all([
    import('@fontsource-variable/space-grotesk/index.css'),
    import('@fontsource/jetbrains-mono/latin-500.css'),
  ]),
}
