"""Un repositorio de mentira, para que las pruebas nunca escriban en el de verdad.

`api/index.py` resuelve todo contra `RAIZ`, que calcula al importarse a partir
de su propia ubicación. Aquí se sustituye por un árbol temporal con la forma
mínima que el arnés espera —las tres carpetas escribibles y algo dentro— y así
cada prueba escribe en su propio directorio, que pytest borra después.

Sin esto habría que confiar en que una prueba mal escrita no toque
`apps/website/`, y la gracia de estas pruebas es justamente no confiar.
"""

import sys
from pathlib import Path

import pytest

APP = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(APP))

import api.index as indice  # noqa: E402

# Un valor que no aparece en ningún mensaje del módulo, para poder afirmar que
# el CONTENIDO del .env no sale por ninguna vía. Con una palabra corriente la
# prueba pasaba por accidente: el propio texto del rechazo dice «secretos».
CENTINELA = "MOONSHOT_API_KEY=zzk-no-debe-salir-de-aqui-9f3a"


@pytest.fixture
def repo(tmp_path, monkeypatch):
    """Devuelve la raíz de un repositorio de mentira, ya apuntada por el módulo."""
    for carpeta in ("evepay", "conecta", "intelligence"):
        (tmp_path / "apps/website" / carpeta).mkdir(parents=True)
    (tmp_path / "apps/website/evepay/index.html").write_text(
        '<!doctype html>\n<html lang="es">\n  <body>\n    <p>hola</p>\n  </body>\n</html>\n',
        encoding="utf-8",
    )
    (tmp_path / "apps/website/evepay/estilos.css").write_text(
        ".wrap {\n  max-width: 60rem;\n}\n", encoding="utf-8"
    )
    # Los dos que el arnés no puede tocar aunque estén en carpeta escribible.
    (tmp_path / "apps/website/evepay/base.css").write_text("/* generado */\n", encoding="utf-8")
    # Y un secreto, para comprobar que no se lee.
    (tmp_path / "apps/eve-studio").mkdir(parents=True)
    (tmp_path / "apps/eve-studio/.env").write_text("MOONSHOT_API_KEY=secreto\n", encoding="utf-8")
    (tmp_path / ".git").mkdir()
    (tmp_path / ".git/config").write_text("[core]\n", encoding="utf-8")

    monkeypatch.setattr(indice, "RAIZ", tmp_path)
    return tmp_path


@pytest.fixture
def escribir_y_editar():
    """Las dos herramientas de escritura y el registro que las delata.

    Se crean por petición en el código real, así que aquí también: el tope de
    escrituras es por petición y compartirlo entre pruebas las acoplaría.
    """
    registro: dict = {}
    escribir, editar = indice.crear_herramientas_de_escritura(registro)
    return escribir, editar, registro
