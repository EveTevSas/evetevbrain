"""Ilustración del conjunto residencial, en línea sobre blanco.

Sigue el prompt de marca (evetev_brand_styles.md §4): tinta #1E6FEB, solo
formas generales, sin textos, y trazos separados —nada por debajo de
SEPARACION_MINIMA, porque al reducir dos líneas juntas se funden en una
mancha gris.

Y la regla del color: **exactamente dos elementos** llevan relleno, la torre
izquierda en #144A96 y el árbol de la derecha en #16A34A. Ambos van a los
lados a propósito. Esta ilustración se usa de fondo en la portada de la
landing de EveConecta, que le abre un hueco radial en el centro para que las
líneas no crucen el titular; cualquier color puesto en el centro cae dentro
de ese hueco y no se ve. Se comprobó en el navegador con una versión que
tenía la torre y el árbol al medio: no aparecían ni subiendo la opacidad.

Uso:
    python3 conjunto-residencial.py salida.svg                        → con color y halo
    python3 conjunto-residencial.py salida.svg --sin-color --sin-glow → como se publicó en v1.5.0

Las dos variantes están publicadas y salen de aquí, para que no se separen:
si mañana se mueve una torre, se regeneran las dos con el mismo comando.

`--sin-glow` existe para poder reproducir `conjunto-residencial.svg` **byte a
byte** tal como está publicado. Esa comprobación es la que demuestra que un
cambio nuevo no movió la escena, y se perdería si el halo entrara también ahí.
"""
import sys, pathlib, math, re

CON_COLOR = "--sin-color" not in sys.argv[2:]
CON_GLOW = "--sin-glow" not in sys.argv[2:]

W, H = 1344, 768
AZUL = "#1E6FEB"
AZUL_MASA = "#144A96"   # --eve-mezclado: relleno, no trazo (han de distinguirse)
VERDE = "#16A34A"       # --eve-exito
VERDE_FONDO = "#0F7A37" # facetas del árbol, para que la copa no sea un disco
SEPARACION_MINIMA = 24
SUELO = 604
PX, PY = 52, -30      # una sola dirección de fuga para toda la escena

p = []
def linea(x1, y1, x2, y2, w=2.0, trazo=None):
    extra = f' stroke="{trazo}"' if trazo else ""
    p.append(f'<line x1="{x1:.0f}" y1="{y1:.0f}" x2="{x2:.0f}" y2="{y2:.0f}" '
             f'stroke-width="{w}"{extra}/>')
def ruta(d, w=2.0, relleno="#fff", trazo=None):
    extra = f' stroke="{trazo}"' if trazo else ""
    p.append(f'<path d="{d}" fill="{relleno}" stroke-width="{w}"{extra}/>')

def caja(x, y, an, al, w=2.0, relleno="#fff"):
    """Prisma axonométrico. Caras con relleno a propósito: un wireframe
    transparente cruzaría las líneas de un volumen con las del de atrás, y a
    tamaño de landing eso es exactamente la mancha que hay que evitar.
    Por defecto blanco; la torre con color pasa aquí su #144A96."""
    ruta(f"M{x},{y} l{PX},{PY} h{an} l{-PX},{-PY} Z", w, relleno)          # tapa
    ruta(f"M{x+an},{y} l{PX},{PY} v{al} l{-PX},{-PY} Z", w, relleno)       # costado
    ruta(f"M{x},{y} h{an} v{al} h{-an} Z", w, relleno)                     # frente (encima)

def ventanas(x, y, an, al, paso_x=52, paso_y=58, ancho=26, alto=30, margen=28,
             hasta_y=None, relleno="none", trazo=None):
    """`hasta_y` corta la rejilla donde empieza un volumen de primer plano.
    Dibujar ventanas detrás del parqueadero no las hace visibles: las deja
    rozando sus columnas a 4 unidades, que al reducir es una sola mancha."""
    tope = y + al - margen if hasta_y is None else min(y + al - margen, hasta_y)
    cx = x + margen
    while cx + ancho <= x + an - margen + 1:
        cy = y + margen + 16
        while cy + alto <= tope:
            extra = f' stroke="{trazo}"' if trazo else ""
            p.append(f'<rect x="{cx:.0f}" y="{cy:.0f}" width="{ancho}" height="{alto}" '
                     f'fill="{relleno}" stroke-width="1.6"{extra}/>')
            cy += paso_y
        cx += paso_x

def forjados(x, y, an, al, paso=76, trazo=None):
    """El costado solo insinúa los pisos. Repetir ahí la rejilla la comprimiría
    la perspectiva hasta juntar los trazos."""
    cy = y + 52
    while cy < y + al - 30:
        linea(x + an, cy, x + an + PX, cy + PY, 1.3, trazo)
        cy += paso

