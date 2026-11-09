(() => {
  const root = document.documentElement
  const KEY = 'retroboard:guide-variant'
  const stored = (() => { try { return localStorage.getItem(KEY) } catch { return null } })()
  const system = () => (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
  const apply = (v) => { root.dataset.variant = v; const b = document.getElementById('variant'); if (b) b.setAttribute('aria-pressed', String(v === 'dark')) }
  let chosen = stored === 'dark' || stored === 'light'
  apply(chosen ? stored : system())
  // Firefox can report the colour scheme late: follow it until the reader picks a variant.
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (!chosen) apply(system()) })
  document.getElementById('variant')?.addEventListener('click', () => {
    const next = root.dataset.variant === 'dark' ? 'light' : 'dark'
    chosen = true
    apply(next)
    try { localStorage.setItem(KEY, next) } catch { /* private mode: the choice lasts for this page */ }
  })
})()
