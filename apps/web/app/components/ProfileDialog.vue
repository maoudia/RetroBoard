<script setup lang="ts">
import { LIMITS } from '@retroboard/domain'
import { hasChosen, showNameAfterTyping } from '~/utils/show-name'
import { THEMES } from '@retroboard/themes'
import { AVATAR_HUES } from '~/stores/settings'
import { LOCALES } from '~/i18n'
import { askNotifyPermission, canNotify } from '~/utils/system-notify'
const { t, locale } = useT()

const ui = useUiStore()
const identity = useIdentityStore()
const settings = useSettingsStore()
const recents = useRecentsStore()
const board = useBoardStore()
const { push } = useToasts()

const open = computed({ get: () => ui.dialog === 'profile', set: (v) => { if (!v && ui.dialog === 'profile') ui.close() } })
const name = ref('')
const show = ref(false)
const wipeAsk = ref(false)
const touched = ref(false)
watch(open, (v) => { if (v) { identity.load(); name.value = identity.name; show.value = identity.showName; touched.value = hasChosen(identity) } })
watch(name, (n) => { show.value = showNameAfterTyping(n, touched.value, show.value) })

function saveIdentity() {
  identity.set({ name: name.value, showName: show.value })
  board.updateIdentity(identity.identity)
}
const set = (patch: Parameters<typeof settings.patch>[0]) => settings.patch(patch)
/** System notifications: the browser permission is asked here, on opt-in, and nowhere else. */
const notifyDenied = ref(typeof Notification !== 'undefined' && Notification.permission === 'denied')
async function toggleNotify(box: HTMLInputElement) {
  if (!box.checked) { set({ systemNotify: false }); return }
  const ok = await askNotifyPermission()
  notifyDenied.value = !ok
  box.checked = ok
  set({ systemNotify: ok })
}
const { $ports } = useNuxtApp()
async function wipe() {
  try { Object.keys(localStorage).filter((k) => k.startsWith('retroboard:')).forEach((k) => localStorage.removeItem(k)) } catch { /* ignore */ }
  try { Object.keys(sessionStorage).filter((k) => k.startsWith('retroboard:')).forEach((k) => sessionStorage.removeItem(k)) } catch { /* ignore */ }
  // Encrypted local copies of boards too.
  try { await $ports.replica?.purge(Number.MAX_SAFE_INTEGER) } catch { /* ignore */ }
  push(t('profile.wiped'), 'ok')
  setTimeout(() => window.location.assign('/'), 600)
}
const when = (at: number) => new Date(at).toLocaleDateString(locale.value === 'fr' ? 'fr-FR' : 'en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
</script>

<template>
  <BaseDialog v-model:open="open" :title="t('profile.title')" width="620px">
    <p class="muted intro"><Icon name="lucide:lock" /> {{ t('profile.intro') }}</p>

    <section class="grp">
      <h3>{{ t('profile.identity') }}</h3>
      <div class="id">
        <span class="av" :style="{ background: `hsl(${settings.s.avatarHue} 75% 78%)` }">{{ (name.trim()[0] ?? '?').toUpperCase() }}</span>
        <input v-model="name" class="field" :maxlength="LIMITS.displayName" :placeholder="t('name.placeholder')" :aria-label="t('name.label')" data-testid="profile-name" @change="saveIdentity" @blur="saveIdentity" />
      </div>
      <div class="hues" role="radiogroup" :aria-label="t('profile.avatarColor')">
        <button v-for="h in AVATAR_HUES" :key="h" type="button" role="radio" :aria-checked="settings.s.avatarHue === h" class="hue" :class="{ on: settings.s.avatarHue === h }" :style="{ background: `hsl(${h} 75% 78%)` }" :aria-label="t('profile.hue', { n: h })" @click="set({ avatarHue: h })" />
      </div>
      <label class="line">
        <span><strong>{{ t('profile.showName') }}</strong><small class="muted">{{ t('profile.showName.hint') }}</small></span>
        <input v-model="show" type="checkbox" role="switch" class="switch" data-testid="profile-show" @change="touched = true; saveIdentity()" />
      </label>
    </section>

    <section class="grp">
      <h3>{{ t('profile.look') }}</h3>
      <div class="line">
        <span><strong>{{ t('profile.language') }}</strong><small class="muted">{{ t('profile.language.hint') }}</small></span>
        <span class="seg">
          <button v-for="l in LOCALES" :key="l.id" type="button" :class="{ on: settings.s.locale === l.id }" :lang="l.id" :data-testid="`pref-lang-${l.id}`" @click="set({ locale: l.id })">{{ l.label }}</button>
          <button type="button" :class="{ on: settings.s.locale === 'auto' }" data-testid="lang-auto" @click="set({ locale: 'auto' })">{{ t('profile.language.auto') }}</button>
        </span>
      </div>
      <div class="line">
        <span><strong>{{ t('profile.variant') }}</strong><small class="muted">{{ t('profile.variant.hint') }}</small></span>
        <span class="seg" role="group" :aria-label="t('profile.variant')">
          <button v-for="v in (['theme', 'light', 'dark', 'system'] as const)" :key="v" type="button" :class="{ on: settings.s.variant === v }" :aria-pressed="settings.s.variant === v" :data-testid="`variant-${v}`" @click="set({ variant: v })">{{ t(`profile.variant.${v}`) }}</button>
        </span>
      </div>
      <div class="line">
        <span><strong>{{ t('profile.defaultTheme') }}</strong></span>
        <select class="field sel" :value="settings.s.defaultTheme ?? ''" :aria-label="t('profile.defaultTheme.aria')" @change="set({ defaultTheme: ($event.target as HTMLSelectElement).value || null })">
          <option value="">{{ t('profile.defaultTheme.season') }}</option>
          <option v-for="th in THEMES" :key="th.id" :value="th.id">{{ th.name }}</option>
        </select>
      </div>
      <label class="line">
        <span><strong>{{ t('profile.ambient') }}</strong><small class="muted">{{ t('profile.ambient.hint') }}</small></span>
        <input type="checkbox" role="switch" class="switch" :checked="settings.s.ambient" data-testid="set-ambient" @change="set({ ambient: ($event.target as HTMLInputElement).checked })" />
      </label>
      <div class="line">
        <span><strong>{{ t('profile.motion') }}</strong><small class="muted">{{ t('profile.motion.hint') }}</small></span>
        <span class="seg">
          <button type="button" :class="{ on: settings.s.motion === 'auto' }" @click="set({ motion: 'auto' })">{{ t('profile.motion.normal') }}</button>
          <button type="button" :class="{ on: settings.s.motion === 'reduced' }" data-testid="motion-reduced" @click="set({ motion: 'reduced' })">{{ t('profile.motion.reduced') }}</button>
        </span>
      </div>
      <div class="line">
        <span><strong>{{ t('profile.density') }}</strong></span>
        <span class="seg">
          <button type="button" :class="{ on: settings.s.density === 'comfortable' }" @click="set({ density: 'comfortable' })">{{ t('profile.density.comfortable') }}</button>
          <button type="button" :class="{ on: settings.s.density === 'compact' }" data-testid="density-compact" @click="set({ density: 'compact' })">{{ t('profile.density.compact') }}</button>
        </span>
      </div>
      <label class="line">
        <span><strong>{{ t('profile.shortcuts') }}</strong><small class="muted">{{ t('profile.shortcuts.hint') }}</small></span>
        <input type="checkbox" role="switch" class="switch" :checked="settings.s.shortcuts" data-testid="set-shortcuts" @change="set({ shortcuts: ($event.target as HTMLInputElement).checked })" />
      </label>
      <label class="line">
        <span><strong>{{ t('profile.keyHints') }}</strong><small class="muted">{{ t('profile.keyHints.hint') }}</small></span>
        <input type="checkbox" role="switch" class="switch" :checked="settings.s.keyHints" :disabled="!settings.s.shortcuts" data-testid="set-key-hints" @change="set({ keyHints: ($event.target as HTMLInputElement).checked })" />
      </label>
      <div class="line">
        <span><strong>{{ t('profile.notifyPos') }}</strong></span>
        <span class="seg">
          <button v-for="p in (['left', 'center', 'right'] as const)" :key="p" type="button" :class="{ on: settings.s.notifyPos === p }" :aria-pressed="settings.s.notifyPos === p" :data-testid="`notify-${p}`" @click="set({ notifyPos: p })">{{ t(`profile.notifyPos.${p}` as never) }}</button>
        </span>
      </div>
      <label class="line">
        <span><strong>{{ t('profile.phaseWarning') }}</strong></span>
        <input type="checkbox" role="switch" class="switch" :checked="settings.s.phaseWarning" data-testid="set-phase-warning" @change="set({ phaseWarning: ($event.target as HTMLInputElement).checked })" />
      </label>
      <label v-if="canNotify()" class="line">
        <span><strong>{{ t('profile.systemNotify') }}</strong><small class="muted">{{ notifyDenied ? t('profile.systemNotify.denied') : t('profile.systemNotify.hint') }}</small></span>
        <input type="checkbox" role="switch" class="switch" :checked="settings.s.systemNotify" data-testid="set-system-notify" @change="toggleNotify(($event.target as HTMLInputElement))" />
      </label>
      <label class="line">
        <span><strong>{{ t('profile.sound') }}</strong></span>
        <input type="checkbox" role="switch" class="switch" :checked="settings.s.sound" data-testid="set-sound" @change="set({ sound: ($event.target as HTMLInputElement).checked })" />
      </label>
    </section>

    <section class="grp">
      <h3>{{ t('profile.privacy') }}</h3>
      <div class="line">
        <span><strong>{{ t('profile.retention') }}</strong><small class="muted">{{ t('profile.retention.hint') }}</small></span>
        <span class="seg" role="group" :aria-label="t('profile.retention')">
          <button v-for="d in ([0, 1, 7, 30] as const)" :key="d" type="button" :class="{ on: settings.s.retentionDays === d }" :aria-pressed="settings.s.retentionDays === d" :data-testid="`retention-${d}`" @click="set({ retentionDays: d })">
            {{ d === 0 ? t('profile.retention.leave') : t('profile.retention.days', { n: d }) }}
          </button>
        </span>
      </div>
      <label class="line">
        <span><strong>{{ t('profile.shareCursor') }}</strong><small class="muted">{{ t('profile.shareCursor.hint') }}</small></span>
        <input type="checkbox" role="switch" class="switch" :checked="settings.s.shareCursor" data-testid="set-share-cursor" @change="set({ shareCursor: ($event.target as HTMLInputElement).checked })" />
      </label>
      <label class="line">
        <span><strong>{{ t('profile.p2p') }}</strong><small class="muted">{{ t('profile.p2p.hint') }}</small></span>
        <input type="checkbox" role="switch" class="switch" :checked="settings.s.p2p" data-testid="set-p2p" @change="set({ p2p: ($event.target as HTMLInputElement).checked })" />
      </label>
      <label class="line">
        <span><strong>{{ t('profile.showCursors') }}</strong></span>
        <input type="checkbox" role="switch" class="switch" :checked="settings.s.showCursors" data-testid="set-show-cursors" @change="set({ showCursors: ($event.target as HTMLInputElement).checked })" />
      </label>
    </section>

    <section class="grp">
      <h3>{{ t('profile.agents') }}</h3>
      <label class="line">
        <span><strong>{{ t('profile.browserAgents') }}</strong><small class="muted">{{ t('profile.browserAgents.hint') }}</small></span>
        <input type="checkbox" role="switch" class="switch" :checked="settings.s.browserAgents" data-testid="set-browser-agents" @change="set({ browserAgents: ($event.target as HTMLInputElement).checked })" />
      </label>
    </section>

    <section class="grp">
      <h3>{{ t('profile.recents') }} <span class="muted n">{{ t('profile.recents.where') }}</span></h3>
      <p v-if="!recents.items.length" class="muted">{{ t('profile.recents.none') }}</p>
      <ul v-else class="recents" data-testid="recents">
        <li v-for="r in recents.items" :key="r.id">
          <NuxtLink :to="{ path: '/board', hash: r.hash }" @click="ui.close()"><strong>{{ r.title }}</strong><small class="muted">{{ when(r.at) }}</small></NuxtLink>
          <button class="mini-btn" type="button" :aria-label="t('profile.recents.remove')" @click="recents.remove(r.id)"><Icon name="lucide:x" /></button>
        </li>
      </ul>
    </section>

    <section class="grp danger-zone">
      <h3>{{ t('profile.local') }}</h3>
      <div class="line">
        <span><strong>{{ t('profile.wipe') }}</strong><small class="muted">{{ t('profile.wipe.hint') }}</small></span>
        <button class="btn btn-danger btn-sm" type="button" data-testid="wipe-local" @click="wipeAsk = true"><Icon name="lucide:trash" /> {{ t('profile.wipeBtn') }}</button>
      </div>
    </section>
    <ConfirmDialog v-model:open="wipeAsk" danger :title="t('profile.wipe.title')" :confirm-label="t('profile.wipeBtn')" :message="t('profile.wipe.msg')" @confirm="wipe" />
    <LegalLinks class="legal" />
  </BaseDialog>
</template>

<style scoped>
.intro { display: flex; gap: .5rem; align-items: center; font-size: var(--fs-sm); }
.grp { display: grid; gap: .8rem; padding-top: .9rem; border-top: 1px solid var(--border); }
h3 { font-size: var(--fs-sm); color: var(--muted); text-transform: uppercase; letter-spacing: .06em; font-family: var(--f-body); font-weight: 800; }
h3 .n { text-transform: none; letter-spacing: 0; font-weight: 500; }
.id { display: flex; gap: .75rem; align-items: center; }
.av { display: grid; place-items: center; width: 44px; height: 44px; flex: none; border-radius: 50%; font-weight: 800; color: #1b1b1b; transition: background .2s; }
.hues { display: flex; gap: 8px; }
.hue { width: 26px; height: 26px; border-radius: 50%; border: 2px solid transparent; cursor: pointer; transition: transform .15s; }
.hue:hover { transform: scale(1.15); }
.hue.on { border-color: var(--text); }
.line { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
.line > span:first-child { display: grid; gap: 2px; min-width: 0; }
.line small { font-size: var(--fs-sm); }
.seg { display: inline-flex; flex: none; border: 1px solid var(--border); border-radius: var(--r-control); overflow: hidden; }
.seg button { padding: .4rem .75rem; border: 0; border-right: 1px solid var(--border); background: var(--surface2); cursor: pointer; font-weight: 600; font-size: var(--fs-sm); }
.seg button:last-child { border-right: 0; }
.seg button.on { background: var(--accent); color: var(--accent-ink); }
.sel { width: auto; min-width: 170px; }
.mine { display: grid; gap: .4rem; padding: .7rem; border-radius: var(--r-control); background: var(--surface2); }
.lbl-sm { font-size: var(--fs-xs); font-weight: 800; text-transform: uppercase; letter-spacing: .05em; }
.chips { display: flex; flex-wrap: wrap; gap: .4rem; }
.chip { padding: .3rem .7rem; border-radius: 999px; border: 1.5px solid var(--border); background: var(--surface); cursor: pointer; font-weight: 600; font-size: var(--fs-sm); }
.chip.on { border-color: var(--accent); background: var(--accent-soft); color: var(--accent); }
.switch { appearance: none; flex: none; width: 46px; height: 26px; border-radius: 999px; background: var(--border); position: relative; cursor: pointer; transition: background .2s; }
.switch::after { content: ''; position: absolute; top: 3px; left: 3px; width: 20px; height: 20px; border-radius: 50%; background: var(--text); transition: transform .25s var(--ease); }
.switch:checked { background: var(--accent); }
.switch:checked::after { transform: translateX(20px); background: var(--accent-ink); }
.recents { list-style: none; margin: 0; padding: 0; display: grid; gap: 2px; max-height: 190px; overflow: auto; }
.recents li { display: flex; align-items: center; gap: .5rem; padding: .3rem .5rem; border-radius: var(--r-sm); }
.recents li:hover { background: var(--accent-soft); }
.recents a { flex: 1; display: flex; justify-content: space-between; gap: 1rem; color: inherit; text-decoration: none; min-width: 0; }
.recents strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.danger-zone h3 { color: var(--danger); }
</style>