def arbol(cx, base, r, lados=9):
    """Copa facetada, no un círculo: el estilo es poliédrico y un disco liso
    se leería como una mancha ajena a la escena. Las facetas van en un verde
    más oscuro —no en #1E6FEB— porque una retícula azul sobre verde vibra."""
    # La copa se centra a 1.55r del suelo, no a r: así su borde inferior queda
    # a 0.6r de la base y deja tronco. Centrada a r la copa se apoyaba en el
    # suelo y el árbol parecía un arbusto.
    cy = base - 1.55 * r
    pts = []
    for i in range(lados):
        a = -math.pi / 2 + 2 * math.pi * i / lados
        pts.append((cx + r * math.cos(a) * 1.02, cy - r * math.sin(a) * 0.94))
    d = "M" + " L".join(f"{x:.0f},{y:.0f}" for x, y in pts) + " Z"
    ruta(d, 2.0, VERDE, VERDE_FONDO)
    # Radios desde el centro: dan volumen sin añadir contorno nuevo.
    for i in range(0, lados, 2):
        linea(cx, cy, pts[i][0], pts[i][1], 1.4, VERDE_FONDO)
    linea(cx, cy + r * 0.7, cx, base, 3.0, VERDE)

# ── Fondo: dos cerros, sin nervios interiores ───────────────────────────────
for (cx, rx, ry) in ((330, 300, 118), (1010, 330, 132)):
    ruta(f"M{cx-rx},{SUELO} Q{cx},{SUELO-ry*2.1} {cx+rx},{SUELO}", 1.5, "none")

# ── Torres ─────────────────────────────────────────────────────────────────
PARQUE_Y = 428          # cota superior del parqueadero
PORTERIA_Y = 466        # cota superior de la portería
# La primera es la torre con color. Va la de la izquierda y no la del centro,
# que es la más alta y la que pediría el ojo: la del centro cae en el hueco
# que la portada le abre al dibujo (ver cabecera).
for (x, y, an, al, tope, color) in ((104, 214, 200, 390, None,
                                     AZUL_MASA if CON_COLOR else "#fff"),
                                    (470, 162, 186, 442, PORTERIA_Y, "#fff"),
                                    (902, 198, 208, 406, PARQUE_Y, "#fff")):
    con_color = color != "#fff"
    caja(x, y, an, al, relleno=color)
    # Sobre el relleno oscuro las ventanas se dibujan en blanco: un contorno
    # #1E6FEB sobre #144A96 no tiene contraste y la fachada queda ciega.
    ventanas(x, y, an, al, hasta_y=tope,
             relleno="#fff" if con_color else "none",
             trazo="#fff" if con_color else None)
    forjados(x, y, an, al, trazo="#fff" if con_color else None)

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

# ── Árbol, extremo derecho ─────────────────────────────────────────────────
# El segundo elemento con color. A 1205 queda pasado el costado de la torre
# derecha (acaba en 1162) y bien fuera del hueco central de la portada, pero
# con 70 u de aire hasta el borde del lienzo: pegado al canto se leía como un
# recorte y no como parte de la escena.
if CON_COLOR:
    arbol(1205, SUELO + 44, 66)

# ── Suelo ──────────────────────────────────────────────────────────────────
linea(0, SUELO + 44, W, SUELO + 44, 2.0)
linea(190, SUELO + 100, W, SUELO + 100, 1.3)

trazos = chr(10).join(p)

# El SVG de una capa. Es el que se somete a la regla de separación: el halo no
# es un trazo y contarlo como tal daría falsos positivos.
svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" role="img">
<rect width="{W}" height="{H}" fill="#fff"/>
<g stroke="{AZUL}" fill="none" stroke-linejoin="round" stroke-linecap="round">
{trazos}
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

# ── El halo ────────────────────────────────────────────────────────────────
# El prompt de marca pide «glow controlado» (§4). En un raster el modelo lo
# resuelve solo; en SVG hay que dibujarlo, y son dos capas: la escena
# desenfocada debajo y la escena nítida encima.
#
# La capa de abajo va SIN rellenos —se le quitan con la sustitución de aquí— y
# por dos razones. Una, el halo tiene que salir de las líneas, que es lo que
# pide el prompt; desenfocar además las caras blancas de los prismas produce una
# nube gris alrededor de cada volumen, no un halo. Y dos, esas caras blancas
# desenfocadas taparían el halo de los trazos que tienen detrás.
#
# stdDeviation 5 sobre un lienzo de 1344, elegido mirando: a 2,2 el halo no se
# ve —el dibujo se muestra a menos de la mitad de su tamaño y el desenfoque se
# encoge con él— y a 7 se mete dentro de las caras blancas y el conjunto pierde
# el filo de plano. Si algún día cambia el ancho del lienzo, este número hay que
# volver a mirarlo: es relativo al viewBox, no a los píxeles de la pantalla.
glow = re.sub(r' fill="[^"]*"', '', trazos)

svg_final = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" role="img">
<defs><filter id="halo" x="-4%" y="-4%" width="108%" height="108%">
<feGaussianBlur stdDeviation="5"/></filter></defs>
<rect width="{W}" height="{H}" fill="#fff"/>
<g stroke="{AZUL}" fill="none" stroke-linejoin="round" stroke-linecap="round"
   filter="url(#halo)" opacity=".75">
{glow}
</g>
<g stroke="{AZUL}" fill="none" stroke-linejoin="round" stroke-linecap="round">
{trazos}
</g>
</svg>
''' if CON_GLOW else svg

pathlib.Path(sys.argv[1]).write_text(svg_final)
print(f"{len(p)} trazos, {len(svg_final)/1024:.1f} KB"
      f"{'' if CON_GLOW else ', sin halo'}")
print(f"separación mínima: {peor} u  →  {peor*375/W:.1f} px a 375 de ancho")
