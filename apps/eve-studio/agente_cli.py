import os
import json
import requests
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage, messages_to_dict, messages_from_dict
from langchain_core.tools import tool
from langgraph.prebuilt import create_react_agent

load_dotenv()

# 1. Inicializamos el motor (Kimi-k3)
llm = ChatOpenAI(
    api_key=os.getenv("MOONSHOT_API_KEY"),
    base_url="https://api.moonshot.ai/v1",
    model="kimi-k3",
    temperature=1.0
)

# 2. Definición de las Herramientas (Tools)
#
# Esto duplica a propósito lo que hace api/index.py: aquel mantiene todo en un
# solo módulo para no añadir importaciones relativas al montaje de Vercel, que ya
# dio problemas una vez. Es la copia la que paga el precio, así que si cambias
# aquí el criterio de URLs o la validación, cámbialo también allí.
REPO_MARCA = "Evetev-Dev/brand"
# El CDN es la única forma válida de citar un activo de marca (regla T1 del
# manual). raw.githubusercontent no tiene caché de borde y sigue a main, así que
# la imagen se rompe sola el día que el archivo se mueva.
CDN_MARCA = f"https://cdn.jsdelivr.net/gh/{REPO_MARCA}@1"
EXTENSIONES_IMAGEN = ('.png', '.webp', '.jpg', '.jpeg', '.svg', '.gif', '.ico', '.mp4')


@tool
def obtener_activo_github(ruta_archivo: str) -> str:
    """Lee un archivo del repositorio de MARCA de Evetev.

    Útil para consultar el manual (evetev_brand_styles.md), los tokens
    (colores.json) o conseguir la URL de una imagen (mascota/mascota.webp).

    Si no sabes el nombre exacto del activo, usa antes 'listar_carpeta_de_marca'.
    """
    limpia = ruta_archivo.lstrip("/")

    if limpia.lower().endswith(EXTENSIONES_IMAGEN):
        # Un binario no se mete en el contexto: se devuelve su URL. Se comprueba
        # contra el CDN y no contra la API de GitHub porque es exactamente la
        # URL que va a acabar en la página: un archivo puede estar en main y
        # todavía no en la versión etiquetada que sirve @1.
        url = f"{CDN_MARCA}/{limpia}"
        try:
            respuesta = requests.head(url, timeout=20, allow_redirects=True)
        except requests.RequestException as e:
            return f"Error de red consultando el CDN de marca: {e}"
        if respuesta.status_code == 404:
            return (
                f"El CDN no sirve '{limpia}'. O no está en el repositorio de marca, "
                "o está en main pero todavía no en una versión etiquetada. Lista la "
                "carpeta y elige uno de los publicados; no uses esta ruta."
            )
        if respuesta.status_code != 200:
            return (
                f"No se pudo comprobar '{limpia}' en el CDN "
                f"(código {respuesta.status_code}). No la uses sin confirmarla."
            )
        return url

    try:
        respuesta = requests.get(
            f"https://api.github.com/repos/{REPO_MARCA}/contents/{limpia}",
            headers={
                "Authorization": f"Bearer {os.getenv('GITHUB_TOKEN')}",
                "Accept": "application/vnd.github.v3.raw",
            },
            timeout=20,
        )
    except requests.RequestException as e:
        return f"Error de red consultando GitHub: {e}"

    if respuesta.status_code == 200:
        return respuesta.text
    return f"No se pudo leer '{limpia}' en {REPO_MARCA} (código {respuesta.status_code})."


@tool
def listar_carpeta_de_marca(ruta_carpeta: str = "") -> str:
    """Lista los activos disponibles en el repositorio de MARCA.

    Úsala ANTES de citar cualquier imagen, para partir de los archivos que
    existen de verdad en vez de deducir el nombre. Con cadena vacía lista la
    raíz; las carpetas son 'mascota', 'isotipos', 'logotipos', 'lockups',
    'unidades', 'favicon' y 'tokens'.
    """
    try:
        respuesta = requests.get(
            f"https://api.github.com/repos/{REPO_MARCA}/contents/{ruta_carpeta.lstrip('/')}",
            headers={
                "Authorization": f"Bearer {os.getenv('GITHUB_TOKEN')}",
                "Accept": "application/vnd.github+json",
            },
            timeout=20,
        )
    except requests.RequestException as e:
        return f"Error de red consultando GitHub: {e}"

    if respuesta.status_code != 200:
        return f"No se pudo listar '{ruta_carpeta}' (código {respuesta.status_code})."

    contenido = respuesta.json()
    if isinstance(contenido, dict):
        return f"'{ruta_carpeta}' es un archivo, no una carpeta. Léelo con 'obtener_activo_github'."

    entradas = sorted(
        f"{'carpeta' if e['type'] == 'dir' else 'archivo'}  {e['path']}" for e in contenido
    )
    return "\n".join(entradas) if entradas else f"'{ruta_carpeta}' está vacía."


