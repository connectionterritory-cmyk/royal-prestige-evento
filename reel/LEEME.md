# Reel "Retiro vs. Anualidad" – IZZY Financial & Business Services

## Qué necesitas poner
1. **Video de fondo** → `assets/video/` (cualquier .mp4 o .mov; se usa el primero en orden alfabético).
2. **Logo oficial IZZY (Brand V1)** → `assets/izzy-logo-master.svg` o `brand/izzy/v1/`. No se modifica: solo se escala.
3. **Colores del brand kit** → edita `reel/config.json` (`azulMarino` y `dorado`).

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
