// Arma el reel completo con ffmpeg.
// Uso:  node reel/build.js
// Busca el video en assets/video/ y el logo en brand/izzy/v1/ o assets/izzy-logo-master.svg.
// Si falta el video o el logo, genera un BORRADOR con fondo y logo de reemplazo.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'));
const W = 1080, H = 1920, FPS = 30, T = cfg.duracionTotal;
const RISE = 40;            // px que sube el texto al aparecer
const FADE_IN = 0.5, FADE_OUT = 0.4, RISE_T = 0.6;

// --- Buscar archivos ---------------------------------------------------------
const videoDir = path.join(ROOT, 'assets/video');
const videos = fs.existsSync(videoDir)
  ? fs.readdirSync(videoDir).filter(f => /\.(mp4|mov|m4v|webm|mkv)$/i.test(f)).sort() : [];
const video = videos.length ? path.join(videoDir, videos[0]) : null;

// Logos del cierre, en orden (IZZY primero). Se usan tal cual, sin modificar.
const logoFiles = ['assets/logos/izzy-escudo.png', 'assets/logos/caicedo-network.png'].map(f => path.join(ROOT, f));
const logos = logoFiles.filter(f => fs.existsSync(f));
const logo = logos.length ? logos.join(',') : null;
const draft = !video || !logo;  // borrador si falta el video o los logos

console.log('Video de fondo :', video ? path.relative(ROOT, video) : 'NO ENCONTRADO (uso fondo de reemplazo)');
console.log('Logos         :', logos.length ? logos.map(f => path.relative(ROOT, f)).join(' + ') : 'NO ENCONTRADOS (uso recuadro de reemplazo)');

// --- 1. Dibujar los textos -----------------------------------------------------
const tmp = path.join(ROOT, 'output/.tmp');
execFileSync('node', [path.join(__dirname, 'render-text.js'), path.join(__dirname, 'config.json'), logo || '', tmp], { stdio: 'inherit' });

// --- 2. Fondo (video en bucle suave o fondo de reemplazo) ----------------------
const args = ['-y', '-hide_banner', '-loglevel', 'error'];
const f = [];
const cover = `scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},fps=${FPS},format=yuv420p,setsar=1`;

if (video) {
  const dur = parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', video]).toString());
  args.push('-i', video);
  if (dur >= T) {
    f.push(`[0:v]${cover},trim=0:${T},setpts=PTS-STARTPTS[bg]`);
  } else {
    // Bucle suave: copias del clip unidas con un fundido cruzado de 1 s
    const X = Math.min(1, dur / 3);
    const n = Math.ceil((T - dur) / (dur - X)) + 1;
    console.log(`El clip dura ${dur.toFixed(1)} s: lo repito ${n} veces con fundido suave.`);
    f.push(`[0:v]${cover},trim=0:${dur - 0.05},setpts=PTS-STARTPTS,split=${n}${[...Array(n)].map((_, i) => `[c${i}]`).join('')}`);
    let prev = 'c0';
    for (let k = 1; k < n; k++) {
      const out = `x${k}`;
      f.push(`[${prev}][c${k}]xfade=transition=fade:duration=${X}:offset=${(k * (dur - 0.05 - X)).toFixed(3)}[${out}]`);
      prev = out;
    }
    f.push(`[${prev}]trim=0:${T},setpts=PTS-STARTPTS[bg]`);
  }
} else {
  args.push('-f', 'lavfi', '-i', `gradients=s=${W}x${H}:c0=0x2b4a7a:c1=0x0d1626:x0=0:y0=0:x1=${W}:y1=${H}:speed=0.01:d=${T}:r=${FPS}`);
  f.push(`[0:v]format=yuv420p,setsar=1[bg]`);
}

// --- 3. Capa azul marino ---------------------------------------------------------
args.push('-f', 'lavfi', '-i', `color=c=${cfg.colores.azulMarino.replace('#', '0x')}@${cfg.colores.opacidadCapa}:s=${W}x${H}:r=${FPS}:d=${T},format=rgba`);
f.push(`[bg][1:v]overlay=format=auto[v0]`);

// --- 4. Frases con fade in y leve subida ---------------------------------------
let last = 'v0', idx = 2;
cfg.frases.forEach((fr, i) => {
  const D = fr.fin - fr.inicio, S = fr.inicio;
  const isLast = i === cfg.frases.length - 1;
  args.push('-loop', '1', '-framerate', String(FPS), '-t', String(D), '-i', path.join(tmp, `frase${i + 1}.png`));
  // La primera frase se ve desde el cuadro 1 (sirve de portada); las demás hacen fade in.
  const fades = [
    i === 0 ? null : `fade=t=in:st=0:d=${FADE_IN}:alpha=1`,
    isLast ? null : `fade=t=out:st=${D - FADE_OUT}:d=${FADE_OUT}:alpha=1`,
  ].filter(Boolean).join(',');
  f.push(`[${idx}:v]format=rgba${fades ? ',' + fades : ''},setpts=PTS-STARTPTS+${S}/TB[p${i}]`);
  const y = `if(lt(t-${S}\\,${RISE_T})\\,${RISE}*pow(1-(t-${S})/${RISE_T}\\,2)\\,0)`;
  f.push(`[${last}][p${i}]overlay=x=0:y='${y}':eof_action=pass:format=auto[v${i + 1}]`);
  last = `v${i + 1}`; idx++;
});

// --- 5. Aviso legal durante todo el video --------------------------------------
args.push('-loop', '1', '-framerate', String(FPS), '-t', String(T), '-i', path.join(tmp, 'aviso.png'));
f.push(`[${last}][${idx}:v]overlay=format=auto,format=yuv420p[out]`);

// --- 6. Exportar ---------------------------------------------------------------------
const name = draft ? 'BORRADOR-reel-retiro-anualidad' : 'reel-retiro-anualidad';
const out = path.join(ROOT, 'output', `${name}.mp4`);
args.push('-filter_complex', f.join(';'), '-map', '[out]', '-an',
  '-c:v', 'libx264', '-profile:v', 'high', '-level', '4.1', '-preset', 'slow', '-crf', '18',
  '-pix_fmt', 'yuv420p', '-r', String(FPS), '-t', String(T), '-movflags', '+faststart', out);
console.log('Generando video…');
execFileSync('ffmpeg', args, { stdio: 'inherit' });

// --- 7. PNG del primer y último cuadro --------------------------------------------
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', out, '-frames:v', '1', path.join(ROOT, 'output', `${name}-primer-cuadro.png`)]);
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-sseof', '-0.1', '-i', out, '-frames:v', '1', '-update', '1', path.join(ROOT, 'output', `${name}-ultimo-cuadro.png`)]);
fs.rmSync(tmp, { recursive: true, force: true });
console.log('\nListo:', path.relative(ROOT, out));
if (draft) console.log('OJO: es un BORRADOR porque falta el video y/o el logo oficial.');
