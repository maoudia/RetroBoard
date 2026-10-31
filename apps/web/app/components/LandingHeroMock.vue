<script setup lang="ts">
const { t } = useT()
/** Looping product demo built with CSS only: notes drop in, votes tick, cursors wander. */
const cols = [
  { title: 'Start', color: '#fde68a', notes: ['landing.mock.n1', 'landing.mock.n2'] as const },
  { title: 'Stop', color: '#fbcfe8', notes: ['landing.mock.n3', 'landing.mock.n4', 'landing.mock.n5'] as const },
  { title: 'Continue', color: '#bbf7d0', notes: ['landing.mock.n6', 'landing.mock.n7'] as const },
]
let n = 0
const delay = () => `${(n++ * 0.55 + 0.4).toFixed(2)}s`
const rows = cols.map((c) => ({ ...c, items: c.notes.map((key) => ({ key, d: delay(), tilt: ((key.length % 5) - 2) * 0.8 })) }))
</script>

<template>
  <div class="win" aria-hidden="true">
    <div class="chrome">
      <span class="dots"><i /><i /><i /></span>
      <span class="url">retroboard</span>
      <span class="who"><b :style="{ '--h': '210' }">A</b><b :style="{ '--h': '140' }">B</b><b :style="{ '--h': '320' }">C</b></span>
    </div>
    <div class="bar">
      <strong>{{ t('landing.mock.sprint') }}</strong>
      <span class="timer"><i class="ring" />04:12</span>
      <span class="pill">{{ t('landing.mock.votes') }}</span>
    </div>
    <div class="board">
      <section v-for="c in rows" :key="c.title" class="col">
        <h4><i :style="{ background: c.color }" />{{ c.title }}</h4>
        <article v-for="(it, i) in c.items" :key="it.key" class="note" :style="{ '--c': c.color, '--d': it.d, '--tilt': `${it.tilt}deg` }">
          {{ t(it.key) }}
          <span v-if="i === 0" class="vote">+1</span>
        </article>
      </section>
    </div>
    <span class="cursor a"><svg viewBox="0 0 16 16" width="16" height="16"><path d="M2 1l11 6-5 1.5L6 14z" fill="#0071e3" /></svg><em>Alice</em></span>
    <span class="cursor b"><svg viewBox="0 0 16 16" width="16" height="16"><path d="M2 1l11 6-5 1.5L6 14z" fill="#1b7f3b" /></svg><em>Bob</em></span>
  </div>
</template>

<style scoped>
.win { position: relative; width: 100%; background: #fff; border: 1px solid #e5e5ea; border-radius: 22px; box-shadow: 0 40px 80px -30px rgb(0 0 0 / .28), 0 8px 24px rgb(0 0 0 / .06); overflow: hidden; text-align: left; }
.chrome { display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: #f5f5f7; border-bottom: 1px solid #e5e5ea; }
.dots { display: flex; gap: 7px; } .dots i { width: 11px; height: 11px; border-radius: 50%; background: #d1d1d6; }
.dots i:nth-child(1) { background: #ff5f57; } .dots i:nth-child(2) { background: #febc2e; } .dots i:nth-child(3) { background: #28c840; }
.url { flex: 1; max-width: 280px; margin: 0 auto; padding: 4px 12px; border-radius: var(--r-sm); background: #fff; color: #6e6e73; font-size: var(--fs-xs); text-align: center; }
.who { display: flex; } .who b { display: grid; place-items: center; width: 24px; height: 24px; margin-left: -6px; border: 2px solid #f5f5f7; border-radius: 50%; background: hsl(var(--h) 75% 78%); color: #1d1d1f; font-size: var(--fs-xs); }
.bar { display: flex; align-items: center; gap: 14px; padding: 12px 18px; color: #1d1d1f; border-bottom: 1px solid #f0f0f3; }
.bar strong { font-size: var(--fs-sm); } .pill { margin-left: auto; padding: 3px 10px; border-radius: 999px; background: #e8f1ff; color: #0058b9; font-size: var(--fs-xs); font-weight: 600; }
.timer { display: inline-flex; align-items: center; gap: 8px; font-variant-numeric: tabular-nums; font-weight: 700; font-size: var(--fs-sm); }
.ring { width: 14px; height: 14px; border-radius: 50%; border: 2.5px solid #0071e3; border-right-color: transparent; animation: spin 2.4s linear infinite; }
.board { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; padding: 16px 18px 22px; background: #fbfbfd; min-height: 300px; }
.col { display: grid; gap: 10px; align-content: start; padding: 12px; border-radius: var(--r-card); background: #fff; border: 1px solid #ececf0; }
h4 { font-family: inherit; display: flex; align-items: center; gap: 8px; margin: 0 0 2px; color: #1d1d1f; font-size: var(--fs-xs); font-weight: 700; }
h4 i { width: 10px; height: 10px; border-radius: 3px; }
.note { position: relative; padding: 10px 11px; border-radius: var(--r-sm); background: var(--c); color: #1d1d1f; font-size: var(--fs-xs); font-weight: 500; line-height: 1.3; box-shadow: 0 6px 14px -8px rgb(0 0 0 / .35); opacity: 0; animation: cycle 14s var(--d) infinite both; }
.vote { position: absolute; right: 6px; bottom: -8px; padding: 1px 8px; border-radius: 999px; background: #1d1d1f; color: #fff; font-size: var(--fs-xs); font-weight: 700; animation: tick 14s calc(var(--d) + 1.5s) infinite both; }
@keyframes cycle {
  0% { opacity: 0; transform: translateY(-34px) rotate(8deg) scale(.92); }
  4% { opacity: 1; transform: translateY(4px) rotate(-1deg) scale(1.02); }
  6%, 88% { opacity: 1; transform: translateY(0) rotate(var(--tilt)); }
  94%, 100% { opacity: 0; transform: translateY(6px) scale(.96); }
}
@keyframes tick { 0%, 8% { transform: scale(0); } 12% { transform: scale(1.3); } 16%, 100% { transform: scale(1); } }
@keyframes spin { to { rotate: 360deg; } }
.cursor { position: absolute; display: inline-flex; align-items: flex-start; gap: 2px; pointer-events: none; filter: drop-shadow(0 2px 3px rgb(0 0 0 / .2)); }
.cursor em { margin-top: 12px; padding: 2px 8px; border-radius: 999px; color: #fff; font-size: var(--fs-xs); font-style: normal; font-weight: 600; }
.cursor.a em { background: #0071e3; } .cursor.b em { background: #1b7f3b; }
.cursor.a { animation: wander-a 11s ease-in-out infinite; } .cursor.b { animation: wander-b 13s ease-in-out infinite; }
@keyframes wander-a { 0%, 100% { left: 18%; top: 38%; } 30% { left: 46%; top: 62%; } 60% { left: 70%; top: 46%; } 80% { left: 30%; top: 74%; } }
@keyframes wander-b { 0%, 100% { left: 78%; top: 70%; } 25% { left: 52%; top: 44%; } 55% { left: 24%; top: 58%; } 80% { left: 64%; top: 34%; } }
@media (max-width: 640px) { .board { grid-template-columns: 1fr 1fr; } .col:nth-child(3) { display: none; } }
@media (prefers-reduced-motion: reduce) { .note { opacity: 1; animation: none; } .vote, .cursor, .ring { animation: none; } }
</style>
