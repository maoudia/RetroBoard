import type { ThemeDefinition } from './types'

export const paper: ThemeDefinition = {
  id: 'paper',
  name: 'Paper',
  emoji: '\u{1F4C4}',
  tagline: 'Éditorial, papier chaud, serif',
  group: 'pro',
  scheme: 'light',
  tokens: {
    bg: '#faf7f2', bg2: '#efe8da', surface: '#fffdf9', surface2: '#f6f1e8', border: '#e0d6c4',
    text: '#26211a', muted: '#645a4a', accent: '#9a3412', accent2: '#166534', accentInk: '#ffffff',
    danger: '#b91c1c', success: '#166534', noteInk: '#26211a',
  },
  noteColors: ['#fde68a', '#fecaca', '#bbf7d0', '#bfdbfe', '#e9d5ff', '#fed7aa', '#99f6e4', '#e7e5e4'],
  fonts: { display: '"Fraunces Variable", Georgia, serif', body: '"Inter Variable", system-ui, sans-serif', mono: 'ui-monospace, monospace' },
  radius: { card: 6, control: 6 },
  motion: { enter: 'float', leave: 'fade', enterMs: 560, ease: 'cubic-bezier(.22,1,.36,1)', ambient: 'none' },
  copy: {
    hero: 'Prendre le temps de relire le sprint. Un lien suffit.',
    emptyColumn: 'La page est blanche.',
    privateHint: 'Ton brouillon, pour toi seul.',
  },
  loadFonts: () => Promise.all([
    import('@fontsource-variable/fraunces/index.css'),
    import('@fontsource-variable/inter/index.css'),
  ]),
}
