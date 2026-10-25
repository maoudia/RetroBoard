import { safeStorage, randomId } from '~/utils/storage'
import type { Identity } from '~/transport'

const KEY = 'retroboard:identity'
interface Saved { cid: string; name: string; showName: boolean; named: boolean; nudgeOff?: boolean }

export const useIdentityStore = defineStore('identity', () => {
  const cid = ref('')
  const name = ref('')
  const showName = ref(false)
  /** True once the person has seen the name dialog (even if they left it empty). */
  const named = ref(false)
  /** "Don't ask again" on the name suggestion: every board of this browser. */
  const nudgeOff = ref(false)

  function load() {
    const saved = safeStorage.get<Partial<Saved>>(KEY, {})
    cid.value = saved.cid && saved.cid.length >= 16 ? saved.cid : randomId(16)
    name.value = saved.name ?? ''
    showName.value = saved.showName ?? false
    named.value = saved.named ?? false
    nudgeOff.value = saved.nudgeOff ?? false
    persist()
  }

  function persist() {
    safeStorage.set(KEY, { cid: cid.value, name: name.value, showName: showName.value, named: named.value, nudgeOff: nudgeOff.value } satisfies Saved)
  }

  function set(next: { name: string; showName: boolean }) {
    name.value = next.name.trim().slice(0, 24)
    showName.value = next.showName
    named.value = true
    persist()
  }

  function stopNudging() { nudgeOff.value = true; persist() }

  const identity = computed<Identity>(() => ({ cid: cid.value, name: name.value, showName: showName.value }))
  return { cid, name, showName, named, nudgeOff, identity, load, set, stopNudging }
})
