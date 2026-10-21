// Renderiza las 10 láminas a PNG + JPEG (1080x1350) y genera un contact sheet.
// Uso: node render.mjs   (requiere playwright)
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, 'export');
const SLUG = 'licencia-y-ahora-que';
mkdirSync(join(out, 'png'), { recursive: true });
mkdirSync(join(out, 'jpg'), { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 1500 }, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(join(here, 'slides.html')).href, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);

// QC: todo texto dentro del área segura y sin overflow
const issues = await page.evaluate(() => {
  const res = [];
  for (const s of document.querySelectorAll('.slide')) {
    const sr = s.getBoundingClientRect();
    const c = s.querySelector('.content');
    if (c.scrollHeight > c.clientHeight + 1) res.push(`${s.id}: content overflow ${c.scrollHeight - c.clientHeight}px`);
    const safe = { l: sr.left + 90, r: sr.right - 90, t: sr.top + 120, b: sr.bottom - 140 };
    for (const el of c.querySelectorAll('*')) {
      const r = el.getBoundingClientRect();
      if (!r.width) continue;
      if (r.left < safe.l - 1 || r.right > safe.r + 1 || r.top < safe.t - 1 || r.bottom > safe.b + 1)
        res.push(`${s.id}: <${el.tagName.toLowerCase()} class="${el.className}"> fuera del safe area`);
    }
    if (!document.fonts.check('900 40px "Playfair Display"')) res.push('Playfair Display no cargó');
  }
  return [...new Set(res)];
});

const ids = await page.$$eval('.slide', els => els.map(e => e.id));
for (const [i, id] of ids.entries()) {
  const el = await page.$('#' + id);
  const n = String(i + 1).padStart(2, '0');
  await el.screenshot({ path: join(out, 'png', `${SLUG}-${n}.png`), type: 'png' });
  await el.screenshot({ path: join(out, 'jpg', `${SLUG}-${n}.jpg`), type: 'jpeg', quality: 95 });
}

// Contact sheet 5x2
const thumbs = ids.map((_, i) => `png/${SLUG}-${String(i + 1).padStart(2, '0')}.png`);
await page.setContent(`<html><body style="margin:0;background:#0d0d10;padding:40px;display:grid;grid-template-columns:repeat(5,360px);gap:24px;font:600 18px Inter,sans-serif;color:#d5b875">
${thumbs.map((t, i) => `<div><img src="${pathToFileURL(join(out, t)).href}" style="width:360px;height:450px;display:block;border-radius:6px"><div style="margin-top:8px">${String(i + 1).padStart(2, '0')}</div></div>`).join('')}
</body></html>`, { waitUntil: 'load' });
await page.setViewportSize({ width: 5 * 360 + 4 * 24 + 80, height: 2 * 480 + 24 + 80 });
await page.screenshot({ path: join(out, `${SLUG}-contact-sheet.png`), fullPage: true });

await browser.close();
console.log(issues.length ? 'QC ISSUES:\n' + issues.join('\n') : 'QC OK: sin overflow ni texto fuera del safe area');
