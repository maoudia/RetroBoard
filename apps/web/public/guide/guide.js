(() => {
  const root = document.documentElement
  const KEY = 'retroboard:guide-variant'
  const stored = (() => { try { return localStorage.getItem(KEY) } catch { return null } })()
  const system = () => (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
  const apply = (v) => { root.dataset.variant = v; const b = document.getElementById('variant'); if (b) b.setAttribute('aria-pressed', String(v === 'dark')) }
  apply(stored === 'dark' || stored === 'light' ? stored : system())
  document.getElementById('variant')?.addEventListener('click', () => {
    const next = root.dataset.variant === 'dark' ? 'light' : 'dark'
    apply(next)
    try { localStorage.setItem(KEY, next) } catch { /* private mode: the choice lasts for this page */ }
  })
})()
