import { chromium } from '@playwright/test'
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
const p = await b.newPage(); const errs=[]
p.on('console', m => { if (m.type()==='error') errs.push(m.text().slice(0,140)) })
p.on('pageerror', e => errs.push(String(e)))
for (const u of ['/', '/new/']) { await p.goto('http://localhost:8787'+u); await p.waitForTimeout(1500); await p.mouse.wheel(0,3000); await p.waitForTimeout(800) }
console.log(errs.length, [...new Set(errs)].slice(0,5)); await b.close()
