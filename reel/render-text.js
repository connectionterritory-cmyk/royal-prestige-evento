// Dibuja cada frase (y el aviso legal) como PNG transparente de 1080x1920
// usando Chromium. ffmpeg luego los pone encima del video con la animación.
// Uso: node reel/render-text.js <config.json> <logo.svg|""> <carpetaSalida>
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const [, , configPath, logoPath, outDir] = process.argv;
const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
fs.mkdirSync(outDir, { recursive: true });

const W = 1080, H = 1920, SAFE = 250;
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// "[...]" marca las cifras que van en dorado
const markup = t => esc(t).replace(/\[([^\]]+)\]/g, '<span class="gold">$1</span>').replace(/~/g, '&nbsp;');

// El logo se inserta tal cual (archivo SVG original), solo escalado.
const logoTag = logoPath
  ? `<img class="logo" src="data:image/svg+xml;base64,${fs.readFileSync(logoPath).toString('base64')}">`
  : `<div class="logo placeholder">LOGO IZZY<br><small>(pendiente: falta el SVG oficial)</small></div>`;

const css = `
  html,body{margin:0;width:${W}px;height:${H}px;background:transparent;overflow:hidden}
  body{font-family:'Inter','Noto Color Emoji',sans-serif;color:#fff}
  .stage{position:absolute;left:90px;right:90px;top:${SAFE}px;bottom:${SAFE + 200}px;
    display:flex;flex-direction:column;align-items:center;justify-content:center;gap:70px}
  .txt{font-weight:900;text-transform:uppercase;text-align:center;line-height:1.12;
    letter-spacing:-0.5px;
    text-shadow:0 3px 3px rgba(0,0,0,.85),0 8px 26px rgba(0,0,0,.75),0 0 2px rgba(0,0,0,.9)}
  .gold{color:${cfg.colores.dorado};font-size:1.22em}
  .emoji{font-family:'Noto Color Emoji'}
  .logo{max-width:560px;max-height:300px;filter:drop-shadow(0 6px 18px rgba(0,0,0,.6))}
  .placeholder{width:520px;height:220px;border:6px dashed #fff;border-radius:24px;display:flex;
    flex-direction:column;align-items:center;justify-content:center;font-weight:800;font-size:44px;
    text-align:center;background:rgba(255,255,255,.08)}
  .placeholder small{font-size:24px;font-weight:500}
  .legal{position:absolute;left:80px;right:80px;bottom:${SAFE}px;text-align:center;
    font-size:29px;line-height:1.35;font-weight:500;color:rgba(255,255,255,.8);
    text-shadow:0 1px 3px rgba(0,0,0,.9),0 2px 10px rgba(0,0,0,.6)}
`;

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  const shot = async (body, file) => {
    await page.setContent(`<html><head><style>${css}</style></head><body>${body}</body></html>`);
    await page.evaluate(() => document.fonts.ready);
    // Ajusta el tamaño de letra para que cada frase quepa en 4 líneas máx.
    await page.evaluate(() => {
      const el = document.querySelector('.txt');
      if (!el) return;
      let size = 112;
      el.style.fontSize = size + 'px';
      const maxH = size * 1.2 * 4.3;
      while ((el.scrollWidth > el.clientWidth + 1 || el.getBoundingClientRect().height > maxH) && size > 60) {
        size -= 2; el.style.fontSize = size + 'px';
      }
    });
    await page.screenshot({ path: path.join(outDir, file), omitBackground: true });
  };

  for (const [i, f] of cfg.frases.entries()) {
    const txt = markup(f.texto).replace(/⬇️/g, '<span class="emoji">⬇️</span>');
    await shot(`<div class="stage"><div class="txt">${txt}</div>${f.logo ? logoTag : ''}</div>`, `frase${i + 1}.png`);
  }
  await shot(`<div class="legal">${esc(cfg.avisoLegal)}</div>`, 'aviso.png');
  await browser.close();
  console.log('Textos listos en', outDir);
})();
