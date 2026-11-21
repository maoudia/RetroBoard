/**
 * A media query as a ref, kept in step with the window on the client (false while the page is built and before it is mounted).
 * `needs` is a CSS length the browser must understand for the ref to be true: the oval table needs cos() and sin(), and without them the room keeps its grid.
 */
export function useMedia(query: string, needs?: string): Ref<boolean> {
  const matches = ref(false)
  let list: MediaQueryList | null = null
  const can = () => needs === undefined || CSS.supports('width', needs)
  const change = (e: MediaQueryListEvent) => { matches.value = e.matches && can() }
  onMounted(() => { list = window.matchMedia(query); matches.value = list.matches && can(); list.addEventListener('change', change) })
  onBeforeUnmount(() => list?.removeEventListener('change', change))
  return matches
}
