/** The attention categories (change attention-and-notifications): one table drives the centre, the defaults and the tests. */
export type AttentionCategory =
  | 'phase' | 'timer' | 'turn' | 'voting' | 'action' | 'mention' | 'callback'
  | 'idea' | 'chat' | 'presence' | 'presenter'

export type AttentionImportance = 'important' | 'quiet'
/** Panel a click on a system notification opens. */
export type AttentionTarget = 'board' | 'chat' | 'actions' | 'talk'

export interface CategoryInfo {
  id: AttentionCategory
  importance: AttentionImportance
  /** On for a person who never opened the centre. */
  default: boolean
  /** i18n key of the label in the centre; the notification title is `<labelKey>.title`. */
  labelKey: string
  target: AttentionTarget
}

const important = (id: AttentionCategory, target: AttentionTarget): CategoryInfo => ({ id, importance: 'important', default: true, labelKey: `attention.cat.${id}`, target })
const quiet = (id: AttentionCategory, target: AttentionTarget): CategoryInfo => ({ id, importance: 'quiet', default: false, labelKey: `attention.cat.${id}`, target })

export const ATTENTION_CATEGORIES: readonly CategoryInfo[] = [
  important('phase', 'board'),
  important('timer', 'board'),
  important('turn', 'talk'),
  important('voting', 'board'),
  important('action', 'actions'),
  important('mention', 'chat'),
  important('callback', 'board'),
  quiet('idea', 'board'),
  quiet('chat', 'chat'),
  quiet('presence', 'board'),
  quiet('presenter', 'board'),
]

export const categoryInfo = (id: AttentionCategory): CategoryInfo => ATTENTION_CATEGORIES.find((c) => c.id === id)!

/** The defaults of a person who never opened the centre. */
export const defaultAttentionEnabled = (): Record<AttentionCategory, boolean> =>
  Object.fromEntries(ATTENTION_CATEGORIES.map((c) => [c.id, c.default])) as Record<AttentionCategory, boolean>
