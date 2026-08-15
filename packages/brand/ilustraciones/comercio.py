"""Ilustración de la calle comercial, en línea sobre blanco.

La escena de producto de **EvePay**, la pasarela de pagos: cuatro locales con
su vitrina, su puerta y su toldo. El manual (§4) dice que estas ilustraciones
no representan a Evetev sino el contexto de un producto —«un conjunto
residencial para EveConecta, un comercio para EvePay»—, y esta es la segunda.

Sigue el mismo prompt de marca que `conjunto-residencial.py`, y por las mismas
razones, que están explicadas allí con más detalle:

- tinta #1E6FEB, solo formas generales, sin textos;
- nada por debajo de SEPARACION_MINIMA, porque al reducir dos líneas juntas se
  funden en una mancha gris;
- **exactamente dos elementos con color**, y a los lados: el toldo del local de
  la izquierda en #144A96 y el del extremo derecho en #16A34A. Van a los
  extremos porque la portada le abre al dibujo un hueco radial en el centro, y
  el color puesto al medio cae dentro del hueco y no se ve;
- halo tenue sobre las líneas («glow controlado»), en dos capas.

Que los dos elementos con color sean lo mismo —dos toldos— no es pereza: son
la pieza que un comercio pone para que lo reconozcan desde la calle, así que
teñir esas dos y nada más deja la lectura «locales» intacta.

Uso:
    python3 comercio.py salida.svg
    python3 comercio.py salida.svg --sin-color --sin-glow
"""
import sys, pathlib, re

CON_COLOR = "--sin-color" not in sys.argv[2:]
CON_GLOW = "--sin-glow" not in sys.argv[2:]

W, H = 1344, 768
AZUL = "#1E6FEB"
AZUL_MASA = "#144A96"   # --eve-mezclado
VERDE = "#16A34A"       # --eve-exito
SEPARACION_MINIMA = 24
SUELO = 604             # línea donde los locales se apoyan
ACERA = 648             # borde delantero del andén
PX, PY = 52, -30        # misma dirección de fuga que la otra ilustración

p = []
def linea(x1, y1, x2, y2, w=2.0, trazo=None):
    extra = f' stroke="{trazo}"' if trazo else ""
    p.append(f'<line x1="{x1:.0f}" y1="{y1:.0f}" x2="{x2:.0f}" y2="{y2:.0f}" '
             f'stroke-width="{w}"{extra}/>')

def ruta(d, w=2.0, relleno="#fff", trazo=None):
    extra = f' stroke="{trazo}"' if trazo else ""
    p.append(f'<path d="{d}" fill="{relleno}" stroke-width="{w}"{extra}/>')

def rect(x, y, an, al, w=1.8, relleno="none", trazo=None):
    extra = f' stroke="{trazo}"' if trazo else ""
    p.append(f'<rect x="{x:.0f}" y="{y:.0f}" width="{an:.0f}" height="{al:.0f}" '
             f'fill="{relleno}" stroke-width="{w}"{extra}/>')

def caja(x, y, an, al, w=2.0, relleno="#fff"):
    """Prisma axonométrico, con las caras rellenas para que el volumen de
    delante tape al de atrás en vez de cruzarlo."""
    ruta(f"M{x},{y} l{PX},{PY} h{an} l{-PX},{-PY} Z", w, relleno)      # tapa
    ruta(f"M{x+an},{y} l{PX},{PY} v{al} l{-PX},{-PY} Z", w, relleno)   # costado
    ruta(f"M{x},{y} h{an} v{al} h{-an} Z", w, relleno)                 # frente

# Cotas de la fachada, comunes a los cuatro locales. Están puestas de modo que
# ninguna pareja de horizontales quede por debajo de la separación mínima:
# toldo 466→508, vitrina 532→580, y de ahí al suelo 604. Los tres huecos son
# de 24 justos, que es el mínimo. Mover una sola de estas cifras hacia el
# centro rompe la comprobación del final; está para eso.
TOLDO_Y, TOLDO_AL = 466, 42
VITRINA_Y, VITRINA_AL = 532, 48
INSET = 26              # aire desde el canto de la fachada

def ventanas(x, y, an, hasta_y, paso_x=56, paso_y=58, ancho=28, alto=30, margen=INSET):
    """Los pisos de vivienda encima del local. Se cortan en `hasta_y` —24 por
    encima del toldo— porque una rejilla que llega hasta el toldo lo convierte
    en una raya más de la fachada en vez de en la pieza que se mira."""
    cx = x + margen
    while cx + ancho <= x + an - margen + 1:
        cy = y + 40
        while cy + alto <= hasta_y:
            rect(cx, cy, ancho, alto, 1.6)
            cy += paso_y
        cx += paso_x

def local(x, an, alto, color_toldo="#fff"):
    y = SUELO - alto
    caja(x, y, an, alto)
    ventanas(x, y, an, TOLDO_Y - 24)
    # Toldo: trapecio que sobresale hacia abajo. Es la pieza con color.
    a, b = x + 10, x + an - 10
    ruta(f"M{a},{TOLDO_Y} H{b} l{-14},{TOLDO_AL} h{-(b-a-28)} Z", 1.8, color_toldo)
    # Vitrina y puerta. La vitrina ocupa algo más de la mitad; la puerta baja
    # hasta el suelo, así que su canto inferior coincide con la base del local
    # y no cuenta como par de horizontales.
    vit_an = round((an - INSET * 2) * 0.56)
    rect(x + INSET, VITRINA_Y, vit_an, VITRINA_AL)
    puerta_x = x + INSET + vit_an + 30
    rect(puerta_x, VITRINA_Y, x + an - INSET - puerta_x, SUELO - VITRINA_Y)

# ── Los cuatro locales ─────────────────────────────────────────────────────
# Las separaciones entre ellos no son decorativas: el costado de cada caja se
# va 52 unidades a la derecha, así que entre el canto de uno y el frente del
# siguiente hay que dejar más de eso más el mínimo. Con estos anchos quedan 38.
LOCALES = ((80, 230, 380), (400, 200, 450), (690, 220, 330), (1000, 210, 410))
for i, (x, an, alto) in enumerate(LOCALES):
    if not CON_COLOR:
        color = "#fff"
    elif i == 0:
        color = AZUL_MASA
    elif i == len(LOCALES) - 1:
        color = VERDE
    else:
        color = "#fff"
    local(x, an, alto, color)

# ── Andén ──────────────────────────────────────────────────────────────────
linea(0, SUELO, W, SUELO, 1.5)
linea(0, ACERA, W, ACERA, 2.0)
linea(140, ACERA + 56, W, ACERA + 56, 1.3)

trazos = chr(10).join(p)

svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" role="img">
<rect width="{W}" height="{H}" fill="#fff"/>
<g stroke="{AZUL}" fill="none" stroke-linejoin="round" stroke-linecap="round">
{trazos}
</g>
</svg>
'''

# ── La regla de separación, comprobada en código ───────────────────────────
# Misma comprobación que en conjunto-residencial.py, y por el mismo motivo: un
# comentario que pide trazos separados no falla cuando alguien los junta.
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
# Dos capas: la escena desenfocada debajo, sin rellenos, y la nítida encima.
# Sin quitar los rellenos el desenfoque produce una nube gris alrededor de cada
# volumen en vez de un halo en las líneas, y además tapa el halo de lo que hay
# detrás. stdDeviation 5 es el valor que se eligió mirando en la otra
# ilustración, con el mismo ancho de lienzo.
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
