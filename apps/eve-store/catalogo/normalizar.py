#!/usr/bin/env python3
"""Convierte el reporte de Mercado Libre en el catálogo de Eve-Store.

    python3 apps/eve-store/catalogo/normalizar.py ~/Documents/Agente-Mercadolibre

Es una importación **de una sola vez**, no un sincronizador. La fuente de verdad
del catálogo pasa a ser `catalogo.json` en cuanto esto corra; el día que haya que
volver a leer Mercado Libre se hará contra su API, no contra un Excel exportado a
mano. Por eso el script se guarda —para que la derivación sea auditable y nadie
tenga que preguntarse de dónde salió un precio— y por eso no se automatiza.

Decisiones de normalización, todas con su motivo:

1. **Se agrupa por GTIN, no por el «# Item CSV» del origen.** El origen mete dos
   productos distintos bajo el ítem 19: un Serum Radiante de Botanikalia a
   $54.800 y un Serum Antiarrugas de Dermanat a $52.000, con GTIN distintos. Un
   agente que los viera fusionados no podría cruzar ninguno de los dos.

2. **Una publicación canónica por producto.** El origen trae 46 publicaciones
   para 25 productos, porque cada uno está publicado dos o más veces (una en
   catálogo de ML y otra no). Gana la publicación Activa con más ventas; si
   ninguna está activa, la de más ventas. Las demás quedan registradas en
   `origen.publicaciones_ml` para poder rastrear.

3. **Existencias sumadas entre publicaciones**, porque el stock está repartido.

4. **Marca normalizada.** El origen escribe «Bioesens» y «Bio Essens» para la
   misma marca, y «Demanat» es un error de tecleo de «Dermanat». Para un agente,
   dos grafías son dos marcas.

5. **El slug lleva la marca.** Sin ella, el Serum con Vitamina C de Botanikalia y
   el de Dermanat colisionan en la misma URL.

6. **Precio como cadena numérica sin formato** y moneda ISO aparte, que es lo que
   exige `schema.org/Offer`. `"52000"`, nunca `"$52.000"`.

7. **La descripción se deja en `null` a propósito.** La del origen viene cortada
   a 503 caracteres y doce de ellas contienen texto y enlaces de Mercado Libre.
   Ninguna es publicable. Rellenarlas aquí sería inventar: se marcan como
   pendientes y las escribe una persona.
"""

import collections
import csv
import io
import json
import re
import sys
from pathlib import Path

import openpyxl

MARCA = {
    "Bio Essens": "Bio Essens",
    "Bioesens": "Bio Essens",
    "Dermanat": "Dermanat",
    "Demanat": "Dermanat",  # error de tecleo en MCO1942228977
    "Botanikalia": "Botanikalia",
    "Ilovepinch": "Ilovepinch",
    "I Love Pinch": "Ilovepinch",  # así lo escribe el inventario físico
    "Allen Nutrition": "Allen Nutrition",
}

VACIO = {"N/A", "N/E", "Sin asignar", ""}

# Relleno de Mercado Libre que no puede viajar a nuestra tienda: promete la
# protección al comprador de ML y enlaza a su eshop. Publicarlo sería anunciar
# otro canal dentro de la nuestra.
# Relleno de Mercado Libre que no puede viajar a nuestra tienda: promete la
# protección al comprador de ML y enlaza a su eshop. Publicarlo sería anunciar
# otro canal dentro de la nuestra.
#
# Cada patrón lleva SUS PROPIAS banderas. Aplicar re.S a todos hacía que el
# `.*$` de las líneas sueltas cruzara los saltos y se comiera la descripción
# entera: «Marca: Dermanat» borraba los 479 caracteres siguientes.
RELLENO = [
    (r"COMPRANDO EN MERCADOLIBRE.*?PRODUCTO\.", re.S | re.I),
    (r"En nuestra eshop.*?casos\.", re.S | re.I),
    (r"https?://\S+", re.I),
    (r"^[ \t]*Marca:.*$", re.M | re.I),
    (r"^[ \t]*Origen:[ \t]*Colombia[ \t]*$", re.M | re.I),
]


