"""Ilustración del conjunto residencial, en línea de un solo color.

Sigue el prompt de marca (evetev_brand_styles.md §4): una sola tinta
#1E6FEB sobre blanco, solo formas generales, sin textos, y trazos separados
—nada por debajo de SEPARACION_MINIMA, porque al reducir dos líneas juntas
se funden en una mancha gris.
"""
import sys, pathlib, math, re

W, H = 1344, 768
AZUL = "#1E6FEB"
SEPARACION_MINIMA = 24
SUELO = 604
PX, PY = 52, -30      # una sola dirección de fuga para toda la escena

p = []
def linea(x1, y1, x2, y2, w=2.0):
    p.append(f'<line x1="{x1:.0f}" y1="{y1:.0f}" x2="{x2:.0f}" y2="{y2:.0f}" stroke-width="{w}"/>')
def ruta(d, w=2.0, relleno="#fff"):
    p.append(f'<path d="{d}" fill="{relleno}" stroke-width="{w}"/>')

def caja(x, y, an, al, w=2.0):
    """Prisma axonométrico. Caras con relleno blanco a propósito: un wireframe
    transparente cruzaría las líneas de un volumen con las del de atrás, y a
    tamaño de landing eso es exactamente la mancha que hay que evitar."""
    ruta(f"M{x},{y} l{PX},{PY} h{an} l{-PX},{-PY} Z", w)          # tapa
    ruta(f"M{x+an},{y} l{PX},{PY} v{al} l{-PX},{-PY} Z", w)       # costado
    ruta(f"M{x},{y} h{an} v{al} h{-an} Z", w)                     # frente (encima)

def ventanas(x, y, an, al, paso_x=52, paso_y=58, ancho=26, alto=30, margen=28,
             hasta_y=None):
    """`hasta_y` corta la rejilla donde empieza un volumen de primer plano.
    Dibujar ventanas detrás del parqueadero no las hace visibles: las deja
    rozando sus columnas a 4 unidades, que al reducir es una sola mancha."""
    tope = y + al - margen if hasta_y is None else min(y + al - margen, hasta_y)
    cx = x + margen
    while cx + ancho <= x + an - margen + 1:
        cy = y + margen + 16
        while cy + alto <= tope:
            p.append(f'<rect x="{cx:.0f}" y="{cy:.0f}" width="{ancho}" height="{alto}" '
                     f'fill="none" stroke-width="1.6"/>')
            cy += paso_y
        cx += paso_x

def forjados(x, y, an, al, paso=76):
    """El costado solo insinúa los pisos. Repetir ahí la rejilla la comprimiría
    la perspectiva hasta juntar los trazos."""
    cy = y + 52
    while cy < y + al - 30:
        linea(x + an, cy, x + an + PX, cy + PY, 1.3)
        cy += paso

# ── Fondo: dos cerros, sin nervios interiores ───────────────────────────────
for (cx, rx, ry) in ((330, 300, 118), (1010, 330, 132)):
    ruta(f"M{cx-rx},{SUELO} Q{cx},{SUELO-ry*2.1} {cx+rx},{SUELO}", 1.5, "none")

# ── Torres ─────────────────────────────────────────────────────────────────
PARQUE_Y = 428          # cota superior del parqueadero
PORTERIA_Y = 466        # cota superior de la portería
for (x, y, an, al, tope) in ((104, 214, 200, 390, None),
                             (470, 162, 186, 442, PORTERIA_Y),
                             (902, 198, 208, 406, PARQUE_Y)):
    caja(x, y, an, al)
    ventanas(x, y, an, al, hasta_y=tope)
    forjados(x, y, an, al)

# ── Parqueadero cubierto, primer plano derecha ─────────────────────────────
# Tres losas con relleno blanco: tapan la torre de atrás en vez de cruzarla.
# Columnas SOLO en el plano frontal; las del fondo hacían equis con todo.
qx, qy, qan, grosor = 716, PARQUE_Y, 340, 16
for i in range(3):
    yy = qy + i * 74
    ruta(f"M{qx},{yy} l{PX},{PY} h{qan} l{-PX},{-PY} Z", 1.6)          # tapa de losa
    ruta(f"M{qx},{yy} h{qan} v{grosor} h{-qan} Z", 1.8)                # canto
# Las columnas no se reparten a partes iguales: la central caía a 16 u del
# canto de la torre de detrás, y dos verticales a esa distancia se leen como
# una sola linea gruesa. Se corre hacia la izquierda.
for cx in (qx + 30, qx + 158, qx + qan - 30):
    linea(cx, qy + grosor, cx, qy + 2 * 74 + grosor, 1.6)

# ── Portería, primer plano centro ──────────────────────────────────────────
gx, gy, gan, gal = 330, PORTERIA_Y, 262, 78
caja(gx, gy, gan, gal, w=2.2)
for cx in (gx + 30, gx + gan - 30):
    linea(cx, gy + gal, cx, SUELO + 44, 2.0)

# ── Suelo ──────────────────────────────────────────────────────────────────
linea(0, SUELO + 44, W, SUELO + 44, 2.0)
linea(190, SUELO + 100, W, SUELO + 100, 1.3)

svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" role="img">
<rect width="{W}" height="{H}" fill="#fff"/>
<g stroke="{AZUL}" fill="none" stroke-linejoin="round" stroke-linecap="round">
{chr(10).join(p)}
</g>
</svg>
'''
# ── La regla de separación, comprobada en código ───────────────────────────
# Escrita aquí y no en un comentario porque un comentario no falla.
def _segmentos(texto):
    h, v = [], []
    for m in re.finditer(r'<line x1="(-?\d+)" y1="(-?\d+)" x2="(-?\d+)" y2="(-?\d+)"', texto):
        x1, y1, x2, y2 = map(int, m.groups())
        (h if y1 == y2 else v if x1 == x2 else []).append(
            (y1, min(x1, x2), max(x1, x2)) if y1 == y2 else (x1, min(y1, y2), max(y1, y2)))
    for m in re.finditer(r'<rect x="(-?\d+)" y="(-?\d+)" width="(\d+)" height="(\d+)"', texto):
        x, y, w, hh = map(int, m.groups())
        h += [(y, x, x + w), (y + hh, x, x + w)]
        v += [(x, y, y + hh), (x + w, y, y + hh)]
    for m in re.finditer(r'<path d="M(-?\d+),(-?\d+) h(-?\d+) v(-?\d+)', texto):
        x, y, w, hh = map(int, m.groups())
        h += [(y, min(x, x + w), max(x, x + w))]
        v += [(x, y, y + hh), (x + w, y, y + hh)]
    return h, v

def _peor(segs):
    d = 10 ** 9
    for i, (a, s1, e1) in enumerate(segs):
        for (b, s2, e2) in segs[i + 1:]:
            if a != b and min(e1, e2) - max(s1, s2) > 12:
                d = min(d, abs(a - b))
    return d

hh, vv = _segmentos(svg)
peor_h, peor_v = _peor(hh), _peor(vv)
peor = min(peor_h, peor_v)
if peor < SEPARACION_MINIMA:
    raise SystemExit(
        f"Trazos demasiado juntos: {peor} u (mínimo {SEPARACION_MINIMA}). "
        f"Horizontales {peor_h} u, verticales {peor_v} u. "
        "A tamaño de landing eso se ve como una linea gruesa.")

pathlib.Path(sys.argv[1]).write_text(svg)
print(f"{len(p)} trazos, {len(svg)/1024:.1f} KB")
print(f"separación mínima: {peor} u  →  {peor*375/W:.1f} px a 375 de ancho")
