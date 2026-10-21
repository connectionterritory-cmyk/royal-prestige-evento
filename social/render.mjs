// Exportador genérico de piezas sociales.
// Uso: node social/render.mjs <carpeta> [--pdf]
//   <carpeta>/slides.html con secciones .slide (1080x1350 o .story 1080x1920)
//   Genera <carpeta>/export/{png,jpg}, contact sheet y, con --pdf, un PDF vectorial.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const dir = resolve(process.argv[2] ?? '.');
const wantPdf = process.argv.includes('--pdf');
const slug = basename(dir).replace(/^(carrusel|historias)-/, '');
const out = join(dir, 'export');
mkdirSync(join(out, 'png'), { recursive: true });
mkdirSync(join(out, 'jpg'), { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 2100 }, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(join(dir, 'slides.html')).href, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);

// QC: sin overflow y todo el contenido dentro del área segura del formato
const { issues, w, h } = await page.evaluate(() => {
  const res = [];
  const slides = [...document.querySelectorAll('.slide')];
  for (const s of slides) {
    const sr = s.getBoundingClientRect();
    const story = s.classList.contains('story');
    const safe = { l: sr.left + 90, r: sr.right - 90, t: sr.top + (story ? 250 : 120), b: sr.bottom - (story ? 340 : 140) };
    const c = s.querySelector('.content');
    if (c.scrollHeight > c.clientHeight + 1) res.push(`${s.id}: content overflow ${c.scrollHeight - c.clientHeight}px`);
    // En 4:5 la interfaz no tapa el post: encabezado/pie solo deben respetar 60px del borde.
    const chrome = story ? safe : { l: sr.left + 60, r: sr.right - 60, t: sr.top + 60, b: sr.bottom - 60 };
    for (const el of s.querySelectorAll('.content *, .hdr *, .ftr *')) {
      const r = el.getBoundingClientRect();
      if (!r.width) continue;
      const box = el.closest('.content') ? safe : chrome;
      const hasText = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
      if (hasText && el.scrollWidth > el.clientWidth + 1 && el.clientWidth)
        res.push(`${s.id}: <${el.tagName.toLowerCase()} class="${el.className}"> texto desborda a lo ancho`);
      if (r.left < box.l - 1 || r.right > box.r + 1 || r.top < box.t - 1 || r.bottom > box.b + 1)
        res.push(`${s.id}: <${el.tagName.toLowerCase()} class="${el.className}"> fuera del área segura`);
    }
  }
  if (!document.fonts.check('900 40px "Playfair Display"')) res.push('Playfair Display no cargó');
  const r0 = slides[0].getBoundingClientRect();
  return { issues: [...new Set(res)], w: r0.width, h: r0.height };
});

const ids = await page.$$eval('.slide', els => els.map(e => e.id));
const name = i => `${slug}-${String(i + 1).padStart(2, '0')}`;
for (const [i, id] of ids.entries()) {
  const el = await page.$('#' + id);
  await el.screenshot({ path: join(out, 'png', `${name(i)}.png`), type: 'png' });
  await el.screenshot({ path: join(out, 'jpg', `${name(i)}.jpg`), type: 'jpeg', quality: 95 });
}

if (wantPdf) {
  await page.addStyleTag({ content: `@page{size:${w}px ${h}px;margin:0}body{display:block;padding:0;background:none}
    .slide{break-after:page;-webkit-print-color-adjust:exact;print-color-adjust:exact}` });
  await page.pdf({ path: join(out, `${slug}.pdf`), width: `${w}px`, height: `${h}px`, printBackground: true });
}

// Contact sheet (5 columnas)
const tw = 360, th = Math.round(tw * h / w), cols = Math.min(5, ids.length), rows = Math.ceil(ids.length / cols);
await page.setContent(`<html><body style="margin:0;background:#0d0d10;padding:40px;display:grid;grid-template-columns:repeat(${cols},${tw}px);gap:24px;font:600 18px Inter,sans-serif;color:#d8ad52">
${ids.map((_, i) => `<div><img src="${pathToFileURL(join(out, 'png', name(i) + '.png')).href}" style="width:${tw}px;height:${th}px;display:block;border-radius:6px"><div style="margin-top:8px">${String(i + 1).padStart(2, '0')}</div></div>`).join('')}
</body></html>`, { waitUntil: 'load' });
await page.setViewportSize({ width: cols * tw + (cols - 1) * 24 + 80, height: rows * (th + 30) + (rows - 1) * 24 + 80 });
await page.screenshot({ path: join(out, `${slug}-contact-sheet.png`), fullPage: true });

await browser.close();
console.log(`${ids.length} piezas ${w}x${h}${wantPdf ? ' + PDF' : ''} → ${out}`);
console.log(issues.length ? 'QC ISSUES:\n' + issues.join('\n') : 'QC OK: sin overflow ni contenido fuera del área segura');
