import type { ThemeDefinition } from './types'

export const slate: ThemeDefinition = {
  id: 'slate',
  name: 'Slate',
  tagline: 'Sombre, sobre, concentré',
  group: 'pro',
  scheme: 'dark',
  tokens: {
    bg: '#0e1014', bg2: '#151922', surface: '#171b23', surface2: '#1f2430', border: '#2d3443',
    text: '#e7eaf0', muted: '#a3abba', accent: '#6aa9ff', accent2: '#3fd6a0', accentInk: '#08111f',
    danger: '#ff8080', success: '#5ee09a', noteInk: '#111318',
  },
  /** The light variant (each participant picks light or dark; the board theme stays the same). */
  alt: {
    bg: '#f4f6f9', bg2: '#e8ecf2', surface: '#ffffff', surface2: '#f0f2f6', border: '#d3d9e3', text: '#111318', muted: '#4f5869', accent: '#1f5fc7', accent2: '#0f7a57', accentInk: '#ffffff', danger: '#b42318', success: '#127a45', noteInk: '#111318',
  },
  noteColors: ['#fcd34d', '#93c5fd', '#f9a8d4', '#86efac', '#c4b5fd', '#fdba74', '#67e8f9', '#d1d5db'],
  fonts: { display: '"Inter Variable", system-ui, sans-serif', body: '"Inter Variable", system-ui, sans-serif', mono: 'ui-monospace, monospace' },
  radius: { card: 12, control: 8 },
  motion: { enter: 'pop', leave: 'fade', enterMs: 340, ease: 'cubic-bezier(.2,.8,.2,1)', ambient: 'none' },
  copy: {
    hero: 'Une rétro sans bruit. Un lien, zéro compte.',
    emptyColumn: 'Rien à signaler.',
    privateHint: 'Brouillon local, publié quand tu le décides.',
  },
  loadFonts: () => import('@fontsource-variable/inter/index.css'),
}
