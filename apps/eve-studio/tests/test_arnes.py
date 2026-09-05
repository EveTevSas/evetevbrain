"""El arnés de escritura: lo único que impide que el agente toque lo que no debe.

POR QUÉ EXISTE ESTE ARCHIVO. `validar_ruta`, `_resolver` y `_guardar` son las
tres funciones que separan «un agente que edita tres landings» de «un agente con
permiso de escritura sobre tu disco». Viven en código y no en el prompt
justamente porque a un modelo se le puede convencer de saltarse una instrucción;
a un `if` no. Pero un `if` sin prueba se puede borrar sin que nada se entere: al
bajar la app a local se comprobaron a mano y el guion se tiró, así que durante
un tiempo relajar `NO_SE_LEE` o añadir una extensión a `EXTENSIONES_ESCRIBIBLES`
no ponía nada en rojo.

Cada prueba de rechazo comprueba DOS cosas: que la herramienta dice que no, y
que el archivo no cambió. Lo primero sin lo segundo no prueba nada — el mensaje
de error puede ser correcto y la escritura haberse hecho igual.
"""

import api.index as indice


# ── validar_ruta: dónde se puede escribir ─────────────────────────────────────
class TestValidarRuta:
    def test_acepta_las_tres_landings(self):
        for ruta in (
            "apps/website/evepay/index.html",
            "apps/website/conecta/estilos.css",
            "apps/website/intelligence/index.html",
        ):
            assert indice.validar_ruta(ruta) is None, ruta

    def test_rechaza_fuera_de_las_landings(self):
        for ruta in (
            "apps/website/index.html",          # la portada NO es una landing
            "apps/eveledger/algo.html",
            "packages/brand/landing/base.css",
            "apps/eve-studio/api/index.py",     # el agente no reescribe su arnés
            ".github/workflows/ci.yml",
        ):
            assert indice.validar_ruta(ruta) is not None, ruta

    def test_rechaza_extensiones_que_no_son_html_ni_css(self):
        for ruta in (
            "apps/website/evepay/script.js",
            "apps/website/evepay/datos.json",
            "apps/website/evepay/index.html.bak",
        ):
            assert indice.validar_ruta(ruta) is not None, ruta

    def test_rechaza_los_archivos_generados(self):
        # Editarlos aquí los revierte el siguiente `pnpm landings:sync` y rompe
        # el job de CI que vigila las copias.
        assert indice.validar_ruta("apps/website/evepay/base.css") is not None
        assert indice.validar_ruta("apps/website/conecta/formularios.js") is not None

    def test_rechaza_rutas_que_intentan_salirse(self):
        for ruta in (
            "apps/website/evepay/../../../etc/passwd",
            "/apps/website/evepay/index.html",   # absoluta
            "C:\\apps\\website\\evepay\\x.html",
            "",
            "  apps/website/evepay/index.html  ",
        ):
            assert indice.validar_ruta(ruta) is not None, repr(ruta)

    def test_un_prefijo_parecido_no_cuela(self):
        # 'apps/website/evepay-viejo/' empieza por el mismo texto que la carpeta
        # escribible, pero no es ella. El arnés compara con la barra final justo
        # para esto.
        assert indice.validar_ruta("apps/website/evepay-viejo/index.html") is not None


# ── _resolver: qué se puede leer ──────────────────────────────────────────────
class TestResolver:
    def test_no_deja_salir_del_repositorio(self, repo):
        for ruta in ("../../../etc/passwd", "../fuera.txt"):
            try:
                indice._resolver(ruta)
            except ValueError as e:
                assert "se sale del repositorio" in str(e)
            else:
                raise AssertionError(f"{ruta} debería haberse rechazado")

    def test_niega_los_secretos_y_la_fontaneria(self, repo):
        for ruta in (
            "apps/eve-studio/.env",
            ".env",
            ".env.local",
            ".git/config",
            "node_modules/algo/index.js",
            "apps/eve-studio/.venv/pyvenv.cfg",
        ):
            try:
                indice._resolver(ruta)
            except ValueError as e:
                assert "no se puede leer" in str(e), ruta
            else:
                raise AssertionError(f"{ruta} debería haberse rechazado")

    def test_una_absoluta_se_trata_como_relativa_a_la_raiz(self, repo):
        # No se escapa: se le quita la barra y queda dentro. Lo que importa es
        # que el resultado siga colgando de RAIZ.
        assert indice._resolver("/apps/website/evepay/index.html") == (
            repo / "apps/website/evepay/index.html"
        )

    def test_deja_leer_lo_normal(self, repo):
        assert indice._resolver("apps/website/evepay/index.html").is_file()

    def test_leer_archivo_no_devuelve_el_env(self, repo):
        from conftest import CENTINELA

        salida = indice.leer_archivo.func("apps/eve-studio/.env")
        assert "no se puede leer" in salida
        assert CENTINELA not in salida

    def test_listar_carpeta_oculta_lo_que_no_se_lee(self, repo):
        salida = indice.listar_carpeta.func("")
        assert ".git" not in salida
        assert "apps" in salida