def sin_relleno(t):
    for patron, banderas in RELLENO:
        t = re.sub(patron, "", t, flags=banderas)
    return re.sub(r"\n{3,}", "\n\n", t).strip()


def limpio(v):
    return "" if not v or str(v).strip() in VACIO else str(v).strip()


def slug(s):
    s = s.lower()
    for a, b in zip("áéíóúüñ", "aeiouun"):
        s = s.replace(a, b)
    return re.sub(r"-+", "-", re.sub(r"[^a-z0-9]+", "-", s)).strip("-")


def main(fuente, inventario=None):
    fuente = Path(fuente).expanduser()
    # Las descripciones las escribe una persona y viven aparte, en
    # descripciones.json. Este script las LEE y las mezcla; nunca las genera ni
    # las pisa. Si vivieran en catalogo.json, la siguiente ejecución borraría el
    # trabajo de redacción — que es la parte cara.
    escritas = {}
    ruta_desc = Path(__file__).parent / "descripciones.json"
    if ruta_desc.exists():
        escritas = json.load(io.open(ruta_desc, encoding="utf-8"))["descripciones"]
    # El inventario físico manda sobre el stock de Mercado Libre: las
    # publicaciones pausadas muestran cero y en la bodega sí hay unidades.
    fisico = {}
    if inventario:
        for r in csv.DictReader(io.open(Path(inventario).expanduser(), encoding="utf-8-sig")):
            if not limpio(r.get("Nombre del Producto")):
                continue
            m = MARCA.get(r["Proveedor"].strip(), r["Proveedor"].strip())
            c = limpio(r["Contenido"]).lower()
            fisico[(m, re.sub(r"\s+", " ", r["Nombre del Producto"].strip().lower()), c)] = int(
                r["Cantidad en Stock"] or 0
            )
    pubs = list(
        csv.DictReader(
            io.open(
                fuente / "reporte_mercadolibre_articulos_csv.csv", encoding="utf-8-sig"
            )
        )
    )
    hoja = openpyxl.load_workbook(
        fuente / "reporte_mercadolibre_articulos_csv.xlsx", read_only=True
    )["Ficha Técnica Atributos"]
    filas = list(hoja.iter_rows(values_only=True))
    cab = list(filas[0])
    attrs = {
        str(f[0]): {cab[i]: limpio(f[i]) for i in range(len(cab)) if cab[i]}
        for f in filas[1:]
    }

    grupos = collections.OrderedDict()
    for p in pubs:
        g = [c.strip() for c in p["Código Universal / GTIN"].split(",") if limpio(c)]
        grupos.setdefault(g[0] if g else f"sin-gtin-{p['ID Publicación ML']}", []).append(p)

    # Segunda pasada: dos GTIN pueden ser el mismo producto. La Espuma Limpiadora
    # de Dermanat aparece con 760412931223 —una publicación de 2024, sin stock— y
    # con 7709555831185 —tres publicaciones de 2026, con todas las existencias—.
    # Mismo nombre, misma marca y mismo precio: es un cambio de código de barras,
    # no dos productos. Se fusionan por (marca, nombre, contenido) y se conserva
    # el histórico de GTIN, que es lo que permite seguir cruzando el producto con
    # quien todavía lo tenga registrado con el código viejo.
    #
    # Esto NO fusiona los dos serums con vitamina C del ítem 19: sus marcas
    # difieren (Botanikalia y Dermanat), así que la clave no coincide.
    def identidad(lista):
        c = max(lista, key=lambda p: int(p["Unidades Vendidas ML"] or 0))
        vols = sorted(
            {limpio(attrs.get(p["ID Publicación ML"], {}).get("Volumen Neto", "")).lower() for p in lista}
            - {""}
        )
        return (
            MARCA.get(c["Marca"].strip(), c["Marca"].strip()),
            c["Producto CSV"].strip().lower(),
            vols[0] if vols else limpio(c["Contenido CSV"]).lower(),
        )

    fusion = collections.OrderedDict()
    for clave, lista in grupos.items():
        fusion.setdefault(identidad(lista), []).extend(lista)
    grupos = collections.OrderedDict(
        (max((c.strip() for p in v for c in p["Código Universal / GTIN"].split(",") if limpio(c)),
             key=lambda g: sum(int(p["Stock Disponible ML"] or 0) for p in v
                               if g in p["Código Universal / GTIN"]),
             default=f"sin-gtin-{v[0]['ID Publicación ML']}"), v)
        for v in fusion.values()
    )

    # Qué productos venían bajo el mismo ítem del origen y aquí se separan:
    # es una decisión que conviene que alguien revise, no que se pierda.
    por_item = collections.defaultdict(set)
    for clave, lista in grupos.items():
        for p in lista:
            por_item[p["# Item CSV"]].add(clave)
    separados = {k: v for k, v in por_item.items() if len(v) > 1}

    catalogo = []
    for gtin, lista in grupos.items():
        activas = [p for p in lista if p["Estado ML"] == "Activa"]
        canon = max(activas or lista, key=lambda p: int(p["Unidades Vendidas ML"] or 0))
        a = attrs.get(canon["ID Publicación ML"], {})
        stock_ml = sum(int(p["Stock Disponible ML"] or 0) for p in lista)
        gtins = sorted(
            {
                c.strip()
                for p in lista
                for c in p["Código Universal / GTIN"].split(",")
                if limpio(c)
            }
        )
        vols = sorted(
            {
                limpio(attrs.get(p["ID Publicación ML"], {}).get("Volumen Neto", "")).lower()
                for p in lista
            }
            - {""}
        )
        gtin_canon = [
            c.strip() for c in canon["Código Universal / GTIN"].split(",") if limpio(c)
        ]
        marca = MARCA.get(canon["Marca"].strip(), canon["Marca"].strip())
        contenido = vols[0] if vols else limpio(canon["Contenido CSV"])
        # La publicación canónica es la que más vende, no necesariamente la que
        # mejor describe: varias activas traen dos líneas y una pausada del mismo
        # producto trae el texto entero. Para redactar se toma la más rica —y se
        # mide DESPUÉS de quitar el relleno de Mercado Libre, porque si no gana
        # la que más promoción de ML tiene, que es la que menos producto describe.
        desc = max((sin_relleno(p["Descripción Resumen"]) for p in lista), key=len)

        clave_inv = (marca, re.sub(r"\s+", " ", canon["Producto CSV"].strip().lower()),
                     contenido.lower())
        stock = fisico.get(clave_inv, stock_ml)
        origen_stock = "inventario propio" if clave_inv in fisico else "Mercado Libre"

        avisos = []
        if clave_inv not in fisico and fisico:
            avisos.append(
                "no hay fila para este producto en el inventario físico; las existencias "
                "salen de Mercado Libre y pueden no ser reales"
            )
        if len(gtins) > 1:
            avisos.append(
                f"el origen trae {len(gtins)} GTIN para este producto ({', '.join(gtins)}); "
                "un producto tiene uno solo y hay que decidir cuál"
            )
        if len(vols) > 1:
            avisos.append(f"volumen contradictorio entre publicaciones: {', '.join(vols)}")
        if not contenido:
            avisos.append("sin contenido declarado; es obligatorio en cosmética")
        if desc.endswith("..."):
            avisos.append("descripción cortada por el origen a 503 caracteres; hay que reescribirla")
        if "COMPRANDO EN MERCADOLIBRE" in desc.upper() or "eshops.mercadolibre" in desc:
            avisos.append("la descripción del origen lleva texto y enlaces de Mercado Libre; no es publicable")
        if not desc:
            avisos.append("sin descripción en el origen")
        item = canon["# Item CSV"]
        if item in separados:
            avisos.append(
                f"el origen agrupaba este producto con otro bajo el ítem {item}; "
                "se separaron por tener GTIN distinto — conviene confirmarlo"
            )

        catalogo.append(
            {
                "slug": slug(f"{marca}-{canon['Producto CSV']}-{contenido}"),
                "nombre": canon["Producto CSV"].strip(),
                "marca": marca,
                # El GTIN vigente es el de la publicación canónica —la activa con
                # más ventas—, no el primero por orden alfabético. La Espuma
                # Limpiadora tiene uno de 2024 sin existencias y otro de 2026 con
                # todo el stock; ordenar alfabéticamente elegía el muerto.
                "gtin": (gtin_canon[0] if gtin_canon else (gtins[0] if gtins else None)),
                "gtin_historicos": [g for g in gtins if g != (gtin_canon[0] if gtin_canon else None)] or None,
                "precio": str(int(float(canon["Precio ML ($)"]))),
                "moneda": "COP",
                "existencias": stock,
                "existencias_origen": origen_stock,
                "existencias_mercadolibre": stock_ml,
                "disponibilidad": "https://schema.org/InStock"
                if stock > 0
                else "https://schema.org/OutOfStock",
                "contenido": contenido,
                "imagen": canon["Foto Principal"].strip(),
                "atributos": {
                    k: v
                    for k, v in {
                        "linea": a.get("Línea", ""),
                        "tipo_de_piel": a.get("Tipo de Piel", ""),
                        "beneficios": a.get("Funciones / Beneficios", ""),
                        "zona": a.get("Zona de Aplicación", ""),
                        "momento": a.get("Momento de Aplicación", ""),
                        "formato": a.get("Formato del Producto", ""),
                        "libre_de_crueldad": a.get("Es Libre de Crueldad", ""),
                        "dermatologicamente_testeado": a.get("Es Dermatológicamente Testeado", ""),
                        "vegano": a.get("Es Vegano", ""),
                    }.items()
                    if v
                },
                "descripcion": None,  # se rellena abajo desde descripciones.json
                "descripcion_origen_truncada": desc or None,
                "origen": {
                    "publicaciones_ml": [p["ID Publicación ML"] for p in lista],
                    "estado_ml": sorted({p["Estado ML"] for p in lista}),
                    "vendidas_historico": sum(int(p["Unidades Vendidas ML"] or 0) for p in lista),
                },
                "avisos": avisos,
            }
        )

    for p in catalogo:
        e = escritas.get(p["slug"])
        if e:
            p["descripcion"] = e["texto"]
            p["descripcion_por_confirmar"] = e.get("por_confirmar", True)
            p["avisos"] = [a for a in p["avisos"] if "descripción" not in a.lower()]
            p["avisos"].insert(
                0, "descripción redactada a partir del texto truncado del origen; POR CONFIRMAR antes de publicar"
            )
            if e.get("sin_afirmaciones_terapeuticas"):
                p["avisos"].insert(
                    1,
                    "el texto del origen hacía afirmaciones terapéuticas (curativas o preventivas) que NO se "
                    "trasladaron; recuperarlas es una decisión regulatoria, no de redacción",
                )
        else:
            p["avisos"].insert(0, "sin descripción escrita; no debe publicarse")

    catalogo.sort(key=lambda p: (p["marca"], p["nombre"], p["contenido"]))

    repetidos = [s for s, n in collections.Counter(p["slug"] for p in catalogo).items() if n > 1]
    if repetidos:
        raise SystemExit(
            f"ERROR: {len(repetidos)} slug repetidos, serían la misma URL: {repetidos}"
        )

    destino = Path(__file__).parent / "catalogo.json"
    io.open(destino, "w", encoding="utf-8").write(
        json.dumps(
            {
                "generado_de": "reporte de Mercado Libre exportado el 23-ago-2026",
                "publicaciones_origen": len(pubs),
                "productos": catalogo,
            },
            ensure_ascii=False,
            indent=2,
        )
        + "\n"
    )
    print(f"{len(pubs)} publicaciones → {len(catalogo)} productos")
    print(f"  con avisos que requieren decisión humana: {sum(1 for p in catalogo if p['avisos'])}")
    print(f"  con existencias: {sum(1 for p in catalogo if p['existencias'] > 0)}")


if __name__ == "__main__":
    main(
        sys.argv[1] if len(sys.argv) > 1 else "~/Documents/Agente-Mercadolibre",
        sys.argv[2]
        if len(sys.argv) > 2
        else "~/Documents/Inventario Mercadolibre/Inventario_Completo.csv",
    )
