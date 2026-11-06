import type { Report } from '@retroboard/application'
import { escapeHtml, REPORT_CSS, type ReportLabels, toReportHtml } from './report-html'

/** OWASP 2023 recommendation for PBKDF2-HMAC-SHA256 (same as packages/crypto). */
const ITERATIONS = 600_000

const FORM_CSS = 'form{display:grid;gap:.6rem;max-width:24rem;margin:3rem auto}input,button{font:inherit;padding:.6rem .8rem;border:1px solid #6e6e73;border-radius:8px}button{background:#1d1d1f;color:#fff;cursor:pointer}[hidden]{display:none}.err{color:#b00020}'
const STYLE = `${REPORT_CSS}${FORM_CSS}`

/** Decrypts in the browser with WebCrypto; its sha256 goes in the CSP meta of the file, nothing else may run. */
export const DECRYPT_SCRIPT = `(async()=>{
const $=(i)=>document.getElementById(i);
const b=(s)=>Uint8Array.from(atob(s),(c)=>c.charCodeAt(0));
const p=JSON.parse($('p').textContent);
$('f').addEventListener('submit',async(ev)=>{
ev.preventDefault();
try{
const k0=await crypto.subtle.importKey('raw',new TextEncoder().encode($('w').value),'PBKDF2',false,['deriveKey']);
const k=await crypto.subtle.deriveKey({name:'PBKDF2',hash:'SHA-256',salt:b(p.s),iterations:p.i},k0,{name:'AES-GCM',length:256},false,['decrypt']);
const pt=await crypto.subtle.decrypt({name:'AES-GCM',iv:b(p.v)},k,b(p.c));
const tpl=document.createElement('template');
tpl.innerHTML=new TextDecoder().decode(pt);
$('o').replaceChildren(tpl.content);
$('f').hidden=true;
}catch{$('e').hidden=false}
});
})()`

const subtle = () => {
  const s = globalThis.crypto?.subtle
  if (!s) throw new Error('WebCrypto is not available (secure context required)')
  return s
}
const b64 = (bytes: Uint8Array) => btoa(Array.from(bytes, (x) => String.fromCharCode(x)).join(''))
const enc = (s: string) => new TextEncoder().encode(s)
const sha256 = async (s: string) => `sha256-${b64(new Uint8Array(await subtle().digest('SHA-256', enc(s))))}`

/**
 * The report encrypted with a passphrase (AES-256-GCM, key from PBKDF2) inside a self-contained HTML file.
 * The file asks for the passphrase and decrypts offline; its CSP meta allows only its own script and style by hash.
 */
export async function toEncryptedReportHtml(r: Report, t: ReportLabels, passphrase: string, iterations = ITERATIONS): Promise<string> {
  if (!passphrase) throw new Error('A passphrase is required')
  const webcrypto = subtle()
  const html = toReportHtml(r, t)
  const body = html.slice(html.indexOf('<body>') + 6, html.lastIndexOf('</body>'))
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(16))
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12))
  const base = await webcrypto.importKey('raw', enc(passphrase), 'PBKDF2', false, ['deriveKey'])
  const key = await webcrypto.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt'])
  const ct = new Uint8Array(await webcrypto.encrypt({ name: 'AES-GCM', iv }, key, enc(body)))
  const payload = JSON.stringify({ s: b64(salt), v: b64(iv), c: b64(ct), i: iterations })
  const csp = `default-src 'none'; script-src '${await sha256(DECRYPT_SCRIPT)}'; style-src '${await sha256(STYLE)}'`
  const e = escapeHtml
  return [
    `<!doctype html><html lang="${e(t('report.lang'))}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">`,
    `<meta http-equiv="Content-Security-Policy" content="${e(csp)}">`,
    `<title>${e(t('report.title'))} - ${e(t('report.encrypted'))}</title><style>${STYLE}</style></head><body>`,
    `<div id="o"><form id="f"><h1>${e(t('report.encrypted'))}</h1><label for="w">${e(t('report.passphrase'))}</label>`,
    `<input id="w" type="password" autocomplete="off" required><button type="submit">${e(t('report.unlock'))}</button>`,
    `<p id="e" class="err" role="alert" hidden>${e(t('report.wrongPassphrase'))}</p></form></div>`,
    `<script type="application/json" id="p">${payload}</script><script>${DECRYPT_SCRIPT}</script></body></html>`,
  ].join('\n')
}
