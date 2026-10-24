<script setup lang="ts">
import type { ThemeDefinition } from '~/themes/types'

defineProps<{ theme: ThemeDefinition }>()
</script>

<template>
  <figure class="tc" :style="{ '--bg': theme.tokens.bg, '--bg2': theme.tokens.bg2, '--sf': theme.tokens.surface, '--bd': theme.tokens.border, '--tx': theme.tokens.text, '--mu': theme.tokens.muted, '--ac': theme.tokens.accent }">
    <div class="screen">
      <div class="top"><i class="logo" /><span class="t" /><span class="pillx" /></div>
      <div class="cols">
        <div v-for="c in 3" :key="c" class="c">
          <span class="h" />
          <i v-for="k in (c === 2 ? 2 : 3)" :key="k" class="n" :style="{ background: theme.noteColors[(c * 2 + k) % 8], '--r': `${((c + k) % 3 - 1) * 1.6}deg` }" />
        </div>
      </div>
    </div>
    <figcaption>
      <strong>{{ theme.emoji }} {{ theme.name }}</strong>
      <small>{{ themeText(theme).tagline }}</small>
    </figcaption>
  </figure>
</template>

<style scoped>
.tc { margin: 0; display: grid; gap: .85rem; transition: transform .5s cubic-bezier(.2,.8,.2,1); }
.tc:hover { transform: translateY(-6px); }
.screen { aspect-ratio: 16 / 10; padding: 12px; border-radius: 16px; background: linear-gradient(160deg, var(--bg), var(--bg2)); border: 1px solid color-mix(in srgb, var(--bd) 70%, #0000); box-shadow: 0 20px 40px -22px rgb(0 0 0 / .45); display: grid; grid-template-rows: auto 1fr; gap: 10px; overflow: hidden; }
.top { display: flex; align-items: center; gap: 8px; } .logo { width: 14px; height: 14px; border-radius: 5px; background: var(--ac); }
.t { width: 38%; height: 6px; border-radius: 3px; background: var(--tx); opacity: .75; } .pillx { margin-left: auto; width: 26px; height: 10px; border-radius: 99px; background: var(--ac); opacity: .85; }
.cols { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.c { display: grid; gap: 6px; align-content: start; padding: 7px; border-radius: 8px; background: var(--sf); border: 1px solid var(--bd); }
.h { width: 55%; height: 5px; border-radius: 3px; background: var(--mu); opacity: .8; }
.n { display: block; height: 18px; border-radius: 3px; rotate: var(--r); box-shadow: 0 3px 6px -3px rgb(0 0 0 / .4); }
figcaption { display: grid; gap: 2px; text-align: left; } figcaption strong { color: #1d1d1f; font-size: 1.05rem; } figcaption small { color: #6e6e73; }
</style>
