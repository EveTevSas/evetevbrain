"""Agente de generación de interfaces de Evetev — backend HTTP.

Convierte el REPL de línea de comandos (`agente_cli.py`) en un endpoint.
Diferencias deliberadas respecto al script original:

- Sin `while True` ni `input()`: un bucle bloqueado en stdin no tiene superficie
  HTTP y Vercel no podría servirlo.
- Sin escritura a disco. En Vercel el sistema de archivos es de solo lectura
  salvo /tmp, y las funciones son efímeras: la memoria en JSON se perdería
  entre peticiones. El historial lo manda el cliente en cada llamada.
- Con autenticación por token compartido. Sin ella, cualquiera podría invocar
  el endpoint y gastar los créditos de Moonshot, además de usar indirectamente
  el GITHUB_TOKEN. Falla cerrado: si no hay token configurado, no atiende.

Rutas declaradas con su ruta pública completa (/api/...), que es como Vercel
entrega el path a una app ASGI. Por eso NO hace falta un rewrite en
vercel.json; añadirlo puede cambiar el path que ve FastAPI y provocar un 404.
"""

import os
import secrets
from typing import List, Literal

import requests
from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langchain_core.tools import tool
from langchain_openai import ChatOpenAI
# Nota: en LangGraph 1.x esto emite un aviso de deprecación (la alternativa es
# langchain.agents.create_agent). Sigue funcionando; migrar cuando se toque.
from langgraph.prebuilt import create_react_agent

load_dotenv()  # solo para desarrollo local; en Vercel las vars ya están en el entorno

app = FastAPI(title="Agente Frontend Evetev", docs_url=None, redoc_url=None)

REPO_MARCA = "Evetev-Dev/brand"


# ── Autenticación ──────────────────────────────────────────────────────────
def verificar_token(token_recibido: str | None) -> None:
    esperado = os.getenv("AGENTE_API_TOKEN")
    if not esperado:
        # Falla cerrado a propósito: es peor quedar abierto que devolver error.
        raise HTTPException(status_code=503, detail="agente_sin_token_configurado")
    if not token_recibido or not secrets.compare_digest(token_recibido, esperado):
        raise HTTPException(status_code=401, detail="token_invalido")


# ── Herramienta: leer activos de marca desde GitHub ────────────────────────
@tool
def obtener_activo_github(ruta_archivo: str) -> str:
    """Busca y lee archivos del repositorio de marca de Evetev en GitHub.

    Útil para consultar el manual (evetev_brand_styles.md), los tokens
    (colores.json) o conseguir la URL raw de una imagen (mascota/mascota.webp).
    """
    token = os.getenv("GITHUB_TOKEN")
    url = f"https://api.github.com/repos/{REPO_MARCA}/contents/{ruta_archivo}"
    cabeceras = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github.v3.raw",
    }
    try:
        respuesta = requests.get(url, headers=cabeceras, timeout=20)
    except requests.RequestException as e:
        return f"Error de red consultando GitHub: {e}"

    if respuesta.status_code == 200:
        if ruta_archivo.lower().endswith((".png", ".webp", ".jpg", ".jpeg", ".svg", ".gif")):
            return f"https://raw.githubusercontent.com/{REPO_MARCA}/main/{ruta_archivo}"
        return respuesta.text
    return (
        f"Error al buscar en GitHub: '{ruta_archivo}' no encontrado "
        f"(código {respuesta.status_code})."
    )


INSTRUCCIONES_SISTEMA = """Eres el Arquitecto Frontend principal de EVETEV S.A.S.
Tu trabajo es generar código HTML y CSS puro, de alta calidad y accesible.

REGLAS DE COMPORTAMIENTO:
1. DEBES usar la herramienta 'obtener_activo_github' para leer 'evetev_brand_styles.md' antes de escribir código si no tienes claro el contexto visual.
2. Si necesitas verificar un token específico, pide leer 'colores.json'.
3. Si el diseño requiere la mascota oficial, pide la ruta 'mascota/mascota.webp' y usa la URL que te devuelva la herramienta directamente en tus etiquetas <img>.
4. Devuelve ÚNICAMENTE código HTML, listo para ser renderizado. No agregues explicaciones fuera del bloque de código."""


def construir_agente():
    """Se construye por invocación, no al importar el módulo: si faltara la API
    key, un fallo en el import deja la función muerta y sin diagnóstico."""
    llm = ChatOpenAI(
        api_key=os.getenv("MOONSHOT_API_KEY"),
        base_url="https://api.moonshot.ai/v1",
        model="kimi-k3",
        temperature=1.0,
    )
    return create_react_agent(llm, tools=[obtener_activo_github])


# ── Contrato de la API ─────────────────────────────────────────────────────
class MensajeFrontend(BaseModel):
    rol: Literal["user", "assistant"]
    contenido: str


class PeticionChat(BaseModel):
    historial: List[MensajeFrontend] = Field(default_factory=list)
    mensaje_nuevo: str = Field(min_length=1, max_length=8000)


def limpiar_markdown(texto: str) -> str:
    return (
        texto.replace("```html\n", "")
        .replace("```html", "")
        .replace("```", "")
        .strip()
    )


@app.get("/api/health")
async def health():
    """Sirve para confirmar en el primer despliegue que el enrutado funciona."""
    return {
        "ok": True,
        "servicio": "agente-frontend-evetev",
        "moonshot_configurado": bool(os.getenv("MOONSHOT_API_KEY")),
        "github_configurado": bool(os.getenv("GITHUB_TOKEN")),
        "token_configurado": bool(os.getenv("AGENTE_API_TOKEN")),
    }


@app.post("/api/chat")
async def generar_interfaz(
    peticion: PeticionChat,
    x_agente_token: str | None = Header(default=None, alias="X-Agente-Token"),
):
    verificar_token(x_agente_token)

    if not os.getenv("MOONSHOT_API_KEY"):
        raise HTTPException(status_code=503, detail="falta_moonshot_api_key")

    mensajes = [SystemMessage(content=INSTRUCCIONES_SISTEMA)]
    for m in peticion.historial:
        mensajes.append(
            HumanMessage(content=m.contenido)
            if m.rol == "user"
            else AIMessage(content=m.contenido)
        )
    mensajes.append(HumanMessage(content=peticion.mensaje_nuevo))

    try:
        resultado = construir_agente().invoke({"messages": mensajes})
    except Exception as e:
        # Sin filtrar la excepción cruda al cliente: puede arrastrar la API key.
        print(f"fallo del agente: {type(e).__name__}: {e}")
        raise HTTPException(status_code=502, detail="fallo_del_agente")

    salida = resultado["messages"][-1].content
    return {"codigo_html": limpiar_markdown(salida), "mensaje_crudo": salida}
