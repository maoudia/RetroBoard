/** Layout choices kept per screen class on this device (change device-layout-prefs). Pure data helpers. */
export type ScreenClass = 'phone' | 'tablet' | 'desktop' | 'wall'
export const SCREEN_CLASSES: readonly ScreenClass[] = ['phone', 'tablet', 'desktop', 'wall']
export type Density = 'comfortable' | 'compact'

export interface ClassLayout {
  density?: Density
  focusStyle?: 'centre' | 'accordion'
  /** Writing areas folded to a handle (change board-layout-v2). */
  writingHidden?: boolean
  /** board room id -> column id -> size */
  sizes: Record<string, Record<string, string>>
  /** board room id -> writing area size */
  write: Record<string, string>
}
export type LayoutBook = Partial<Record<ScreenClass, ClassLayout>>

export const LAYOUT_KEY = 'retroboard:layout'

/** Phone under 600 px, tablet under 1024, desktop under 2200, wall (TV, meeting room) above. */
export function classOf(width: number): ScreenClass {
  return width < 600 ? 'phone' : width < 1024 ? 'tablet' : width < 2200 ? 'desktop' : 'wall'
}

const empty = (): ClassLayout => ({ sizes: {}, write: {} })
export const layoutOf = (book: LayoutBook, cls: ScreenClass): ClassLayout => book[cls] ?? empty()

/** Returns a new book; never mutates the input. */
export function withLayout(book: LayoutBook, cls: ScreenClass, patch: Partial<ClassLayout>): LayoutBook {
  return { ...book, [cls]: { ...layoutOf(book, cls), ...patch } }
}

export function setSize(book: LayoutBook, cls: ScreenClass, room: string, columnId: string, size: string): LayoutBook {
  const cur = layoutOf(book, cls)
  const rest = Object.fromEntries(Object.entries(cur.sizes[room] ?? {}).filter(([k]) => k !== columnId))
  const next = size === 'normal' ? rest : { ...rest, [columnId]: size }
  return withLayout(book, cls, { sizes: { ...cur.sizes, [room]: next } })
}

export function setWrite(book: LayoutBook, cls: ScreenClass, room: string, size: string): LayoutBook {
  const cur = layoutOf(book, cls)
  return withLayout(book, cls, { write: { ...cur.write, [room]: size } })
}

export const resetClass = (book: LayoutBook, cls: ScreenClass): LayoutBook => {
  const { [cls]: _gone, ...rest } = book
  return rest
}

/** Copy the layout of another class onto this one (deep copy). */
export const copyClass = (book: LayoutBook, from: ScreenClass, to: ScreenClass): LayoutBook =>
  from === to || !book[from] ? book : { ...book, [to]: structuredClone(layoutOf(book, from)) }

/**
 * Migration: column and writing sizes saved before this change were per board only (`rb.colsize.<room>`,
 * `rb.writesize.<room>`). They are read as the layout of every class that has no choice of its own.
 */
export function legacySizes(room: string, get: <T>(key: string, fallback: T) => T): { sizes: Record<string, string>, write: string | null } {
  return { sizes: get<Record<string, string>>(`rb.colsize.${room}`, {}), write: get<string | null>(`rb.writesize.${room}`, null) }
}
