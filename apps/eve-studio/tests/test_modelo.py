"""Cómo se habla con el modelo: los tres ajustes que ya rompieron el agente.

POR QUÉ EXISTE ESTE ARCHIVO. Durante días EveStudio no atendió ni una sola
petición, y las tres causas estaban en este puñado de líneas:

1. `temperature` a 0.2. kimi-k3 solo admite 1, así que la API devolvía
   `400 invalid temperature` y la petición no llegaba a ejecutarse. El cambio
   venía con un comentario razonado y convincente, que es como un error así
   sobrevive a una revisión.
2. `agente.invoke` —síncrono— llamado dentro de un `async def`. Bloquea el bucle
   de eventos, así que el 400 ni siquiera se propagaba: la persona veía el
   contador subir sin fin.
3. `TIMEOUT_MODELO` a 600, que convertía cualquier fallo en diez minutos de
   espera antes de enterarse.

Ninguna de las tres la habría cazado una prueba del arnés: no van de qué puede
escribir el agente, sino de si llega a arrancar. De ahí este archivo aparte.
"""

import ast
import inspect
import sys
from pathlib import Path

APP = Path(__file__).resolve().parents[1]
if str(APP) not in sys.path:
    sys.path.insert(0, str(APP))

import api.index as indice  # noqa: E402

FUENTE = (APP / "api" / "index.py").read_text(encoding="utf-8")


def test_la_temperatura_es_1_porque_kimi_no_admite_otra():
    """Cualquier otro valor lo rechaza la API antes de ejecutar nada."""
    assert indice.TEMPERATURA_MODELO == 1.0


def test_nadie_pasa_una_temperatura_a_mano():
    """La constante no sirve de nada si alguien vuelve a escribir el número.

    Se mira el árbol sintáctico y no el texto: así no lo despista un comentario
    que mencione `temperature=0.2` —y este módulo tiene varios que lo hacen.
    """
    literales = [
        n for n in ast.walk(ast.parse(FUENTE))
        if isinstance(n, ast.keyword)
        and n.arg == "temperature"
        and not (isinstance(n.value, ast.Name) and n.value.id == "TEMPERATURA_MODELO")
    ]
    assert not literales, (
        f"{len(literales)} llamada(s) pasan `temperature` sin usar TEMPERATURA_MODELO "
        "(líneas " + ", ".join(str(n.value.lineno) for n in literales) + "). "
        "kimi-k3 solo admite 1: usa la constante."
    )


def test_el_agente_no_se_invoca_bloqueando_el_bucle_de_eventos():
    """`agente.invoke` es síncrono; dentro de un `async def` bloquea el servidor.

    Cuando pasó, el síntoma no fue lentitud: fue que el error del modelo no se
    propagaba y la petición se quedaba colgada para siempre. Se comprueba que
    todas las invocaciones van por `asyncio.to_thread`.
    """
    fuente = inspect.getsource(indice.generar_interfaz)
    directas = [
        l.strip() for l in fuente.splitlines()
        if "agente.invoke(" in l and "to_thread" not in l
    ]
    assert not directas, (
        "hay invocaciones directas dentro del endpoint asíncrono: "
        f"{directas}. Envuélvelas en `asyncio.to_thread`."
    )
    assert "asyncio.to_thread" in fuente


def test_el_timeout_del_modelo_falla_en_un_plazo_humano():
    """600 s convertían un cuelgue en diez minutos de espera sin explicación."""
    assert indice.TIMEOUT_MODELO <= 180
    # Y que siga dando margen a un turno lento de verdad.
    assert indice.TIMEOUT_MODELO >= 60
