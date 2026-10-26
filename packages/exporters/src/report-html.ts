import type { Report } from '@retroboard/application'

/** Label provider: `report.*`, `agenda.phase.*` and `actions.status.*` i18n keys. */
export type ReportLabels = (key: string, params?: Record<string, string | number>) => string

/** Escapes text for HTML content and attribute values. */
export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}

const minutes = (ms: number) => `${Math.round(ms / 60_000)} min`

/** Styles of the standalone file: readable on screen, clean when printed to PDF. */
const CSS = `
:root{color-scheme:light;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;color:#1d1d1f;line-height:1.5}
body{max-width:52rem;margin:0 auto;padding:2rem 1.25rem}
h1{margin:0 0 .2rem}h2{margin:2rem 0 .6rem;font-size:1.2rem;border-bottom:1px solid #d2d2d7;padding-bottom:.3rem}
.muted{color:#6e6e73}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(9rem,1fr));gap:.6rem}
.kpi{border:1px solid #d2d2d7;border-radius:10px;padding:.6rem .8rem}.kpi b{display:block;font-size:1.5rem}
table{width:100%;border-collapse:collapse}td,th{text-align:left;padding:.35rem .5rem;border-bottom:1px solid #e5e5ea;vertical-align:top}
ul{padding-left:1.2rem}.v{white-space:nowrap;color:#6e6e73}
@media print{body{padding:0}h2{break-after:avoid}table,ul{break-inside:auto}}
`

/** The retro report as one self-contained HTML file (no script, no external resource). */
export function toReportHtml(r: Report, t: ReportLabels): string {
  const e = escapeHtml
  const votes = (n: number) => (r.votesHidden ? '' : ` <span class="v">${e(t('report.votesN', { n }))}</span>`)
  const out: string[] = []
  out.push(`<!doctype html><html lang="${e(t('report.lang'))}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">`)
  out.push(`<title>${e(r.title)} - ${e(t('report.title'))}</title><style>${CSS}</style></head><body>`)
  out.push(`<h1>${e(r.title)}</h1><p class="muted">${e(t('report.title'))} - ${e(r.date)}</p>`)

  const m = r.metrics
  out.push(`<h2>${e(t('report.metrics'))}</h2><div class="grid">`)
  const kpi = (label: string, value: string) => out.push(`<div class="kpi"><b>${e(value)}</b>${e(label)}</div>`)
  kpi(t('report.participants'), String(m.participants))
  kpi(t('report.ideas'), String(m.ideas))
  kpi(t('report.votes'), m.votes === null ? '-' : String(m.votes))
  kpi(t('report.clusters'), String(m.clusters))
  kpi(t('report.actions'), String(m.actions))
  out.push('</div>')
  if (r.ideasPerAuthor.length) {
    out.push(`<p class="muted">${e(t('report.ideasPerAuthor'))}: ${r.ideasPerAuthor.map((a) => `${e(a.author ?? t('report.anonymous'))} (${a.ideas})`).join(', ')}</p>`)
  }

  out.push(`<h2>${e(t('report.podium'))}</h2>`)
  if (r.votesHidden) out.push(`<p class="muted">${e(t('report.votesHidden'))}</p>`)
  else if (!r.podium.length) out.push(`<p class="muted">${e(t('report.noPodium'))}</p>`)
  else out.push(`<ol>${r.podium.map((p) => `<li>${e(p.title)}${votes(p.votes)}</li>`).join('')}</ol>`)

  out.push(`<h2>${e(t('report.ideasByColumn'))}</h2>`)
  for (const c of r.columns) {
    out.push(`<h3>${e(c.title)} <span class="v">(${c.ideas})</span></h3>`)
    if (!c.items.length) { out.push(`<p class="muted">${e(t('report.noIdea'))}</p>`); continue }
    out.push('<ul>')
    for (const it of c.items) {
      if (it.kind === 'note') out.push(`<li>${e(it.note.text)}${votes(it.votes)}</li>`)
      else out.push(`<li><b>${e(it.title)}</b>${votes(it.votes)}<ul>${it.notes.map((n) => `<li>${e(n.text)}</li>`).join('')}</ul></li>`)
    }
    out.push('</ul>')
  }

  out.push(`<h2>${e(t('report.actions'))}</h2>`)
  if (!r.actions.length) out.push(`<p class="muted">${e(t('report.noAction'))}</p>`)
  else {
    out.push(`<table><thead><tr><th>${e(t('report.action'))}</th><th>${e(t('report.owner'))}</th><th>${e(t('report.status'))}</th><th>${e(t('report.due'))}</th></tr></thead><tbody>`)
    for (const a of r.actions) {
      const from = a.carriedFrom ? ` <span class="v">(${e(t('report.from', { title: a.carriedFrom }))})</span>` : ''
      out.push(`<tr><td>${e(a.text)}${from}</td><td>${e(a.owner || '-')}</td><td>${e(t(`actions.status.${a.status}`))}</td><td>${e(a.due ?? '-')}</td></tr>`)
    }
    out.push('</tbody></table>')
  }
  if (r.carried.total) {
    const parts = Object.entries(r.carried.byStatus).map(([s, n]) => `${e(t(`actions.status.${s}`))}: ${n}`)
    out.push(`<p class="muted">${e(t('report.carried', { n: r.carried.total }))} ${parts.join(', ')}</p>`)
  }

  if (r.agenda) {
    out.push(`<h2>${e(t('report.agenda'))}</h2><table><thead><tr><th>${e(t('report.phase'))}</th><th>${e(t('report.planned'))}</th><th>${e(t('report.actual'))}</th></tr></thead><tbody>`)
    for (const p of r.agenda) out.push(`<tr><td>${e(t(`agenda.phase.${p.kind}`))}</td><td>${minutes(p.plannedMs)}</td><td>${p.actualMs === null ? '-' : minutes(p.actualMs)}</td></tr>`)
    out.push('</tbody></table>')
  }
  if (r.talk) {
    out.push(`<h2>${e(t('report.talk'))}</h2><ul>`)
    for (const s of r.talk) out.push(`<li>${e(s.label ?? t('report.anonymous'))}: ${Math.round(s.share * 100)} % <span class="v">(${minutes(s.ms)})</span></li>`)
    out.push('</ul>')
  }
  if (r.roti) {
    out.push(`<h2>${e(t('report.roti'))}</h2><p>${e(t('report.roti.average', { avg: r.roti.average.toFixed(1), n: r.roti.total }))}</p><ul>`)
    r.roti.counts.forEach((n, i) => out.push(`<li>${i + 1} / 5: ${n}</li>`))
    out.push('</ul>')
  }
  out.push(`<p class="muted">${e(t('report.footer'))}</p></body></html>`)
  return out.join('\n')
}
