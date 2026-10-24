import type { ThemeDefinition } from './types'

export const noel: ThemeDefinition = {
  id: 'noel',
  name: 'Noël',
  tagline: 'Sapin, neige et guirlandes',
  group: 'fun',
  scheme: 'dark',
  tokens: {
    bg: '#0b1f17', bg2: '#17382c', surface: '#112a21', surface2: '#18382c', border: '#2f6350',
    text: '#f8f4ec', muted: '#b4d3c4', accent: '#ff5a5f', accent2: '#f4c95d', accentInk: '#2a0c10',
    danger: '#ff8a8e', success: '#8ee6b0', noteInk: '#1d2a22',
  },
  noteColors: ['#ffd0d2', '#fff0b8', '#cdeccf', '#d3e8ff', '#ffdaf0', '#f6e3b4', '#dff7dc', '#ffc4b8'],
  fonts: { display: '"Mountains of Christmas", Georgia, serif', body: '"Nunito Variable", system-ui, sans-serif', mono: 'ui-monospace, monospace' },
  radius: { card: 18, control: 12 },
  motion: { enter: 'float', leave: 'melt', enterMs: 720, ease: 'cubic-bezier(.22,1,.36,1)', ambient: 'snow' },
  copy: {
    hero: 'Un board de rétro au coin du feu. Le lien suffit, personne n\'a besoin de compte.',
    emptyColumn: 'Pas un cadeau sous le sapin.',
    privateHint: 'Ta liste secrète, visible de toi seul.',
  },
  loadFonts: () => Promise.all([
    import('@fontsource/mountains-of-christmas/latin-700.css'),
    import('@fontsource-variable/nunito/index.css'),
  ]),
}
