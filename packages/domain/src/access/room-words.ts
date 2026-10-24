/**
 * Room confirmation words (change frictionless-sharing): three words derived from the room id,
 * the same for every participant, so people can check out loud that they are on the same board.
 * Not a secret and not a key: the room id is already visible to the relay. The list follows the
 * board's language (fixed at creation), so everybody hears the same words.
 */
import type { Locale } from '../shared/commands'

// Stryker disable StringLiteral: word list data; the tests check size, uniqueness and determinism.
const WORDS: Record<Locale, readonly string[]> = {
  fr: [
  'abeille', 'arbre', 'ardoise', 'argent', 'avion', 'balle', 'bambou', 'banane', 'bateau', 'berger', 'bijou',
  'bison', 'blason', 'bocal', 'bonbon', 'bougie', 'boussole', 'brioche', 'cactus', 'camion', 'canard',
  'canoe', 'caramel', 'carotte', 'castor', 'cerise', 'chalet', 'chameau', 'chapeau', 'chaton', 'chocolat',
  'cigale', 'citron', 'clairon', 'clocher', 'cobra', 'comete', 'concombre', 'coquelicot', 'corail', 'cornet',
  'coton', 'crayon', 'criquet', 'cygne', 'dauphin', 'domino', 'dragon', 'ecureuil', 'epice', 'etoile',
  'falaise', 'faucon', 'fenouil', 'figue', 'flamant', 'flocon', 'fontaine', 'fougere', 'fraise', 'frelon',
  'fromage', 'galet', 'gazelle', 'girafe', 'glacier', 'gland', 'gorille', 'grenade', 'griffon', 'guitare',
  'hamac', 'hibou', 'homard', 'igloo', 'jardin', 'jasmin', 'jonquille', 'kayak', 'kiwi', 'koala', 'lagune',
  'lama', 'lanterne', 'lapin', 'laurier', 'lavande', 'lezard', 'licorne', 'lion', 'loutre', 'lune', 'lutin',
  'macaron', 'mangue', 'marmotte', 'melon', 'meteore', 'miel', 'mimosa', 'moineau', 'mouette', 'muguet',
  'myrtille', 'navire', 'neige', 'noisette', 'nuage', 'olive', 'orage', 'orange', 'orque', 'panda',
  'papillon', 'perle', 'phare', 'pingouin', 'pirate', 'pivoine', 'planete', 'plume', 'poivre', 'pomme',
  'prairie', 'puma', 'quartz', 'radis', 'renard',
  ],
  en: [
  'acorn', 'amber', 'anchor', 'apple', 'arrow', 'aspen', 'badger', 'bamboo', 'banana', 'basil', 'beacon',
  'bison', 'blossom', 'bramble', 'breeze', 'brick', 'bubble', 'cactus', 'camel', 'candle', 'canoe', 'canyon',
  'caramel', 'carrot', 'castle', 'cedar', 'cherry', 'chess', 'cider', 'clover', 'cobalt', 'comet', 'copper',
  'coral', 'cotton', 'coyote', 'crane', 'cricket', 'crystal', 'daisy', 'delta', 'dolphin', 'domino',
  'dragon', 'eagle', 'echo', 'ember', 'falcon', 'fennel', 'fern', 'fig', 'finch', 'flame', 'flute', 'forest',
  'fox', 'galaxy', 'garden', 'garnet', 'gecko', 'ginger', 'glacier', 'goose', 'granite', 'grape', 'harbor',
  'hazel', 'heron', 'honey', 'igloo', 'island', 'ivy', 'jasmine', 'jelly', 'kayak', 'kettle', 'kiwi',
  'koala', 'lagoon', 'lantern', 'lemon', 'lily', 'lime', 'lion', 'llama', 'lotus', 'maple', 'marble',
  'meadow', 'melon', 'meteor', 'mint', 'moose', 'mosaic', 'nectar', 'nutmeg', 'oasis', 'ocean', 'olive',
  'onyx', 'orbit', 'orchid', 'otter', 'owl', 'panda', 'papaya', 'parrot', 'peach', 'pebble', 'pepper',
  'piano', 'pine', 'planet', 'plum', 'pony', 'prism', 'puffin', 'quartz', 'quill', 'rabbit', 'radish',
  'raven', 'reef', 'river', 'robin', 'rocket', 'saffron', 'salmon',
  ],
}
// Stryker restore StringLiteral

export const ROOM_WORD_COUNT = 128

/** FNV-1a 32-bit: small, deterministic, the same in every browser. */
export function fnv1a(text: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h
}

/** Three words for a room: 21 bits of the room id hash, 7 bits per word. */
export function roomWords(roomId: string, locale: Locale): [string, string, string] {
  const list = WORDS[locale]
  const h = fnv1a(roomId)
  return [list[h & 127]!, list[(h >>> 7) & 127]!, list[(h >>> 14) & 127]!]
}

export const roomWordList = (locale: Locale): readonly string[] => WORDS[locale]
