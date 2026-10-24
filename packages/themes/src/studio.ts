import type { ThemeDefinition } from './types'

/** White and soft grey, system font, one blue accent. Default theme. */
export const studio: ThemeDefinition = {
  id: 'studio',
  name: 'Studio',
  tagline: 'Blanc et gris, épuré',
  group: 'pro',
  scheme: 'light',
  tokens: {
    bg: '#f5f5f7', bg2: '#ececf0', surface: '#ffffff', surface2: '#f5f5f7', border: '#d9d9de',
    text: '#1d1d1f', muted: '#636366', accent: '#0066cc', accent2: '#424245', accentInk: '#ffffff',
    danger: '#c9251d', success: '#1d7a3a', noteInk: '#1d1d1f',
  },
  noteColors: ['#fff4c2', '#d6e8ff', '#ffdfe8', '#d8f3e0', '#e6e0ff', '#ffe3c7', '#d3f2f5', '#e8e8ed'],
  fonts: {
    display: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter Variable", system-ui, sans-serif',
    body: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter Variable", system-ui, sans-serif',
    mono: 'ui-monospace, "SF Mono", monospace',
  },
  radius: { card: 16, control: 10 },
  motion: { enter: 'float', leave: 'fade', enterMs: 380, ease: 'cubic-bezier(.22,1,.36,1)', ambient: 'none' },
  copy: {
    hero: 'Une rétrospective claire, en temps réel. Le lien suffit.',
    emptyColumn: 'Rien ici pour le moment.',
    privateHint: 'Visible de toi seul jusqu\'à la publication.',
  },
  loadFonts: () => import('@fontsource-variable/inter/index.css'),
}
