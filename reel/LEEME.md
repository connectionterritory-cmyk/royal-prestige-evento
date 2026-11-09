# Reel "Retiro vs. Anualidad" – IZZY Financial & Business Services

## Qué necesitas poner
1. **Video de fondo** → `assets/video/` (cualquier .mp4 o .mov; se usa el primero en orden alfabético).
2. **Logos del cierre** → `assets/logos/izzy-escudo.png` y `assets/logos/caicedo-network.png` (ya están). No se modifican: solo se escalan y se muestran lado a lado como tarjetas.
3. **Colores** → `reel/config.json`: azul #0A1F44 y dorado #B8914A (tomados del logo IZZY).

## Cómo generar el video
```bash
node reel/build.js
```
Salida en `output/`:
- `reel-retiro-anualidad.mp4` (o `BORRADOR-…` si falta el video o el logo)
- `…-primer-cuadro.png` y `…-ultimo-cuadro.png` para revisión

## Cambiar textos o tiempos
Todo está en `reel/config.json`:
- `[ ]` = cifra en dorado
- `~` = une dos palabras para que no queden separadas en líneas distintas
- `inicio` / `fin` = segundos en que aparece y desaparece cada frase
