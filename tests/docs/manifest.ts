/**
 * The user guide manifest (change user-manual-and-tutorials): every user-facing feature screen of the product, in the
 * order a facilitator meets them. The tour (tests/docs/tour.spec.ts) walks it on a seeded demo board and photographs each
 * step; the guide pages and `pnpm docs:check` are built from it. A step lists the test anchors (`data-testid`) it needs, so
 * a renamed control fails the check with the name of the guide step instead of leaving a stale picture.
 *
 * Plain data on purpose (no functions): it is hashed to tell when the generated guide is older than its manifest.
 */
export type Locale = 'fr' | 'en'
export type Text = Readonly<Record<Locale, string>>

/** What the tour does before the photo. `anchor` ops name a `data-testid`; `demoBoard` creates the seeded board once. */
export type Op =
  | { readonly goto: string }
  | { readonly demoBoard: true }
  | { readonly click: string }
  | { readonly press: string }
  | { readonly fill: readonly [anchor: string, value: string | Text] }
  | { readonly viewport: readonly [width: number, height: number] }

export interface Step {
  /** Stable id: the image file name and the anchor of the step in the guide. */
  readonly id: string
  readonly caption: Text
  /** Operations that bring the app to the state to photograph. */
  readonly ops: readonly Op[]
  /** Test anchors that must be visible for the photo (the check fails when one is gone). */
  readonly anchors: readonly string[]
  /** Photograph this anchor only (an element crop); the whole window when absent. */
  readonly shoot?: string
}

export interface Chapter {
  readonly id: string
  readonly title: Text
  readonly intro: Text
  readonly steps: readonly Step[]
}

const t = (fr: string, en: string): Text => ({ fr, en })

