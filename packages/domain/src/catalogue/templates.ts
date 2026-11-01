import { TEMPLATES_EN } from './templates.en'
export type Goal = 'celebrate' | 'fix' | 'ideas' | 'learn' | 'conflict' | 'quick'

export interface TemplateColumn {
  title: string
  subtitle: string
  icon: string
  /** false: celebration or keep column, not meant to be voted (change column-voting-scope). Default: votable. */
  votable?: false
}

export interface RetroTemplate {
  id: string
  name: string
  description: string
  /** What this format is good at. */
  goals: Goal[]
  /** Team mood range (1 low, 5 high) where the format works best. */
  mood: [number, number]
  /** Reasonable duration range in minutes. */
  minutes: [number, number]
  /** Theme this format was designed for (gets a seasonal bonus). */
  themeId?: string
  columns: TemplateColumn[]
}

export const TEMPLATES: readonly RetroTemplate[] = [
  {
    id: 'start-stop-continue',
    name: 'Start / Stop / Continue',
    description: 'Le classique: ce qu\'on lance, ce qu\'on arrête, ce qu\'on garde.',
    goals: ['fix', 'ideas', 'quick'],
    mood: [2, 5],
    minutes: [15, 45],
    columns: [
      { title: 'Start', subtitle: 'À commencer', icon: 'play' },
      { title: 'Stop', subtitle: 'À arrêter', icon: 'octagon-x' },
      { title: 'Continue', subtitle: 'À garder', icon: 'refresh-cw', votable: false },
    ],
  },
  {
    id: 'went-well',
    name: 'Bien / À améliorer',
    description: 'Le format sobre pour un point d\'équipe: ce qui a marché, ce qui peut mieux faire, les questions.',
    goals: ['fix', 'quick', 'learn'],
    mood: [2, 5],
    minutes: [15, 45],
    columns: [
      { title: 'Ce qui a bien marché', subtitle: 'À conserver', icon: 'thumbs-up', votable: false },
      { title: 'À améliorer', subtitle: 'Ce qui peut mieux faire', icon: 'wrench' },
      { title: 'Questions', subtitle: 'Ce qu\'on veut éclaircir', icon: 'circle-question-mark' },
    ],
  },
  {
    id: 'daki',
    name: 'DAKI',
    description: 'Drop, Add, Keep, Improve: un cadre décisionnel pour arbitrer vite.',
    goals: ['ideas', 'fix', 'quick'],
    mood: [2, 5],
    minutes: [20, 45],
    columns: [
      { title: 'Drop', subtitle: 'On abandonne', icon: 'octagon-x' },
      { title: 'Add', subtitle: 'On ajoute', icon: 'plus' },
      { title: 'Keep', subtitle: 'On garde', icon: 'shield-check', votable: false },
      { title: 'Improve', subtitle: 'On améliore', icon: 'refresh-cw' },
    ],
  },
  {
    id: 'mad-sad-glad',
    name: 'Mad / Sad / Glad',
    description: 'Met des mots sur les émotions de l\'équipe, utile après un sprint tendu.',
    goals: ['conflict', 'celebrate'],
    mood: [1, 3],
    minutes: [30, 60],
    columns: [
      { title: 'Mad', subtitle: 'Ce qui énerve', icon: 'angry' },
      { title: 'Sad', subtitle: 'Ce qui déçoit', icon: 'frown' },
      { title: 'Glad', subtitle: 'Ce qui rend heureux', icon: 'smile', votable: false },
    ],
  },
  {
    id: '4ls',
    name: 'The 4 Ls',
    description: 'Liked, Learned, Lacked, Longed for: un bilan équilibré avec une part d\'apprentissage.',
    goals: ['learn', 'celebrate'],
    mood: [3, 5],
    minutes: [30, 60],
    columns: [
      { title: 'Liked', subtitle: 'Ce qu\'on a aimé', icon: 'heart', votable: false },
      { title: 'Learned', subtitle: 'Ce qu\'on a appris', icon: 'graduation-cap', votable: false },
      { title: 'Lacked', subtitle: 'Ce qui a manqué', icon: 'hourglass' },
      { title: 'Longed for', subtitle: 'Ce dont on rêve', icon: 'telescope' },
    ],
  },
  {
    id: 'sailboat',
    name: 'Voilier',
    description: 'Le vent pousse, les ancres freinent, les rochers menacent, l\'île est l\'objectif.',
    goals: ['ideas', 'fix', 'learn'],
    mood: [2, 5],
    minutes: [30, 60],
    columns: [
      { title: 'Vent', subtitle: 'Ce qui nous fait avancer', icon: 'wind', votable: false },
      { title: 'Ancres', subtitle: 'Ce qui nous freine', icon: 'anchor' },
      { title: 'Rochers', subtitle: 'Les risques devant nous', icon: 'mountain' },
      { title: 'Île', subtitle: 'Notre objectif', icon: 'tree-palm' },
    ],
  },
  {
    id: 'weather',
    name: 'Météo',
    description: 'Ciel dégagé, air chaud, sacs de sable, tempête: un tour d\'horizon imagé.',
    goals: ['fix', 'celebrate', 'quick'],
    mood: [2, 5],
    minutes: [20, 45],
    columns: [
      { title: 'Ciel dégagé', subtitle: 'Ce qui va bien', icon: 'sun', votable: false },
      { title: 'Air chaud', subtitle: 'Ce qui monte, ce qui nous porte', icon: 'cloud-sun', votable: false },
      { title: 'Sacs de sable', subtitle: 'Ce qui nous alourdit', icon: 'cloud-rain' },
      { title: 'Tempête', subtitle: 'Les risques à venir', icon: 'cloud-lightning' },
    ],
  },
  {
    id: 'starfish',
    name: 'Étoile de mer',
    description: 'Cinq niveaux d\'intensité: plus fin que Start/Stop/Continue.',
    goals: ['fix', 'ideas'],
    mood: [2, 4],
    minutes: [30, 60],
    columns: [
      { title: 'Keep', subtitle: 'On garde', icon: 'shield-check', votable: false },
      { title: 'Less', subtitle: 'Moins de', icon: 'minus' },
      { title: 'More', subtitle: 'Plus de', icon: 'plus' },
      { title: 'Start', subtitle: 'On commence', icon: 'play' },
      { title: 'Stop', subtitle: 'On arrête', icon: 'octagon-x' },
    ],
  },
  {
    id: 'kudos-lab',
    name: 'Kudos & idées',
    description: 'Court et positif: remerciements, réussites, idées à tester.',
    goals: ['celebrate', 'ideas', 'quick'],
    mood: [3, 5],
    minutes: [15, 30],
    columns: [
      { title: 'Merci', subtitle: 'Un coup de chapeau', icon: 'hand-heart', votable: false },
      { title: 'Réussites', subtitle: 'Ce dont on est fier', icon: 'trophy', votable: false },
      { title: 'Idées', subtitle: 'À tester', icon: 'lightbulb' },
    ],
  },
  {
    id: 'halloween',
    name: 'Crypte d\'Halloween',
    description: 'Citrouilles, fantômes, toiles d\'araignée, potions et bonbons.',
    goals: ['celebrate', 'fix', 'ideas'],
    mood: [2, 5],
    minutes: [30, 60],
    themeId: 'halloween',
    columns: [
      { title: 'Citrouilles', subtitle: 'Ce qui a bien marché', icon: 'sparkles', votable: false },
      { title: 'Fantômes', subtitle: 'Ce qui nous hante', icon: 'ghost' },
      { title: 'Toiles d\'araignée', subtitle: 'Ce qui nous bloque', icon: 'bug' },
      { title: 'Potions magiques', subtitle: 'Idées à tester', icon: 'lightbulb' },
      { title: 'Bonbons ou sort', subtitle: 'Remerciements', icon: 'candy', votable: false },
    ],
  },
  {
    id: 'noel',
    name: 'Atelier du Père Noël',
    description: 'Cadeaux reçus, charbon, liste au Père Noël, merci aux lutins.',
    goals: ['celebrate', 'ideas', 'fix'],
    mood: [2, 5],
    minutes: [30, 60],
    themeId: 'noel',
    columns: [
      { title: 'Cadeaux reçus', subtitle: 'Ce qui nous a fait plaisir', icon: 'gift', votable: false },
      { title: 'Morceaux de charbon', subtitle: 'Ce qui s\'est mal passé', icon: 'flame' },
      { title: 'Liste au Père Noël', subtitle: 'Ce qu\'on voudrait', icon: 'star' },
      { title: 'Merci les lutins', subtitle: 'Remerciements', icon: 'candy-cane', votable: false },
    ],
  },
  {
    id: 'pipeline',
    name: 'Pipeline CI',
    description: 'Build vert, tests rouges, hotfix, release: pour équipes tech.',
    goals: ['fix', 'learn', 'quick'],
    mood: [2, 5],
    minutes: [20, 45],
    themeId: 'cyber',
    columns: [
      { title: 'Build OK', subtitle: 'Ce qui passe au vert', icon: 'shield-check', votable: false },
      { title: 'Tests rouges', subtitle: 'Ce qui casse', icon: 'bug' },
      { title: 'Hotfix', subtitle: 'À corriger vite', icon: 'wrench' },
      { title: 'Release', subtitle: 'À livrer ensuite', icon: 'rocket' },
    ],
  },
  {
    id: 'sakura',
    name: 'Jardin de printemps',
    description: 'Fleurs, racines, mauvaises herbes et graines: un format plus doux.',
    goals: ['learn', 'ideas', 'celebrate'],
    mood: [1, 4],
    minutes: [30, 60],
    themeId: 'sakura',
    columns: [
      { title: 'Fleurs', subtitle: 'Ce qui éclot', icon: 'flower-2', votable: false },
      { title: 'Racines', subtitle: 'Nos bases solides', icon: 'leaf', votable: false },
      { title: 'Mauvaises herbes', subtitle: 'À arracher', icon: 'sprout' },
      { title: 'Graines', subtitle: 'À planter', icon: 'cherry' },
    ],
  },
]

export function getTemplate(id: string): RetroTemplate | undefined {
  return TEMPLATES.find((t) => t.id === id)
}

export type TemplateLocale = 'fr' | 'en'

/** Returns the template with its texts in the requested language. French is the source language. */
export function localizeTemplate(tpl: RetroTemplate, locale: TemplateLocale | undefined): RetroTemplate {
  if (locale !== 'en') return tpl
  const en = TEMPLATES_EN[tpl.id]
  if (!en) return tpl
  return {
    ...tpl, name: en.name, description: en.description,
    columns: tpl.columns.map((c, i) => ({ ...c, title: en.columns[i]?.title ?? c.title, subtitle: en.columns[i]?.subtitle ?? c.subtitle })),
  }
}
