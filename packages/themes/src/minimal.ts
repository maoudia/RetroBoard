import type { ThemeDefinition } from './types'

export const minimal: ThemeDefinition = {
  id: 'minimal',
  name: 'Minimal',
  tagline: 'Sobre, clair, sans distraction',
  group: 'pro',
  scheme: 'light',
  tokens: {
    bg: '#f5f6f8', bg2: '#e9ecf3', surface: '#ffffff', surface2: '#f1f3f7', border: '#dde1e8',
    text: '#14161a', muted: '#566070', accent: '#4338ca', accent2: '#0369a1', accentInk: '#ffffff',
    danger: '#b91c3c', success: '#15803d', noteInk: '#14161a',
  },
  /** The dark variant (each participant picks light or dark; the board theme stays the same). */
  alt: {
    bg: '#0f1013', bg2: '#17191e', surface: '#181a1f', surface2: '#21242b', border: '#30343d', text: '#eceef2', muted: '#a2a9b6', accent: '#8b85ff', accent2: '#38bdf8', accentInk: '#0d0b2e', danger: '#ff7a90', success: '#4ade80', noteInk: '#14161a',
  },
  noteColors: ['#fde68a', '#bfdbfe', '#fbcfe8', '#bbf7d0', '#ddd6fe', '#fed7aa', '#a5f3fc', '#e5e7eb'],
  fonts: { display: '"Inter Variable", system-ui, sans-serif', body: '"Inter Variable", system-ui, sans-serif', mono: 'ui-monospace, monospace' },
  radius: { card: 12, control: 10 },
  motion: { enter: 'pop', leave: 'fade', enterMs: 380, ease: 'cubic-bezier(.2,.8,.2,1)', ambient: 'none' },
  copy: {
    hero: 'Une rétro, un lien, zéro compte.',
    emptyColumn: 'Aucun post-it.',
    privateHint: 'Visible de toi seul tant que tu ne publies pas.',
  },
  loadFonts: () => import('@fontsource-variable/inter/index.css'),
}
