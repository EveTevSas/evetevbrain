"""Los dos topes que impiden que una petición dé vueltas para siempre.

POR QUÉ EXISTE ESTE ARCHIVO. Al bajar la app a local se quitaron el presupuesto
de tiempo y el tope de pasos, con el argumento de que en local no hay ningún
reloj externo que corte. Lo primero era correcto; lo segundo dejó como único
freno el valor por defecto de LangGraph, que son 10007 pasos —comprobado— y por
tanto 10007 llamadas al modelo.

Y había un segundo agujero, más fino: el contador de escrituras se incrementaba
dentro de `_guardar`, al que solo se llega DESPUÉS de validar. Los siete caminos
por los que `editar_bloque` puede fallar salen antes, así que el fallo más común
—un 'buscar' cuya sangría no casa— no gastaba presupuesto. Un modelo reintentando
el mismo fragmento mal copiado podía repetirlo sin límite.

Este archivo es autocontenido a propósito: no depende del conftest de las
pruebas del arnés, para que los dos cambios puedan mezclarse en cualquier orden.
"""

import sys
from pathlib import Path

import pytest

APP = Path(__file__).resolve().parents[1]
if str(APP) not in sys.path:
    sys.path.insert(0, str(APP))

import api.index as indice  # noqa: E402


@pytest.fixture
def repo(tmp_path, monkeypatch):
    """Un repositorio de mentira, para no escribir jamás en el de verdad."""
    for carpeta in ("evepay", "conecta", "intelligence"):
        (tmp_path / "apps/website" / carpeta).mkdir(parents=True)
    (tmp_path / "apps/website/evepay/index.html").write_text(
        '<!doctype html>\n<html lang="es">\n  <body>\n    <p>hola</p>\n  </body>\n</html>\n',
        encoding="utf-8",
    )
    monkeypatch.setattr(indice, "RAIZ", tmp_path)
    return tmp_path


@pytest.fixture
def herramientas():
    registro: dict = {}
    escribir, editar = indice.crear_herramientas_de_escritura(registro)
    return escribir, editar, registro


def test_el_fallo_mas_comun_gasta_presupuesto(repo, herramientas):
    """Un 'buscar' que no casa tiene que contar como intento.

    Es la prueba que define el arreglo: antes este camino no incrementaba nada,
    así que el bucle no se cerraba nunca.
    """
    _, editar, registro = herramientas
    for _ in range(indice.MAX_INTENTOS_DE_ESCRITURA):
        salida = editar.func(
            ruta="apps/website/evepay/index.html",
            buscar="UN FRAGMENTO QUE NO ESTÁ",
            reemplazar="x",
            resumen="reintento con el fragmento mal copiado",
        )
        assert "no aparece" in salida

    # El siguiente ya no es un fallo de coincidencia: es el tope, y lo dice.
    salida = editar.func(
        ruta="apps/website/evepay/index.html",
        buscar="UN FRAGMENTO QUE NO ESTÁ",
        reemplazar="x",
        resumen="el intento que ya no cabe",
    )
    assert "tope" in salida and "para" in salida
    assert not registro.get("tocados")


def test_el_tope_frena_tambien_las_escrituras_validas(repo, herramientas):
    """Agotado el presupuesto, no se escribe aunque la petición sea impecable."""
    escribir, editar, registro = herramientas
    for _ in range(indice.MAX_INTENTOS_DE_ESCRITURA):
        editar.func(
            ruta="apps/website/evepay/index.html",
            buscar="NO ESTÁ",
            reemplazar="x",
            resumen="quemando el presupuesto a propósito",
        )

    antes = (repo / "apps/website/evepay/index.html").read_text(encoding="utf-8")
    salida = escribir.func(
        ruta="apps/website/conecta/index.html",
        contenido="<!doctype html>\n<html></html>\n",
        resumen="una escritura perfectamente válida, pero tarde",
    )
    assert "tope" in salida
    assert not (repo / "apps/website/conecta/index.html").exists()
    assert (repo / "apps/website/evepay/index.html").read_text(encoding="utf-8") == antes


def test_las_rutas_invalidas_tambien_cuentan(repo, herramientas):
    """Insistir con una ruta prohibida es la otra forma de dar vueltas."""
    escribir, _, registro = herramientas
    for _ in range(indice.MAX_INTENTOS_DE_ESCRITURA):
        assert "solo se puede escribir" in escribir.func(
            ruta="apps/eveledger/algo.html", contenido="<p>x</p>", resumen="ruta prohibida, otra vez"
        )
    assert "tope" in escribir.func(
        ruta="apps/eveledger/algo.html", contenido="<p>x</p>", resumen="y una más"
    )


def test_el_presupuesto_da_para_un_trabajo_normal(repo, herramientas):
    """El tope corta el bucle, no el trabajo: cinco archivos caben de sobra."""
    escribir, _, registro = herramientas
    for i in range(indice.MAX_ARCHIVOS):
        carpeta = ["evepay", "conecta", "intelligence"][i % 3]
        salida = escribir.func(
            ruta=f"apps/website/{carpeta}/p{i}.html",
            contenido=f"<p>{i}</p>",
            resumen=f"archivo {i} de un cambio normal",
        )
        assert "Escrito" in salida
    assert len(registro["tocados"]) == indice.MAX_ARCHIVOS


def test_hay_tope_de_pasos_y_es_muy_inferior_al_de_langgraph():
    """10007 pasos por defecto son 10007 llamadas al modelo."""
    assert indice.MAX_PASOS_AGENTE < 200
    # Dos pasos por llamada a herramienta en un grafo ReAct: que quede sitio
    # para un trabajo real y no solo para el bucle.
    assert indice.MAX_PASOS_AGENTE >= 30
