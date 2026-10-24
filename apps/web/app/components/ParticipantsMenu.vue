<script setup lang="ts">
const { t } = useT()
const board = useBoardStore()
const initial = (n: string | null) => (n?.trim()[0] ?? '?').toUpperCase()
const hue = (n: string | null) => { let h = 0; for (const c of n ?? 'x') h = (h * 31 + c.charCodeAt(0)) % 360; return h }
</script>

<template>
  <Dropdown width="240px">
    <template #trigger="{ toggle, open }">
      <button class="icon-btn" type="button" :aria-expanded="open" data-testid="btn-participants" @click="toggle">
        <Icon name="lucide:users" class="ico" /><span>{{ t('toolbar.participants') }}</span>
        <span class="badge" data-testid="peer-count">{{ board.peers.length }}</span>
      </button>
    </template>
    <span class="head muted">{{ t('participants.online') }}</span>
    <ul class="list" data-testid="peers">
      <li v-for="(p, i) in board.peers" :key="i">
        <span class="av" :style="{ background: `hsl(${hue(p.name)} 70% 72%)` }">{{ initial(p.name) }}</span>
        <span class="nm">{{ p.name ?? t('common.anonymous') }}</span>
        <span v-if="p.me" class="pill">{{ t('common.you') }}</span>
      </li>
    </ul>
  </Dropdown>
</template>

<style scoped>
.head { font-size: .72rem; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; padding: .3rem .5rem; }
.list { list-style: none; margin: 0; padding: 0; display: grid; gap: 2px; }
li { display: flex; align-items: center; gap: .6rem; padding: .35rem .5rem; border-radius: 8px; }
.av { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 50%; font-weight: 800; font-size: .8rem; color: #1b1b1b; flex: none; }
.nm { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>
