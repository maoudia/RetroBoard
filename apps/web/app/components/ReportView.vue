<script setup lang="ts">
import type { Report } from '@retroboard/application'
import { td } from '~/i18n'
const { t } = useT()

/** The retro report on screen (and on paper): same content as the HTML file export. */
defineProps<{ report: Report }>()
const minutes = (ms: number) => `${Math.round(ms / 60_000)} min`
</script>

<template>
  <article class="report" data-testid="report">
    <header>
      <h2 class="ttl">{{ report.title }}</h2>
      <p class="muted">{{ t('report.title') }} - {{ report.date }}</p>
    </header>

    <section>
      <h3>{{ t('report.metrics') }}</h3>
      <div class="kpis">
        <div class="kpi" data-testid="kpi-participants"><b>{{ report.metrics.participants }}</b>{{ t('report.participants') }}</div>
        <div class="kpi" data-testid="kpi-ideas"><b>{{ report.metrics.ideas }}</b>{{ t('report.ideas') }}</div>
        <div class="kpi" data-testid="kpi-votes"><b>{{ report.metrics.votes ?? '-' }}</b>{{ t('report.votes') }}</div>
        <div class="kpi"><b>{{ report.metrics.clusters }}</b>{{ t('report.clusters') }}</div>
        <div class="kpi" data-testid="kpi-actions"><b>{{ report.metrics.actions }}</b>{{ t('report.actions') }}</div>
      </div>
      <p v-if="report.ideasPerAuthor.length" class="muted small">
        {{ t('report.ideasPerAuthor') }}: {{ report.ideasPerAuthor.map((a) => `${a.author ?? t('report.anonymous')} (${a.ideas})`).join(', ') }}
      </p>
    </section>

    <section>
      <h3>{{ t('report.podium') }}</h3>
      <p v-if="report.votesHidden" class="muted">{{ t('report.votesHidden') }}</p>
      <p v-else-if="!report.podium.length" class="muted">{{ t('report.noPodium') }}</p>
      <ol v-else data-testid="report-podium">
        <li v-for="p in report.podium" :key="p.id">{{ p.title }} <span class="v">{{ t('report.votesN', { n: p.votes }) }}</span></li>
      </ol>
    </section>

    <section>
      <h3>{{ t('report.ideasByColumn') }}</h3>
      <div v-for="c in report.columns" :key="c.id" class="col">
        <h4>{{ c.title }} <span class="v">({{ c.ideas }})</span></h4>
        <p v-if="!c.items.length" class="muted small">{{ t('report.noIdea') }}</p>
        <ul v-else>
          <li v-for="it in c.items" :key="it.key">
            <template v-if="it.kind === 'note'">{{ it.note.text }}</template>
            <template v-else>
              <strong>{{ it.title }}</strong>
              <ul><li v-for="n in it.notes" :key="n.id">{{ n.text }}</li></ul>
            </template>
            <span v-if="!report.votesHidden" class="v"> {{ t('report.votesN', { n: it.votes }) }}</span>
          </li>
        </ul>
      </div>
    </section>

    <section>
      <h3>{{ t('report.actions') }}</h3>
      <p v-if="!report.actions.length" class="muted">{{ t('report.noAction') }}</p>
      <table v-else data-testid="report-actions">
        <thead><tr><th>{{ t('report.action') }}</th><th>{{ t('report.owner') }}</th><th>{{ t('report.status') }}</th><th>{{ t('report.due') }}</th></tr></thead>
        <tbody>
          <tr v-for="a in report.actions" :key="a.id">
            <td>{{ a.text }} <span v-if="a.carriedFrom" class="v">({{ t('report.from', { title: a.carriedFrom }) }})</span></td>
            <td>{{ a.owner || '-' }}</td>
            <td>{{ td(`actions.status.${a.status}`) }}</td>
            <td>{{ a.due ?? '-' }}</td>
          </tr>
        </tbody>
      </table>
      <p v-if="report.carried.total" class="muted small">
        {{ t('report.carried', { n: report.carried.total }) }}
        {{ Object.entries(report.carried.byStatus).map(([s, n]) => `${td(`actions.status.${s}`)}: ${n}`).join(', ') }}
      </p>
    </section>

    <section v-if="report.agenda">
      <h3>{{ t('report.agenda') }}</h3>
      <table data-testid="report-agenda">
        <thead><tr><th>{{ t('report.phase') }}</th><th>{{ t('report.planned') }}</th><th>{{ t('report.actual') }}</th></tr></thead>
        <tbody>
          <tr v-for="(p, i) in report.agenda" :key="i">
            <td>{{ td(`agenda.phase.${p.kind}`) }}</td><td>{{ minutes(p.plannedMs) }}</td><td>{{ p.actualMs === null ? '-' : minutes(p.actualMs) }}</td>
          </tr>
        </tbody>
      </table>
    </section>
    <section v-if="report.talk">
      <h3>{{ t('report.talk') }}</h3>
      <ul data-testid="report-talk">
        <li v-for="(s, i) in report.talk" :key="i">{{ s.label ?? t('report.anonymous') }}: {{ Math.round(s.share * 100) }} % <span class="v">({{ minutes(s.ms) }})</span></li>
      </ul>
    </section>
    <section v-if="report.roti" data-testid="report-roti">
      <h3>{{ t('report.roti') }}</h3>
      <p>{{ t('report.roti.average', { avg: report.roti.average.toFixed(1), n: report.roti.total }) }}</p>
      <ul>
        <li v-for="(n, i) in report.roti.counts" :key="i">{{ i + 1 }} / 5: {{ n }}</li>
      </ul>
    </section>
  </article>
</template>

<style scoped>
.report { display: grid; gap: 1rem; }
.ttl { margin: 0; }
h3 { margin: 0 0 .5rem; font-size: var(--fs-md); }
h4 { margin: .6rem 0 .2rem; font-size: var(--fs-md); }
.kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(7.5rem, 1fr)); gap: .5rem; }
.kpi { border: 1px solid var(--border); border-radius: var(--r-control); padding: .5rem .7rem; font-size: var(--fs-sm); }
.kpi b { display: block; font-size: var(--fs-2xl); }
ul, ol { margin: 0; padding-left: 1.2rem; display: grid; gap: .15rem; }
table { width: 100%; border-collapse: collapse; font-size: var(--fs-sm); }
th, td { text-align: left; padding: .3rem .4rem; border-bottom: 1px solid var(--border); vertical-align: top; }
.v { color: var(--muted); white-space: nowrap; font-size: var(--fs-sm); }
.small { font-size: var(--fs-sm); margin: .4rem 0 0; }
</style>
