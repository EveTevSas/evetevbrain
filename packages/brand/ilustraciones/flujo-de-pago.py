"""Ilustración del flujo de pago, en línea sobre blanco.

La escena de producto de **EvePay**. Dibuja el argumento de la portada: el
dinero va de la tarjeta del cliente al datáfono del comercio y de ahí a la
cuenta del comercio, en línea recta y sin escalas.

**Por qué no es una calle de comercios.** El primer intento lo fue, y estaba
mal: se construyó copiando `conjunto-residencial.py` —prismas con rejilla de
ventanas— y esas rejillas ganan la lectura, así que la portada de una pasarela
de pagos acababa ilustrando ladrillo, que es el terreno de EveConecta. Las dos
escenas deben compartir **estilo**, no **tema**: mismo trazo, misma fuga, mismo
halo y la misma regla de color, pero cada una con su asunto. `comercio.svg`
sigue publicado —lo publicado no se retira— y marcado como superado.

**Lo que a propósito NO se dibuja** es la ausencia de la tesorería, que es la
mitad del argumento («sin pasar por nuestra tesorería»). Se probó a plantear un
desvío tachado hacia un cuarto nodo y no funciona: una equis sobre un nodo se
lee como un error del sistema, no como una virtud del diseño. La ausencia la
cuenta la línea recta; el texto de la portada la nombra.

Sigue el prompt de marca (evetev_brand_styles.md §4): tinta #1E6FEB, sin
textos, trazos separados por encima de SEPARACION_MINIMA, color en exactamente
dos elementos y en los extremos —el cuerpo de la tarjeta en #144A96 y la rueda
de la caja en #16A34A—, y halo tenue en dos capas.

Los tres nodos van en la mitad baja del lienzo por la misma razón por la que el
color va a los lados: la portada le abre al dibujo un hueco radial arriba y al
centro, para que las líneas no crucen el texto.

Uso:
    python3 flujo-de-pago.py salida.svg
    python3 flujo-de-pago.py salida.svg --sin-color --sin-glow
"""
import sys, pathlib, re

CON_COLOR = "--sin-color" not in sys.argv[2:]
CON_GLOW = "--sin-glow" not in sys.argv[2:]

W, H = 1344, 768
AZUL = "#1E6FEB"
AZUL_MASA = "#144A96"   # --eve-mezclado
VERDE = "#16A34A"       # --eve-exito
SEPARACION_MINIMA = 24
SUELO = 700
PX, PY = 52, -30        # misma dirección de fuga que las demás ilustraciones

p = []
def linea(x1, y1, x2, y2, w=2.0, trazo=None):
    extra = f' stroke="{trazo}"' if trazo else ""
    p.append(f'<line x1="{x1:.0f}" y1="{y1:.0f}" x2="{x2:.0f}" y2="{y2:.0f}" '
             f'stroke-width="{w}"{extra}/>')

def rect(x, y, an, al, w=1.8, relleno="none", trazo=None, r=0):
    extra = f' stroke="{trazo}"' if trazo else ""
    rr = f' rx="{r}"' if r else ""
    p.append(f'<rect x="{x:.0f}" y="{y:.0f}" width="{an:.0f}" height="{al:.0f}"'
             f'{rr} fill="{relleno}" stroke-width="{w}"{extra}/>')

def ruta(d, w=2.0, relleno="#fff", trazo=None):
    extra = f' stroke="{trazo}"' if trazo else ""
    p.append(f'<path d="{d}" fill="{relleno}" stroke-width="{w}"{extra}/>')

def circulo(cx, cy, r, w=2.0, relleno="none", trazo=None):
    extra = f' stroke="{trazo}"' if trazo else ""
    p.append(f'<circle cx="{cx:.0f}" cy="{cy:.0f}" r="{r:.0f}" '
             f'fill="{relleno}" stroke-width="{w}"{extra}/>')

def caja(x, y, an, al, w=2.0, relleno="#fff"):
    ruta(f"M{x},{y} l{PX},{PY} h{an} l{-PX},{-PY} Z", w, relleno)      # tapa
    ruta(f"M{x+an},{y} l{PX},{PY} v{al} l{-PX},{-PY} Z", w, relleno)   # costado
    ruta(f"M{x},{y} h{an} v{al} h{-an} Z", w, relleno)                 # frente

def flecha(x1, x2, y, w=2.2):
    """El sentido del dinero. La punta se dibuja con dos trazos y no con un
    marcador: un `marker` no hereda el desenfoque de la capa del halo y la
    punta se quedaría sin él, que es justo donde más se nota."""
    linea(x1, y, x2, y, w)
    linea(x2 - 22, y - 14, x2, y, w)
    linea(x2 - 22, y + 14, x2, y, w)

# ── 1. La tarjeta del cliente ──────────────────────────────────────────────
# Plana, sin prisma: una tarjeta no tiene volumen que enseñar, y darle uno la
# convertiría en una caja más. Es el primer elemento con color.
TARJ = (110, 400, 320, 200)
tx, ty, tan, tal = TARJ
rect(tx, ty, tan, tal, 2.2, AZUL_MASA if CON_COLOR else "#fff", r=18)
blanco = "#fff" if CON_COLOR else None
rect(148, 444, 56, 42, 1.8, "none", blanco, r=6)          # el chip
rect(148, 516, 244, 36, 1.8, "none", blanco)              # la banda

flecha(452, 528, 500)

# ── 2. El datáfono del comercio ────────────────────────────────────────────
DX, DY, DAN, DAL = 545, 300, 250, 400
caja(DX, DY, DAN, DAL)
rect(581, 340, 178, 120, 1.8)                              # pantalla
for cy in (490, 552, 614):                                 # teclado
    for cx in (577, 649, 721):
        rect(cx, cy, 42, 32, 1.6)

flecha(869, 940, 500)

# ── 3. La cuenta del comercio ──────────────────────────────────────────────
# Una caja fuerte, no la fachada de un banco: el banco dibujado como edificio
# nos devolvería al problema que esta ilustración viene a arreglar.
CX, CY, CAN, CAL = 950, 330, 280, 370
caja(CX, CY, CAN, CAL)
rect(996, 376, 188, 278, 2.0)                              # puerta
circulo(1090, 515, 52, 2.2, VERDE if CON_COLOR else "none")   # la rueda
# Los brazos de la rueda cruzan el disco enteros y van en un verde más oscuro.
# Dibujados en el mismo VERDE del relleno solo asomaban los extremos, y cuatro
# muñones sueltos alrededor de un círculo se leen como un defecto del trazo.
brazo = "#0F7A37" if CON_COLOR else None
for a, b in (((0, -74), (0, 74)), ((-74, 0), (74, 0))):
    linea(1090 + a[0], 515 + a[1], 1090 + b[0], 515 + b[1], 2.0, brazo)

# ── Suelo ──────────────────────────────────────────────────────────────────
linea(0, SUELO, W, SUELO, 2.0)
linea(160, SUELO + 48, W, SUELO + 48, 1.3)

trazos = chr(10).join(p)

svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" role="img">
<rect width="{W}" height="{H}" fill="#fff"/>
<g stroke="{AZUL}" fill="none" stroke-linejoin="round" stroke-linecap="round">
{trazos}
</g>
</svg>
'''

# ── La regla de separación, comprobada en código ───────────────────────────
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
# Dos capas, la de abajo sin rellenos. El porqué está en el README del repo de
# marca y en conjunto-residencial.py; en corto, desenfocar los rellenos da una
# nube gris alrededor de cada volumen en vez de un halo en las líneas.
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