herramientas = [obtener_activo_github, listar_carpeta_de_marca]

# 3. Funciones de Persistencia
RUTA_MEMORIA = "contexto/historial_agente.json"

def cargar_memoria_local():
    if os.path.exists(RUTA_MEMORIA):
        try:
            with open(RUTA_MEMORIA, "r", encoding="utf-8") as archivo:
                return messages_from_dict(json.load(archivo))
        except Exception as e:
            print(f"Error leyendo la memoria: {e}")
            return []
    return []

def guardar_memoria_local(historial):
    os.makedirs("contexto", exist_ok=True)
    with open(RUTA_MEMORIA, "w", encoding="utf-8") as archivo:
        json.dump(messages_to_dict(historial), archivo, ensure_ascii=False, indent=2)

def exportar_codigo_html(codigo):
    ruta_salida = "salida/index.html"
    os.makedirs("salida", exist_ok=True)
    with open(ruta_salida, "w", encoding="utf-8") as archivo:
        archivo.write(codigo)
    print(f"✅ Archivo guardado exitosamente en: {ruta_salida}")

# 4. Construimos el Agente con LangGraph
# Eliminamos el parámetro conflictivo 'state_modifier' para garantizar compatibilidad
agente_ejecutor = create_react_agent(llm, tools=herramientas)

instrucciones_sistema = """Eres el Arquitecto Frontend principal de EVETEV S.A.S. 
Tu trabajo es generar código HTML y CSS puro, de alta calidad y accesible.

REGLAS DE COMPORTAMIENTO:
1. DEBES usar la herramienta 'obtener_activo_github' para leer 'evetev_brand_styles.md' antes de escribir código si no tienes claro el contexto visual.
2. Si necesitas verificar un token específico, pide leer 'colores.json'.
3. NUNCA deduzcas el nombre de un activo de marca. Antes de citar cualquier imagen, lista la carpeta con 'listar_carpeta_de_marca' y elige de lo que exista de verdad; luego pide esa ruta a 'obtener_activo_github' y usa la URL que te devuelva tal cual —será una del CDN (cdn.jsdelivr.net), que es la única forma válida de citar un activo de marca; NUNCA escribas a mano una de raw.githubusercontent. Si el activo que necesitas no aparece en el listado, dilo en tu respuesta; no inventes la URL, porque una imagen rota no falla ruidosamente.
4. Devuelve ÚNICAMENTE código HTML, listo para ser renderizado. No agregues explicaciones fuera del bloque de código."""

# 5. Bucle de conversación continuo
historial_mensajes = cargar_memoria_local()

print("\n" + "="*50)
print(" 🚀 AGENTE FRONTEND EVETEV INICIADO (KIMI-K3 + GITHUB RAG)")
print(f" 🧠 Memoria cargada: {len(historial_mensajes)} mensajes anteriores.")
print(" Escribe tu petición para generar UI.")
print(" Escribe 'salir', 'exit' o 'quit' para terminar.")
print(" Escribe 'limpiar' para borrar el historial.")
print("="*50 + "\n")

while True:
    peticion_usuario = input("Tú (Ingeniero): ")
    
    if peticion_usuario.strip().lower() in ['salir', 'exit', 'quit']:
        print("\nCerrando el entorno del agente. ¡Hasta pronto!")
        break
        
    if peticion_usuario.strip().lower() == 'limpiar':
        historial_mensajes = []
        guardar_memoria_local(historial_mensajes)
        print("🧠 Memoria borrada. Comenzando desde cero.\n")
        continue
    
    if not peticion_usuario.strip():
        continue
        
    print("\nAgente EVETEV: Consultando repositorios y escribiendo código...\n")
    
    # Inyectamos el SystemMessage al vuelo junto con la memoria y la nueva petición
    mensajes_contexto = [SystemMessage(content=instrucciones_sistema)] + historial_mensajes + [HumanMessage(content=peticion_usuario)]
    
    # Ejecutamos el agente pasándole todo el contexto
    respuesta = agente_ejecutor.invoke({"messages": mensajes_contexto})
    
    # LangGraph devuelve el estado actualizado; tomamos el último mensaje de la IA
    ultimo_mensaje = respuesta["messages"][-1]
    salida_texto = ultimo_mensaje.content
    
    # Limpiamos el Markdown
    codigo_limpio = salida_texto.replace("```html\n", "").replace("```html", "").replace("```", "").strip()
    
    print(codigo_limpio)
    exportar_codigo_html(codigo_limpio)
    
    print("\n" + "-"*50 + "\n")
    
    # Guardamos en memoria solo la interacción actual para no duplicar las reglas del sistema en el JSON
    historial_mensajes.append(HumanMessage(content=peticion_usuario))
    historial_mensajes.append(ultimo_mensaje)
    guardar_memoria_local(historial_mensajes)