export const CHAPTERS: readonly Chapter[] = [
  {
    id: 'create',
    title: t('Créer un board', 'Create a board'),
    intro: t('Un board se crée en quelques secondes: un titre, un format, un thème. Aucun compte n’est nécessaire.', 'A board takes seconds to create: a title, a format, a theme. No account is needed.'),
    steps: [
      { id: 'form', caption: t('Donne un titre au board et choisis un format de rétro.', 'Give the board a title and pick a retro format.'), ops: [{ goto: '/new' }, { fill: ['setup-title', t('Sprint 24', 'Sprint 24')] }], anchors: ['setup-title', 'setup-submit'] },
      { id: 'theme', caption: t('Le thème est choisi par le facilitateur et vaut pour toute l’équipe.', 'The facilitator picks the theme and the whole team sees it.'), ops: [], anchors: ['theme-studio'], shoot: 'setup-form' },
    ],
  },
  {
    id: 'invite',
    title: t('Inviter l’équipe', 'Invite the team'),
    intro: t('Le lien du board contient la clé de chiffrement: partage-le, c’est tout.', 'The board link carries the encryption key: share it, that is all.'),
    steps: [
      { id: 'share', caption: t('Le panneau Partager donne le lien, le code et le QR code.', 'The Share panel gives the link, the code and the QR code.'), ops: [{ demoBoard: true }, { click: 'btn-share' }], anchors: ['share-url'] },
    ],
  },
  {
    id: 'write',
    title: t('Écrire et publier des idées', 'Write and publish ideas'),
    intro: t('Les idées restent privées tant que tu ne les publies pas.', 'Ideas stay private until you publish them.'),
    steps: [
      { id: 'board', caption: t('Chaque colonne a son champ de saisie en haut, les brouillons restent sur ton appareil.', 'Each column has its own field at the top, drafts stay on your device.'), ops: [{ press: 'Escape' }], anchors: ['board'] },
    ],
  },
  {
    id: 'agenda',
    title: t('Le déroulé et le minuteur', 'The agenda and the timer'),
    intro: t('Le déroulé découpe la rétro en phases chronométrées.', 'The agenda splits the retro into timed phases.'),
    steps: [
      { id: 'ring', caption: t('L’anneau montre la phase en cours et le temps restant.', 'The ring shows the running phase and the time left.'), ops: [], anchors: ['agenda-ring'], shoot: 'agenda-ring' },
      { id: 'panel', caption: t('Le panneau du déroulé permet de démarrer, passer à la phase suivante ou rallonger.', 'The agenda panel starts, skips to the next phase or extends.'), ops: [{ click: 'agenda-ring' }], anchors: ['agenda-panel'] },
    ],
  },
  {
    id: 'people',
    title: t('Les participants et le chat', 'Participants and chat'),
    intro: t('Qui est là, qui écrit, et un chat pour se parler sans quitter le board.', 'Who is here, who is typing, and a chat to talk without leaving the board.'),
    steps: [
      { id: 'participants', caption: t('La liste des participants indique qui est connecté et son rôle.', 'The participant list shows who is online and their role.'), ops: [{ press: 'Escape' }, { click: 'btn-participants' }], anchors: ['btn-participants'] },
      { id: 'chat', caption: t('Le chat du board est chiffré comme le reste.', 'The board chat is encrypted like everything else.'), ops: [{ press: 'Escape' }, { click: 'btn-chat' }], anchors: ['chat-panel', 'chat-input'] },
    ],
  },
  {
    id: 'actions',
    title: t('Le plan d’actions', 'The action plan'),
    intro: t('Les décisions de la rétro deviennent des actions avec un responsable.', 'The decisions of the retro become actions with an owner.'),
    steps: [
      { id: 'drawer', caption: t('Ajoute une action, désigne un responsable et une échéance.', 'Add an action, give it an owner and a due date.'), ops: [{ press: 'Escape' }, { click: 'btn-actions' }], anchors: ['action-text', 'action-add'] },
    ],
  },
  {
    id: 'present',
    title: t('Présenter', 'Present'),
    intro: t('Le mode présentation met une colonne en avant pour l’écran de la salle.', 'Presentation mode puts one column forward for the room screen.'),
    steps: [
      { id: 'presenter', caption: t('Le mode présentation agrandit la colonne en cours.', 'Presentation mode enlarges the current column.'), ops: [{ press: 'Escape' }, { click: 'btn-presenter' }], anchors: ['focus-current'] },
    ],
  },
  {
    id: 'export',
    title: t('Exporter et garder une trace', 'Export and keep a record'),
    intro: t('Le rapport de rétro tient dans un seul fichier HTML autonome.', 'The retro report fits in one self-contained HTML file.'),
    steps: [
      { id: 'report', caption: t('Le rapport rassemble le podium, les idées par colonne et les actions.', 'The report gathers the podium, the ideas by column and the actions.'), ops: [{ press: 'Escape' }, { click: 'btn-export' }, { click: 'export-report' }], anchors: ['report'] },
    ],
  },
  {
    id: 'options',
    title: t('Les options du board', 'Board options'),
    intro: t('Votes, verrouillage, rôles: tout se règle dans les options.', 'Votes, lock, roles: everything is set in the options.'),
    steps: [
      { id: 'options', caption: t('Les options règlent les votes, le verrouillage et qui peut animer.', 'Options set the votes, the lock and who can facilitate.'), ops: [{ press: 'Escape' }, { click: 'btn-options' }], anchors: ['opt-lock', 'opt-votes'] },
    ],
  },
]

/** Every anchor the tour needs, once each, in first-use order. */
export const anchors = (): string[] => [...new Set(CHAPTERS.flatMap((c) => c.steps.flatMap((s) => [...s.anchors, ...(s.shoot ? [s.shoot] : []), ...s.ops.flatMap((o) => ('click' in o ? [o.click] : 'fill' in o ? [o.fill[0]] : []))])))]

/** Resolves a text in one language. */
export const text = (value: string | Text, locale: Locale): string => (typeof value === 'string' ? value : value[locale])

/** Image file name of a step, the same for every language and variant folder. */
export const imageName = (chapter: Chapter, step: Step): string => `${chapter.id}-${step.id}.webp`

/** Stable hash of the manifest (FNV-1a), written next to the generated guide to tell when it is out of date. */
export function manifestHash(chapters: readonly Chapter[] = CHAPTERS): string {
  const s = JSON.stringify(chapters)
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) }
  return (h >>> 0).toString(16).padStart(8, '0')
}
