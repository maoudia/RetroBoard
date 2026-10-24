/** Lucide icons a column may use (validated server side, checked against the icon set in tests). */
export const COLUMN_ICONS = [
  'play', 'octagon-x', 'refresh-cw', 'smile', 'frown', 'angry', 'heart', 'thumbs-up', 'thumbs-down',
  'lightbulb', 'graduation-cap', 'star', 'gift', 'candy', 'ghost', 'skull', 'bug', 'tree-pine',
  'snowflake', 'flower-2', 'sprout', 'leaf', 'rocket', 'git-branch', 'shield-check', 'zap', 'flame',
  'wind', 'anchor', 'sailboat', 'tree-palm', 'mountain', 'compass', 'party-popper', 'trophy',
  'message-circle', 'sun', 'cloud-sun', 'cloud-lightning', 'cloud-rain', 'coffee', 'hand-heart',
  'telescope', 'target', 'wrench', 'construction', 'rainbow', 'umbrella', 'cherry', 'cookie',
  'candy-cane', 'bell', 'gem', 'crown', 'bomb', 'cpu', 'terminal', 'swords', 'medal', 'puzzle',
  'megaphone', 'repeat', 'hourglass', 'flag', 'bot', 'sparkles', 'circle-question-mark', 'plus', 'minus',
] as const
export type ColumnIcon = (typeof COLUMN_ICONS)[number]
export const DEFAULT_COLUMN_ICON: ColumnIcon = 'sparkles'
