/**
 * Strings of the Scrum Poker demo (change scrum-poker). They live next to the demo and not in the shared dictionaries: the demo
 * exists only in a build made with NUXT_PUBLIC_POKER_DEMO=1, and the shared dictionaries are inside the bundle budget of every build.
 * French is the source language; `apps/web/test/poker-strings.test.ts` keeps the two in step.
 */
import { currentLocale } from '~/i18n'

export const pokerFr = {
  'poker.pageTitle': 'Planning poker (démo)',
  'poker.demo': 'Démo du Scrum Poker : version de travail, derrière un drapeau, pas encore le produit final.',
  'poker.start.title': 'Scrum Poker',
  'poker.start.lead': 'Estimez ensemble : chacun choisit une carte, personne ne voit celles des autres avant la révélation.',
  'poker.start.action': 'Démarrer une salle',
  'poker.start.private': 'Privé par construction : les cartes sont chiffrées dans votre navigateur, le serveur ne voit que du chiffré et ne garde rien.',
  'poker.name.label': 'Votre nom',
  'poker.name.join': 'Rejoindre la salle',
  'poker.share.title': 'Inviter',
  'poker.share.label': 'Lien de la salle',
  'poker.share.copy': 'Copier le lien',
  'poker.share.copied': 'Lien copié',
  'poker.share.hint': 'Toute personne qui a ce lien peut rejoindre. Il ne part jamais vers le serveur.',
  'poker.table.title': 'La table',
  'poker.seat.waiting': 'En attente',
  'poker.seat.voted': 'A voté',
  'poker.seat.moderator': 'Animateur',
  'poker.seat.you': 'vous',
  'poker.hand.title': 'Votre carte',
  'poker.hand.pick': 'Choisissez une carte',
  'poker.hand.locked': 'Les cartes sont révélées',
  'poker.hand.card': 'Carte {card}',
  'poker.round': 'Tour {n}',
  'poker.progress': '{voted} sur {total} ont voté',
  'poker.reveal': 'Révéler',
  'poker.reveal.wait': 'Révélation possible dès le premier vote',
  'poker.next': 'Nouveau tour',
  'poker.revealed': 'Cartes révélées',
  'poker.status.connecting': 'Connexion…',
  'poker.status.live': 'Connecté',
  'poker.status.offline': 'Déconnecté, nouvelle tentative',
  'poker.status.full': 'La salle est pleine',
  'poker.error.link': 'Ce lien ne correspond à aucune salle.',
  'poker.back': 'Retour',
} as const

export type PokerKey = keyof typeof pokerFr

export const pokerEn: Record<PokerKey, string> = {
  'poker.pageTitle': 'Planning poker (demo)',
  'poker.demo': 'Demo of Scrum Poker: a working version behind a flag, not the final product yet.',
  'poker.start.title': 'Scrum Poker',
  'poker.start.lead': 'Estimate together: everyone picks a card and nobody sees the others until the reveal.',
  'poker.start.action': 'Start a room',
  'poker.start.private': 'Private by construction: cards are encrypted in your browser, the server sees only ciphertext and keeps nothing.',
  'poker.name.label': 'Your name',
  'poker.name.join': 'Join the room',
  'poker.share.title': 'Invite',
  'poker.share.label': 'Room link',
  'poker.share.copy': 'Copy link',
  'poker.share.copied': 'Link copied',
  'poker.share.hint': 'Anyone with this link can join. It never goes to the server.',
  'poker.table.title': 'The table',
  'poker.seat.waiting': 'Waiting',
  'poker.seat.voted': 'Has voted',
  'poker.seat.moderator': 'Moderator',
  'poker.seat.you': 'you',
  'poker.hand.title': 'Your card',
  'poker.hand.pick': 'Pick a card',
  'poker.hand.locked': 'The cards are revealed',
  'poker.hand.card': 'Card {card}',
  'poker.round': 'Round {n}',
  'poker.progress': '{voted} of {total} have voted',
  'poker.reveal': 'Reveal',
  'poker.reveal.wait': 'You can reveal after the first vote',
  'poker.next': 'New round',
  'poker.revealed': 'Cards revealed',
  'poker.status.connecting': 'Connecting...',
  'poker.status.live': 'Connected',
  'poker.status.offline': 'Disconnected, retrying',
  'poker.status.full': 'The room is full',
  'poker.error.link': 'This link does not match any room.',
  'poker.back': 'Back',
}

/** Text of a key in the current language, with `{name}` placeholders filled. */
export function pt(key: PokerKey, params?: Record<string, string | number>): string {
  const raw = (currentLocale.value === 'en' ? pokerEn : pokerFr)[key]
  return params ? raw.replace(/\{(\w+)\}/g, (_, name: string) => String(params[name] ?? `{${name}}`)) : raw
}
