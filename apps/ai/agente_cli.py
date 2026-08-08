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

# 2. Definición de la Herramienta (Tool)
@tool
def obtener_activo_github(ruta_archivo: str) -> str:
    """
    Busca y lee archivos directamente del monorepo Evetev-Dev/brand en GitHub.
    Útil para consultar el manual (evetev_brand_styles.md), tokens (colores.json) 
    o conseguir la URL raw de imágenes (ej. mascota/mascota.webp).
    """
    repo = "Evetev-Dev/brand"
    token = os.getenv("GITHUB_TOKEN")
    url = f"https://api.github.com/repos/{repo}/contents/{ruta_archivo}"
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github.v3.raw"
    }
    
    respuesta = requests.get(url, headers=headers)
    
    if respuesta.status_code == 200:
        if ruta_archivo.endswith(('.png', '.webp', '.jpg', '.jpeg', '.svg', '.gif')):
            return f"https://raw.githubusercontent.com/{repo}/main/{ruta_archivo}"
        return respuesta.text
    else:
        return f"Error al buscar en GitHub: Archivo '{ruta_archivo}' no encontrado (Código {respuesta.status_code})."

herramientas = [obtener_activo_github]

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
3. Si el diseño requiere la mascota oficial, pide la ruta 'mascota/mascota.webp' y usa la URL que te devuelva la herramienta directamente en tus etiquetas <img>.
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