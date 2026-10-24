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
