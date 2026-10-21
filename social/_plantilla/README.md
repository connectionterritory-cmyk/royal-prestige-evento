# Plantilla de carruseles — Caicedo Network / IZZY

## Crear un carrusel nuevo
1. Copia esta carpeta: `cp -r social/_plantilla social/carrusel-<tema>`
2. Edita `slides.html`: cambia los textos, duplica o borra láminas (tipos A–E).
   - Actualiza el número `NN / total` del encabezado y el punto activo (`.dots`).
   - Alterna láminas `light` (fondo marfil) para dar ritmo.
3. Exporta: `node social/render.mjs social/carrusel-<tema>` (agrega `--pdf` para LinkedIn).
   - Sale en `export/png`, `export/jpg`, contact sheet y PDF.
   - El comando avisa si algún texto se desborda o sale del área segura.
4. Revisa el contact sheet antes de publicar.

## Historias 9:16
Agrega la clase `story` a cada `<section class="slide">`. Ejemplo: `social/historias-licencia-y-ahora-que/`.

## Marca
- Estilos compartidos: `social/_marca/marca.css` (paleta, tipografías, componentes).
- Logos sin fondo: `social/_marca/assets/` (caicedo-shield, caicedo-logo, izzy-shield).
- Dorado `#d8ad52` · Azul marino `#021a42` · Marfil `#f7f3ea` · Playfair Display + Inter.

## Reglas de contenido
Una idea por lámina · texto grande · sin promesas de ingresos ni resultados garantizados ·
sin mencionar ni atacar compañías, IMO/FMO o modelos de distribución.