# ── Las herramientas: rechazar es no escribir ─────────────────────────────────
class TestEscribirArchivo:
    def test_rechazo_no_toca_el_disco(self, repo, escribir_y_editar):
        escribir, _, registro = escribir_y_editar
        objetivo = repo / "apps/website/evepay/base.css"
        antes = objetivo.read_text(encoding="utf-8")

        salida = escribir.func(
            ruta="apps/website/evepay/base.css",
            contenido="/* pisado */",
            resumen="intento de escribir un generado",
        )

        assert "generado" in salida
        assert objetivo.read_text(encoding="utf-8") == antes
        assert not registro.get("tocados")
        # El motivo queda donde el modelo no puede tocarlo: es lo que permite
        # desmentirlo si luego cuenta que sí escribió.
        assert registro["fallos"]

    def test_escribe_cuando_la_ruta_es_valida(self, repo, escribir_y_editar):
        escribir, _, registro = escribir_y_editar
        salida = escribir.func(
            ruta="apps/website/conecta/estilos.css",
            contenido=".nuevo {\n  color: red;\n}\n",
            resumen="una regla nueva de prueba",
        )
        assert "Escrito" in salida
        assert (repo / "apps/website/conecta/estilos.css").read_text(encoding="utf-8").startswith(".nuevo")
        assert list(registro["tocados"]) == ["apps/website/conecta/estilos.css"]

    def test_no_deja_el_archivo_en_blanco(self, repo, escribir_y_editar):
        escribir, _, registro = escribir_y_editar
        objetivo = repo / "apps/website/evepay/index.html"
        antes = objetivo.read_text(encoding="utf-8")
        escribir.func(ruta="apps/website/evepay/index.html", contenido="   ", resumen="vaciar el archivo")
        assert objetivo.read_text(encoding="utf-8") == antes

    def test_respeta_el_tope_de_bytes(self, repo, escribir_y_editar):
        escribir, _, registro = escribir_y_editar
        objetivo = repo / "apps/website/evepay/index.html"
        antes = objetivo.read_text(encoding="utf-8")
        salida = escribir.func(
            ruta="apps/website/evepay/index.html",
            contenido="x" * (indice.MAX_BYTES_ARCHIVO + 1),
            resumen="un archivo desmesurado",
        )
        assert "supera" in salida
        assert objetivo.read_text(encoding="utf-8") == antes

    def test_respeta_el_tope_de_archivos_por_peticion(self, repo, escribir_y_editar):
        escribir, _, registro = escribir_y_editar
        for i in range(indice.MAX_ARCHIVOS):
            carpeta = ["evepay", "conecta", "intelligence"][i % 3]
            escribir.func(
                ruta=f"apps/website/{carpeta}/p{i}.html",
                contenido=f"<p>{i}</p>",
                resumen=f"archivo de prueba {i}",
            )
        assert len(registro["tocados"]) == indice.MAX_ARCHIVOS
        salida = escribir.func(
            ruta="apps/website/evepay/uno-de-mas.html",
            contenido="<p>de más</p>",
            resumen="el que ya no cabe",
        )
        assert "máximo" in salida
        assert not (repo / "apps/website/evepay/uno-de-mas.html").exists()


class TestEditarBloque:
    def test_sin_coincidencia_no_escribe(self, repo, escribir_y_editar):
        _, editar, registro = escribir_y_editar
        objetivo = repo / "apps/website/evepay/index.html"
        antes = objetivo.read_text(encoding="utf-8")

        salida = editar.func(
            ruta="apps/website/evepay/index.html",
            buscar="ESTO NO ESTÁ EN NINGÚN SITIO",
            reemplazar="x",
            resumen="fragmento que no existe",
        )

        assert "no aparece" in salida
        assert objetivo.read_text(encoding="utf-8") == antes
        assert not registro.get("tocados")

    def test_ambiguo_no_escribe(self, repo, escribir_y_editar):
        _, editar, registro = escribir_y_editar
        objetivo = repo / "apps/website/evepay/index.html"
        antes = objetivo.read_text(encoding="utf-8")

        salida = editar.func(
            ruta="apps/website/evepay/index.html",
            buscar="\n",
            reemplazar="",
            resumen="fragmento ambiguo a propósito",
        )

        assert "veces" in salida
        assert objetivo.read_text(encoding="utf-8") == antes
        assert not registro.get("tocados")

    def test_unico_escribe(self, repo, escribir_y_editar):
        _, editar, registro = escribir_y_editar
        salida = editar.func(
            ruta="apps/website/evepay/index.html",
            buscar='<html lang="es">',
            reemplazar='<html lang="es" data-prueba="1">',
            resumen="marca de prueba en la etiqueta html",
        )
        assert "Escrito" in salida
        assert 'data-prueba="1"' in (repo / "apps/website/evepay/index.html").read_text(encoding="utf-8")

    def test_la_segunda_edicion_parte_de_la_primera(self, repo, escribir_y_editar):
        _, editar, registro = escribir_y_editar
        editar.func(
            ruta="apps/website/evepay/index.html",
            buscar="<p>hola</p>",
            reemplazar="<p>hola</p>\n    <p>dos</p>",
            resumen="añade un párrafo",
        )
        editar.func(
            ruta="apps/website/evepay/index.html",
            buscar="<p>dos</p>",
            reemplazar="<p>tres</p>",
            resumen="cambia el párrafo recién añadido",
        )
        texto = (repo / "apps/website/evepay/index.html").read_text(encoding="utf-8")
        assert "<p>hola</p>" in texto and "<p>tres</p>" in texto and "<p>dos</p>" not in texto

    def test_fuera_de_las_landings_no_escribe(self, repo, escribir_y_editar):
        _, editar, registro = escribir_y_editar
        secreto = repo / "apps/eve-studio/.env"
        antes = secreto.read_text(encoding="utf-8")
        salida = editar.func(
            ruta="apps/eve-studio/.env",
            buscar="secreto",
            reemplazar="robado",
            resumen="intento de tocar el .env",
        )
        assert "No se escribió nada" in salida
        assert secreto.read_text(encoding="utf-8") == antes
