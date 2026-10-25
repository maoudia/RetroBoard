// Shows the visitor's language only (both stay visible without JavaScript) and runs the retry countdown.
const fr = (navigator.language || '').toLowerCase().startsWith('fr')
for (const el of document.querySelectorAll('[lang]')) el.hidden = (el.getAttribute('lang') === 'fr') !== fr
document.documentElement.lang = fr ? 'fr' : 'en'
const count = document.querySelector('[data-countdown]')
if (count) {
  let left = Number(count.getAttribute('data-countdown')) || 30
  const tick = () => {
    for (const n of document.querySelectorAll('.count')) n.textContent = String(left)
    if (left-- <= 0) location.reload(); else setTimeout(tick, 1000)
  }
  tick()
}
