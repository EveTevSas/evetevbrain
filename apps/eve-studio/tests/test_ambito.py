"""El desplegable de landing: que sea un `if` y no una sugerencia al prompt.

POR QUÉ IMPORTA. Elegir «EvePay» en la interfaz podría haberse resuelto
añadiendo una frase al prompt. No vale: a un modelo se le puede convencer de
saltarse una instrucción, y el caso que hay que cubrir es justo el de una
petición mal redactada que le haga tocar la landing equivocada. Así que el
ámbito viaja hasta `validar_ruta`, y lo que queda fuera se rechaza aunque el
prompt diga lo contrario.

Autocontenido, como los demás archivos de este directorio.
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
    for carpeta in ("evepay", "conecta", "intelligence"):
        d = tmp_path / "apps/website" / carpeta
        d.mkdir(parents=True)
        (d / "index.html").write_text("<!doctype html>\n<p>hola</p>\n", encoding="utf-8")
    monkeypatch.setattr(indice, "RAIZ", tmp_path)
    return tmp_path


def herramientas(carpetas):
    registro: dict = {}
    escribir, editar = indice.crear_herramientas_de_escritura(registro, carpetas)
    return escribir, editar, registro


SOLO_EVEPAY = ("apps/website/evepay/",)


class TestRegistroDeLandings:
    def test_las_carpetas_salen_del_registro(self):
        """Una sola lista: si se duplicara, un día no coincidirían."""
        assert indice.CARPETAS_ESCRIBIBLES == tuple(
            v["carpeta"] for v in indice.LANDINGS.values()
        )

    def test_cada_landing_tiene_etiqueta_y_carpeta_dentro_del_sitio(self):
        for id_, l in indice.LANDINGS.items():
            assert l["etiqueta"], id_
            assert l["carpeta"].startswith("apps/website/"), id_
            assert l["carpeta"].endswith("/"), f"{id_}: sin barra final, el prefijo colaría de más"


class TestAmbitoAcotado:
    def test_con_una_landing_elegida_las_otras_se_rechazan(self):
        assert indice.validar_ruta("apps/website/evepay/index.html", SOLO_EVEPAY) is None
        for ajena in (
            "apps/website/conecta/index.html",
            "apps/website/intelligence/estilos.css",
        ):
            assert indice.validar_ruta(ajena, SOLO_EVEPAY) is not None, ajena

    def test_el_ambito_no_afloja_las_demas_reglas(self):
        """Acotar a una landing no puede volver escribible lo que nunca lo fue."""
        for prohibido in (
            "apps/website/evepay/base.css",       # generado
            "apps/website/evepay/script.js",      # extensión
            "apps/website/evepay/../conecta/x.html",
        ):
            assert indice.validar_ruta(prohibido, SOLO_EVEPAY) is not None, prohibido

    def test_por_defecto_siguen_valiendo_las_tres(self):
        """Un cliente que no mande el campo se comporta como siempre."""
        for c in indice.CARPETAS_ESCRIBIBLES:
            assert indice.validar_ruta(c + "index.html") is None, c


class TestLaHerramientaRespetaElAmbito:
    def test_no_escribe_en_una_landing_fuera_de_ambito(self, repo):
        escribir, _, registro = herramientas(SOLO_EVEPAY)
        ajeno = repo / "apps/website/conecta/index.html"
        antes = ajeno.read_text(encoding="utf-8")

        salida = escribir.func(
            ruta="apps/website/conecta/index.html",
            contenido="<!doctype html>\n<p>pisado</p>\n",
            resumen="intento de tocar otra landing",
        )

        assert "solo se puede escribir" in salida
        assert ajeno.read_text(encoding="utf-8") == antes
        assert not registro.get("tocados")

    def test_si_escribe_en_la_elegida(self, repo):
        escribir, _, registro = herramientas(SOLO_EVEPAY)
        salida = escribir.func(
            ruta="apps/website/evepay/index.html",
            contenido="<!doctype html>\n<p>nuevo</p>\n",
            resumen="cambio dentro del ámbito",
        )
        assert "Escrito" in salida
        assert "nuevo" in (repo / "apps/website/evepay/index.html").read_text(encoding="utf-8")

    def test_editar_bloque_tambien_lo_respeta(self, repo):
        _, editar, registro = herramientas(SOLO_EVEPAY)
        ajeno = repo / "apps/website/intelligence/index.html"
        antes = ajeno.read_text(encoding="utf-8")
        salida = editar.func(
            ruta="apps/website/intelligence/index.html",
            buscar="<p>hola</p>",
            reemplazar="<p>adiós</p>",
            resumen="editar fuera del ámbito",
        )
        assert "solo se puede escribir" in salida
        assert ajeno.read_text(encoding="utf-8") == antes

    def test_con_todas_puede_tocar_las_tres(self, repo):
        """El caso del cambio general: una cabecera igual en las tres."""
        escribir, _, registro = herramientas(indice.CARPETAS_ESCRIBIBLES)
        for c in ("evepay", "conecta", "intelligence"):
            salida = escribir.func(
                ruta=f"apps/website/{c}/index.html",
                contenido=f"<!doctype html>\n<p>{c}</p>\n",
                resumen="cambio general de cabecera",
            )
            assert "Escrito" in salida, c
        assert len(registro["tocados"]) == 3


class TestElArnesNoSaltaContraUnaNegacion:
    """El arnés dispara ante una contradicción, no ante la palabra «toqué».

    Con el desplegable acotado, rechazar una petición es corriente, y la regla
    12 manda responder «No toqué ningún archivo» — que contiene «toqué». El
    arnés saltaba ahí: gastaba una vuelta del modelo y enseñaba un aviso que
    contradecía la respuesta de justo debajo.
    """

    @pytest.mark.parametrize(
        "respuesta",
        [
            "**No toqué ningún archivo.** El ámbito de este turno es solo EvePay.",
            "No toque ningún archivo porque la ruta está fuera de las landings.",
            "No escribí nada: necesito que me aclares en qué sección.",
            "No he tocado el archivo; la petición era una pregunta.",
        ],
    )
    def test_una_negacion_no_dispara(self, respuesta):
        assert indice.dice_que_cambio(respuesta) is False

    @pytest.mark.parametrize(
        "respuesta",
        [
            "Toqué apps/website/evepay/index.html y estilos.css.",
            "Escribí el nuevo bloque en la sección de WhatsApp.",
            "Ya está aplicado el cambio de cabecera en las tres.",
        ],
    )
    def test_una_afirmacion_si_dispara(self, respuesta):
        assert indice.dice_que_cambio(respuesta) is True

    def test_una_respuesta_que_solo_explica_no_dispara(self):
        """Describir lo que haría no es haberlo hecho, y no debe disparar nada."""
        assert indice.dice_que_cambio(
            "Para dejarlo guardado tendría que reescribir el index.html entero. ¿Lo hago?"
        ) is False
