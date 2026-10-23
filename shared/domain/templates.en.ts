/** English texts of the retro formats, keyed by template id. Columns keep the order of the French source. */
export interface TemplateText { name: string; description: string; columns: readonly { title: string; subtitle: string }[] }

export const TEMPLATES_EN: Readonly<Record<string, TemplateText>> = {
  'start-stop-continue': {
    name: 'Start / Stop / Continue',
    description: 'The classic: what we start, what we stop, what we keep.',
    columns: [{ title: 'Start', subtitle: 'To begin' }, { title: 'Stop', subtitle: 'To stop' }, { title: 'Continue', subtitle: 'To keep' }],
  },
  'went-well': {
    name: 'Went well / To improve',
    description: 'A sober team check-in: what worked, what could be better, open questions.',
    columns: [{ title: 'Went well', subtitle: 'To keep' }, { title: 'To improve', subtitle: 'What could be better' }, { title: 'Questions', subtitle: 'What we want to clarify' }],
  },
  daki: {
    name: 'DAKI',
    description: 'Drop, Add, Keep, Improve: a decision frame to arbitrate fast.',
    columns: [{ title: 'Drop', subtitle: 'We abandon' }, { title: 'Add', subtitle: 'We add' }, { title: 'Keep', subtitle: 'We keep' }, { title: 'Improve', subtitle: 'We improve' }],
  },
  'mad-sad-glad': {
    name: 'Mad / Sad / Glad',
    description: 'Puts words on the team\'s feelings, useful after a tense sprint.',
    columns: [{ title: 'Mad', subtitle: 'What annoys us' }, { title: 'Sad', subtitle: 'What disappoints us' }, { title: 'Glad', subtitle: 'What makes us happy' }],
  },
  '4ls': {
    name: 'The 4 Ls',
    description: 'Liked, Learned, Lacked, Longed for: a balanced review with a learning angle.',
    columns: [{ title: 'Liked', subtitle: 'What we enjoyed' }, { title: 'Learned', subtitle: 'What we learned' }, { title: 'Lacked', subtitle: 'What was missing' }, { title: 'Longed for', subtitle: 'What we dream of' }],
  },
  sailboat: {
    name: 'Sailboat',
    description: 'The wind pushes, anchors slow us down, rocks threaten, the island is the goal.',
    columns: [{ title: 'Wind', subtitle: 'What moves us forward' }, { title: 'Anchors', subtitle: 'What slows us down' }, { title: 'Rocks', subtitle: 'Risks ahead of us' }, { title: 'Island', subtitle: 'Our goal' }],
  },
  weather: {
    name: 'Weather',
    description: 'Clear sky, warm air, sandbags, storm: a visual tour of the situation.',
    columns: [{ title: 'Clear sky', subtitle: 'What goes well' }, { title: 'Warm air', subtitle: 'What lifts us up' }, { title: 'Sandbags', subtitle: 'What weighs us down' }, { title: 'Storm', subtitle: 'Risks to come' }],
  },
  starfish: {
    name: 'Starfish',
    description: 'Five levels of intensity: finer than Start/Stop/Continue.',
    columns: [{ title: 'Keep', subtitle: 'We keep' }, { title: 'Less', subtitle: 'Less of' }, { title: 'More', subtitle: 'More of' }, { title: 'Start', subtitle: 'We start' }, { title: 'Stop', subtitle: 'We stop' }],
  },
  'kudos-lab': {
    name: 'Kudos & ideas',
    description: 'Short and positive: thanks, wins, ideas to try.',
    columns: [{ title: 'Thanks', subtitle: 'A tip of the hat' }, { title: 'Wins', subtitle: 'What we are proud of' }, { title: 'Ideas', subtitle: 'To try' }],
  },
  halloween: {
    name: 'Halloween crypt',
    description: 'Pumpkins, ghosts, cobwebs, potions and candy.',
    columns: [{ title: 'Pumpkins', subtitle: 'What went well' }, { title: 'Ghosts', subtitle: 'What haunts us' }, { title: 'Cobwebs', subtitle: 'What blocks us' }, { title: 'Magic potions', subtitle: 'Ideas to try' }, { title: 'Trick or treat', subtitle: 'Thanks' }],
  },
  noel: {
    name: 'Santa\'s workshop',
    description: 'Gifts received, coal, wish list, thanks to the elves.',
    columns: [{ title: 'Gifts received', subtitle: 'What made us happy' }, { title: 'Lumps of coal', subtitle: 'What went wrong' }, { title: 'Wish list', subtitle: 'What we would like' }, { title: 'Thanks, elves', subtitle: 'Thanks' }],
  },
  pipeline: {
    name: 'CI pipeline',
    description: 'Green build, red tests, hotfix, release: for tech teams.',
    columns: [{ title: 'Build OK', subtitle: 'What turns green' }, { title: 'Red tests', subtitle: 'What breaks' }, { title: 'Hotfix', subtitle: 'To fix fast' }, { title: 'Release', subtitle: 'To ship next' }],
  },
  sakura: {
    name: 'Spring garden',
    description: 'Flowers, roots, weeds and seeds: a gentler format.',
    columns: [{ title: 'Flowers', subtitle: 'What blooms' }, { title: 'Roots', subtitle: 'Our solid foundations' }, { title: 'Weeds', subtitle: 'To pull out' }, { title: 'Seeds', subtitle: 'To plant' }],
  },
}
