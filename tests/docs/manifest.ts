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
  | { readonly goto: string | Text }
  | { readonly demoBoard: true }
  | { readonly click: string }
  | { readonly zoomNote: number }
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
      { id: 'team', caption: t('Choisis d’abord l’équipe (et un projet si tu veux): ses réglages préparent le formulaire en dessous.', 'Choose your team first (and a project if you like): its defaults prepare the form below.'), ops: [{ goto: '/new' }], anchors: ['team-select', 'team-project'], shoot: 'team-card' },
      { id: 'form', caption: t('Donne un titre au board et choisis un format de rétro.', 'Give the board a title and pick a retro format.'), ops: [{ goto: '/new' }, { fill: ['setup-title', t('Sprint 24', 'Sprint 24')] }], anchors: ['setup-title', 'setup-submit'] },
      { id: 'theme', caption: t('Le thème est choisi par le facilitateur et vaut pour toute l’équipe.', 'The facilitator picks the theme and the whole team sees it.'), ops: [], anchors: ['theme-studio'], shoot: 'setup-form' },
    ],
  },
  {
    id: 'formats',
    title: t('Les pages des formats', 'The format pages'),
    intro: t('Chaque format de rétro a sa page publique, avec ses colonnes et un bouton pour le démarrer.', 'Every retro format has its own public page, with its columns and a button to start it.'),
    steps: [
      { id: 'page', caption: t('La page d’un format montre ses colonnes, les objectifs qu’il sert et sa durée.', 'A format page shows its columns, the goals it suits and how long it takes.'), ops: [{ goto: t('/formats/starfish/', '/en/formats/starfish/') }], anchors: ['format-name', 'format-column', 'format-start'] },
      { id: 'start', caption: t('« Démarrer ce format » ouvre la création d’un board avec ce format déjà choisi.', '"Start this format" opens the board setup with that format already selected.'), ops: [{ click: 'format-start' }], anchors: ['template-starfish', 'setup-submit'] },
    ],
  },
  {
    id: 'whats-new',
    title: t('Les nouveautés', 'What\u2019s new'),
    intro: t('Une page publique liste les dernières versions, tirées du journal des changements du projet.', 'A public page lists the latest releases, taken from the project changelog.'),
    steps: [
      { id: 'page', caption: t('La page Nouveautés liste les dernières versions avec leur date et leurs changements.', 'The What\u2019s new page lists the latest releases with their date and their changes.'), ops: [{ goto: t('/whats-new', '/en/whats-new') }], anchors: ['whats-new', 'release'] },
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
      { id: 'zoom', caption: t('Un double clic ou un double toucher sur une idée l’agrandit sur ton appareil, les flèches passent à l’idée voisine et Échap referme.', 'A double click or double tap on an idea enlarges it on your device, the arrows move to the next idea and Escape closes it.'), ops: [{ press: 'Escape' }, { zoomNote: 1 }], anchors: ['note-text'] },
    ],
  },
  {
    id: 'agenda',
    title: t('Le déroulé et le minuteur', 'The agenda and the timer'),
    intro: t('Le déroulé découpe la rétro en phases chronométrées.', 'The agenda splits the retro into timed phases.'),
    steps: [
      { id: 'ring', caption: t('L’anneau montre la phase en cours et le temps restant.', 'The ring shows the running phase and the time left.'), ops: [{ press: 'Escape' }], anchors: ['agenda-ring'], shoot: 'agenda-ring' },
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
      { id: 'celebrate', caption: t('Quand une action passe à fait, le thème du board fête l’idée d’une courte animation; un réglage du profil (mode avancé) la coupe.', 'When an action reaches done, the board theme celebrates the idea with a short animation; a profile setting (advanced mode) turns it off.'), ops: [{ press: 'Escape' }, { click: 'btn-profile' }], anchors: ['set-celebrations'], shoot: 'set-celebrations-row' },
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
    intro: t('Le rapport de rétro tient dans un seul fichier HTML autonome; chaque fichier se prévisualise avant d\'être enregistré.', 'The retro report fits in one self-contained HTML file; every file is previewed before it is saved.'),
    steps: [
      { id: 'report', caption: t('Le rapport rassemble le podium, les idées par colonne et les actions.', 'The report gathers the podium, the ideas by column and the actions.'), ops: [{ press: 'Escape' }, { click: 'btn-export' }, { click: 'export-report' }], anchors: ['report'] },
      { id: 'preview', caption: t("Avant d'enregistrer, le fichier s'affiche tel que tu le recevras, avec son nom et sa taille.", 'Before saving, the file is shown as you will receive it, with its name and size.'), ops: [{ press: 'Escape' }, { click: 'btn-export' }, { click: 'export-csv' }], anchors: ['file-preview-table', 'file-preview-save'] },
      { id: 'slack', caption: t('Le résumé Slack se copie, ou se poste dans un canal avec ton webhook, gardé sur cet appareil.', 'The Slack summary is copied, or posted to a channel with your webhook, kept on this device.'), ops: [{ press: 'Escape' }, { click: 'btn-export' }, { click: 'export-dest-slack' }], anchors: ['slack-webhook', 'slack-post'] },
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
  {
    id: 'sync',
    title: t('Garder ses boards partout', 'Keep your boards everywhere'),
    intro: t('Garde tes boards et tes préférences sur tous tes appareils, dans une copie chiffrée que seul toi peux lire, sans compte.', 'Keep your boards and preferences on all your devices, in an encrypted copy only you can read, with no account.'),
    steps: [
      { id: 'shield', caption: t('Le bouclier au début de la barre d\'outils est le bouton de synchronisation : il synchronise d\'un appui, et la première fois il ouvre cette fiche qui explique tout en trois phrases.', 'The shield at the start of the toolbar is the sync button: one press syncs, and the first time it opens this sheet that explains it in three sentences.'), ops: [{ press: 'Escape' }, { click: 'sync-shield' }], anchors: ['sync-sheet', 'sync-path-folder'], shoot: 'sync-sheet' },
      { id: 'folder', caption: t('Dans le profil, la section Synchronisation te laisse choisir n\'importe quel dossier : ce qui le transporte d\'un appareil à l\'autre est ton affaire.', 'In the profile, the Sync section lets you pick any folder: what carries it from one device to another is up to you.'), ops: [{ press: 'Escape' }, { click: 'btn-profile' }], anchors: ['sync-section', 'sync-choose'], shoot: 'sync-card' },
      { id: 'onedrive', caption: t('Là où le site le propose, « Se connecter avec Microsoft » garde le coffre chiffré dans le dossier OneDrive de RetroBoard, sans client de synchronisation.', 'Where the site offers it, "Sign in with Microsoft" keeps the encrypted vault in RetroBoard\'s own OneDrive folder, with no sync client.'), ops: [{ press: 'Escape' }, { click: 'btn-profile' }], anchors: ['sync-onedrive', 'sync-onedrive-signin'], shoot: 'sync-onedrive' },
    ],
  },
  {
    id: 'keep',
    title: t('Garder ses boards', 'Keep your boards'),
    intro: t('Le service ne garde rien: la copie de ton navigateur est parfois la seule. Voici comment la protéger.', 'The service stores nothing: the copy in your browser is sometimes the only one. Here is how to protect it.'),
    steps: [
      { id: 'protected', caption: t('Dans le profil, la ligne « Boards sur cet appareil » dit si le navigateur les conserve ou peut les effacer.', 'In the profile, the "Boards on this device" row says whether the browser keeps them or may clear them.'), ops: [{ press: 'Escape' }, { click: 'btn-profile' }], anchors: ['durability'], shoot: 'durability' },
    ],
  },
  {
    id: 'poker',
    title: t('Estimer avec le Scrum Poker (bêta)', 'Estimate with Scrum Poker (beta)'),
    intro: t('Une salle de poker pour estimer en équipe: chacun choisit une carte, personne ne voit les autres avant la révélation. Sans compte, chiffré comme un board.', 'A poker room to estimate as a team: everyone picks a card and nobody sees the others until the reveal. No account, encrypted like a board.'),
    steps: [
      { id: 'start', caption: t('Choisis un jeu de cartes (Fibonacci est déjà choisi), puis crée la salle en un clic.', 'Pick a deck (Fibonacci is chosen already), then create the room in one click.'), ops: [{ goto: '/poker' }], anchors: ['poker-start', 'poker-deck-fibonacci', 'poker-deck-cards', 'poker-start-action'] },
      { id: 'room', caption: t('La salle tient en un écran: la barre (Inviter ouvre le lien et son QR code), la table et ta main de cartes en bas: les cartes restent cachées jusqu’à la révélation.', 'The room fits one screen: the bar (Invite opens the link and its QR code), the table and your hand of cards at the foot: the cards stay hidden until the reveal.'), ops: [{ goto: '/poker' }, { click: 'poker-start-action' }, { fill: ['poker-name', 'Alice'] }, { click: 'poker-name-join' }], anchors: ['poker-invite', 'poker-seats', 'poker-hand'] },
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
