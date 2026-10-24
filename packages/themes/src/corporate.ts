import type { ThemeDefinition } from './types'

export const corporate: ThemeDefinition = {
  id: 'corporate',
  name: 'Corporate',
  tagline: 'Clair, bleu, prêt pour un comité',
  group: 'pro',
  scheme: 'light',
  tokens: {
    bg: '#f4f6fb', bg2: '#e6ebf5', surface: '#ffffff', surface2: '#f1f4fa', border: '#d3dbea',
    text: '#101828', muted: '#475467', accent: '#1d4ed8', accent2: '#0e7490', accentInk: '#ffffff',
    danger: '#b42318', success: '#067647', noteInk: '#101828',
  },
  /** The dark variant (each participant picks light or dark; the board theme stays the same). */
  alt: {
    bg: '#0b1220', bg2: '#111a2e', surface: '#131c30', surface2: '#1a2540', border: '#2a3a5c', text: '#eef2fb', muted: '#a6b2c8', accent: '#6b9bff', accent2: '#38bdf8', accentInk: '#06122b', danger: '#ff7b72', success: '#4ade80', noteInk: '#101828',
  },
  noteColors: ['#fef3c7', '#dbeafe', '#fce7f3', '#d1fae5', '#e0e7ff', '#fed7aa', '#cffafe', '#e5e7eb'],
  fonts: { display: '"Inter Variable", system-ui, sans-serif', body: '"Inter Variable", system-ui, sans-serif', mono: 'ui-monospace, monospace' },
  radius: { card: 12, control: 8 },
  motion: { enter: 'pop', leave: 'fade', enterMs: 320, ease: 'cubic-bezier(.2,.8,.2,1)', ambient: 'none' },
  copy: {
    hero: 'Une rétrospective structurée, en temps réel. Le lien suffit, sans compte.',
    emptyColumn: 'Aucun post-it pour le moment.',
    privateHint: 'Visible de toi seul jusqu\'à la publication.',
  },
  loadFonts: () => import('@fontsource-variable/inter/index.css'),
}
