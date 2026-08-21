# Manual de implantación — asistente RAG para empresas

Cómo se le monta a una empresa un asistente que responde **solo** con sus
documentos. Es la receta que salió de construir el nuestro, con los tiempos y
los tropiezos reales, no con los que uno se imagina antes de empezar.

> El caso de referencia es **Fluxi** (`apps/rag-assistant`), que responde en
> `evetev.com` como **Eve**. Su plan está en
> [`PLAN_ASISTENTE_FLUXI.md`](./PLAN_ASISTENTE_FLUXI.md) y sus specs en
> `specs/fluxi/`. Los precios y el modelo de negocio, en
> [`MODELO_DE_NEGOCIO_ASISTENTE.md`](./MODELO_DE_NEGOCIO_ASISTENTE.md).

---

## 1. Qué se vende, dicho con precisión

**Un motor de respuesta anclado a una base documental cerrada.** Se le entrega
un corpus escrito por el cliente; responde solo con lo que está ahí, cita de
dónde lo sacó, y cuando no lo tiene lo dice y deriva a una persona.

**No es un chatbot con la personalidad de la empresa encima.** La diferencia no
es de tono, es de arquitectura: el modelo no aporta conocimiento, aporta
redacción. Todo lo que afirma sale del contexto que se le pasa en esa misma
petición, y **lo que escribe se verifica antes de mostrarse**.

Esa distinción es el producto. Cualquiera monta un chat sobre una API en una
tarde; lo que se cobra es que **no invente**, y que eso se pueda demostrar con
un informe y no con una promesa.

### Los dos usos, que se venden distinto

|                  | Interno (empleados)                          | De cara al cliente                                  |
| ---------------- | -------------------------------------------- | --------------------------------------------------- |
| Corpus           | Políticas, procedimientos, manuales, RR. HH. | Producto, precios, condiciones, soporte             |
| Quién lo escribe | El área dueña de cada documento              | Mercadeo y producto, con revisión legal             |
| Riesgo si miente | Un empleado hace algo mal                    | **La empresa afirma algo en público**               |
| Guardas          | Las mismas seis                              | Las mismas seis, y el corpus se revisa con más ojos |
| Gancho comercial | «Deja de contestar lo mismo veinte veces»    | «Atiende de noche sin decir mentiras»               |

El interno entra más fácil —el riesgo percibido es menor— y sirve de puerta para
el segundo, que es el que paga mejor.

---

## 2. Lo que hace que no invente: seis capas, no un prompt

Es lo que se le explica al cliente en la primera reunión, y lo que justifica el
precio.

| #   | Capa                        | Qué garantiza                                                                                                                                         |
| --- | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Solo el contexto entra**  | El prompt no lleva conocimiento del mundo: lo único que el modelo puede afirmar son los fragmentos recuperados, con sus identificadores.              |
| 2   | **Compuerta de abstención** | Si la recuperación no alcanza el umbral, **no hay llamada al modelo**. Es imposible inventar sobre algo que nunca se le preguntó.                     |
| 3   | **Prompt de anclaje**       | Versionado y revisado como cualquier documento, no escondido en el código.                                                                            |
| 4   | **Verificación de citas**   | Toda cita tiene que existir entre los fragmentos entregados. Si cita algo que no recibió, la respuesta se descarta.                                   |
| 5   | **Verificación de cifras**  | Todo número de la respuesta tiene que aparecer en el contexto. Es lo que impide que un precio se «redondee».                                          |
| 6   | **Temas vetados**           | Lista explícita con la respuesta ya redactada. No se le pide al modelo que juzgue si algo es asesoría legal: se detecta y se responde con texto fijo. |

**Dos de las capas no llegan al modelo** —las respuestas selladas y la
abstención— y en un sitio corporativo se llevan buena parte del tráfico: cuestan
cero y no pueden equivocarse.

### La regla dura que ordena todo lo demás

**Ninguna instrucción del prompt se da por cumplida porque el modelo diga que la
cumplió.**

Viene de un fallo propio: en otro agente nuestro, la regla «termina siempre
indicando la URL del PR que te devolvió la herramienta» hizo que, sin haber
llamado a la herramienta, el modelo **se inventara la URL**. La regla que debía
dar trazabilidad fue la que fabricó el número.

Se le pide al modelo que cite, y el código comprueba que la cita exista. Toda
obligación del prompt necesita su verificador; si no se puede verificar, no se
pide.

---

## 3. El proceso, fase por fase

Tiempos reales del primer montaje. Para un cliente con corpus ya escrito, la
fase 1 se acorta mucho; lo que nunca se acorta es la fase 0.

### Fase 0 — La base documental _(sin una línea de código)_

**Es la fase que decide si el proyecto sale bien, y la única que no se puede
acelerar.** Aquí se gasta la mayor parte del tiempo con el cliente.

1. **Entrevista de alcance.** Qué preguntas llegan hoy, por qué canal, cuántas
   al día, quién las contesta y con qué se equivoca. Sirve para el corpus y para
   el set dorado.
2. **Inventario de fuentes.** Dónde vive hoy cada respuesta: la web, un PDF, la
   cabeza de alguien. **Lo que solo está en una cabeza hay que escribirlo**, y
   ese suele ser el trabajo real.
3. **Redacción del corpus** siguiendo el manual de redacción que se le entrega.
4. **Reglas de contenido propias del cliente**: lo que no puede decir, lo que
   necesita derivar, las cifras que son de referencia.
5. **Los tres conjuntos de evaluación**, escritos **antes** del motor: dorado,
   fuera de alcance y ataques. Las preguntas se redactan mirando lo que la gente
   pregunta de verdad, no lo que la base contesta.
6. **Cuentas y llaves** verificadas, incluida la facturación internacional.

> **Aviso que ahorra un proyecto:** si el cliente no tiene quién escriba y
> apruebe el corpus, **no se arranca**. Un asistente sobre documentos que nadie
> aprueba es un generador de afirmaciones sin dueño.

### Fase 1 — Motor local _(nada en la nube)_

Ingesta, troceo, índice, recuperación híbrida y compuerta, con un CLI para
preguntar sin gastar tokens. Se cierra cuando la recuperación acierta sobre el
set dorado, corriendo en el portátil.

### Fase 2 — Generación anclada y endpoint

Prompt, verificación de salida, guardas de abuso, cupos y presupuesto. El
endpoint transmite **por frases ya verificadas** (ver §5).

### Fase 3 — Widget

Un `<script>` con Shadow DOM, la marca del cliente por atributos `data-`, y
degradación al canal de contacto cuando algo falla.

### Fase 4 — Registro y bucle de mejora

Cada turno emite un evento, sin datos personales. De ahí sale el **informe de
preguntas sin respuesta**, que es lo que convierte la venta en suscripción: cada
grupo de abstenciones es un documento que le falta a la base.

### Fase 5 — Entrega

Informe de evaluación, manual de redacción y traspaso. Ver §7.

---

## 4. Configuración recomendada

Medida, no elegida por catálogo. Los precios y el detalle están en el documento
de modelo de negocio.

| Pieza            | Elección                                               | Por qué                                                                                                                                                                                                                           |
| ---------------- | ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Generación**   | `kimi-k2.6` (Moonshot)                                 | Medido contra `kimi-k3` sobre las mismas preguntas: misma calidad, **30% más rápido**, y **5× más barato de entrada, 6× de salida**. Un modelo de razonamiento para leer seis fragmentos y escribir tres frases es dinero tirado. |
| **Embeddings**   | `text-embedding-v4` (Alibaba Model Studio)             | **Ni Moonshot ni DeepSeek tienen endpoint de embeddings.** Hacen falta dos cuentas de todos modos. Dimensión configurable: a 512 el índice pesa la cuarta parte y casi no se pierde acierto.                                      |
| **Índice**       | **Un archivo en el repositorio**, no una base de datos | Hasta unos miles de fragmentos, la matriz cuantizada a int8 cabe en el paquete de la función: recuperación sin red, sin costo y con `git revert`. `pgvector` entra cuando el corpus no quepa.                                     |
| **Hosting**      | Vercel                                                 | El widget es estático y el endpoint una función. **Plan Pro desde el primer cliente** (ver §6).                                                                                                                                   |
| **Registro**     | Postgres administrado                                  | Los logs del hosting caducan; el bucle de mejora necesita historia propia.                                                                                                                                                        |
| **Dependencias** | **Cero** en el camino caliente                         | BM25, coseno, RRF y el cliente HTTP son ~400 líneas propias. Un motor que se vende tiene que poder leerse entero en una tarde.                                                                                                    |

### Recuperación

- **Híbrida**: BM25 en proceso (sin red) + densa por coseno, fusionadas con
  **RRF k=60**, que fusiona por posición y evita mezclar escalas incompatibles.
- **Troceo por sección semántica**, no por número de caracteres.
- **Recuperación contextual**: dos o tres líneas generadas en la ingesta que
  sitúan cada fragmento en su documento, y que se vectorizan con él. Se paga una
  vez.

---

## 5. Las trampas, ya pagadas

Esto es lo que de verdad se replica. Cada una costó tiempo la primera vez.

### De diseño

| Trampa                                    | Qué pasa                                                                                                                                     | Cómo se evita                                                                                                                                                |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Usar el puntaje de RRF como compuerta** | RRF puntúa por **posición**: el primer puesto vale lo mismo si el fragmento es perfecto o basura. La compuerta abre siempre.                 | La fusión decide el **orden**; la compuerta decide **si**, con señales crudas y acotadas.                                                                    |
| **Cobertura léxica plana**                | Trata «pasa» y «cliente» igual que «idempotencia», así que una pregunta con relleno se abstiene **con el fragmento correcto ya recuperado**. | Ponderar la cobertura por **idf**: mandan los términos que discriminan.                                                                                      |
| **Transmitir token a token**              | Si la verificación falla al final, **la respuesta mala ya la vio la persona**. No se puede desdecir.                                         | Transmitir **por frases ya verificadas**. Ojo: las citas van _después_ del punto, así que una frase no está cerrada en el punto sino tras el grupo de citas. |
| **Un secreto de respaldo constante**      | Si el repositorio es público, cualquiera firma sesiones válidas. Se detectó **probándolo contra producción**.                                | Respaldo **aleatorio por proceso**, y el widget reintenta una vez cuando recibe 401.                                                                         |

### Del validador del corpus

| Trampa                               | Qué pasa                                                                                                                                                                                                          |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Reglas ancladas a la línea**       | El formateador reflowa un párrafo y la regla deja de encontrar lo que buscaba —o peor, parte una frase y lee «…puede usar en producción» sin su negación—. Recortar por puntuación, **nunca** por salto de línea. |
| **Comparar con tildes**              | Un documento escrito sin acentos esquiva las reglas en silencio. Normalizar los dos lados, patrones incluidos.                                                                                                    |
| **Palabras sueltas como disparador** | «comisión» marcaba «menos comisiones acumuladas», que describe la arquitectura y no el precio. Una afirmación de precio siempre trae una **cifra** o una frase del modelo de cobro.                               |
| **Vetar por subcadena**              | Vetar «en producción» marca los negativos, que son justo los que se quieren. La regla real es **exigir la negación en la misma frase**.                                                                           |

### Del modelo

| Trampa                                           | Qué pasa                                                                                                                                                                                                                             |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Los modelos razonan antes de responder**       | Ese razonamiento consume el presupuesto de salida: con el tope en 220 tokens, la primera llamada real devolvió **texto vacío** habiéndoselos gastado. Apagarlo (`thinking: disabled`, o esfuerzo mínimo en los que siempre razonan). |
| **`temperature` no siempre se admite**           | Hay modelos que responden 400 si se les manda distinta de la suya. El parámetro va opcional — y que esto no rompa nada es la prueba de que el anclaje está donde debe.                                                               |
| **La guarda de enlaces contra el propio prompt** | El prompt manda ofrecer el correo de contacto, el modelo obedece, y la guarda lo marca como enlace inventado: **tira respuestas correctas**. El conjunto válido es contexto **∪** prompt.                                            |

### De despliegue

| Trampa                                       | Qué pasa                                                                                                                                                                                |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Leer el corpus del sistema de archivos**   | Hay que acertar con la inclusión de archivos y con rutas que cambian al empaquetar; falla **solo en producción**. Importar el índice como módulo.                                       |
| **`Origin` en un GET del mismo origen**      | El navegador no lo manda, así que la guarda de origen rechaza la petición del propio widget con 403. El endpoint de sesión va por **POST**.                                             |
| **La lista de orígenes**                     | Si el sitio estrena dominio y no se agrega, el asistente deja de responder **sin que nada se ponga rojo**. Incluir también las previews del sitio, o cada PR muestra el asistente roto. |
| **Cambiar una variable de entorno**          | No afecta al despliegue que ya está en vivo. Hay que volver a desplegar, y el síntoma engaña: parece que la variable no funciona.                                                       |
| **Pegar la llave en la variable equivocada** | Rompe dos cosas de un golpe y el banco de pruebas sigue funcionando —entra por la regla de previews—, así que despista. El endpoint de salud lo delata en un vistazo.                   |

### De interfaz

| Trampa                               | Qué pasa                                                                                                                                    |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| **`display:flex` contra `[hidden]`** | La regla de clase le gana a la hoja del navegador y el panel arranca abierto. Declarar `[hidden]` aparte.                                   |
| **Identificadores a la vista**       | Las citas son para verificar, no para leer. Se quitan del texto y las fuentes salen con su nombre.                                          |
| **Saludo repetido**                  | Un globo que reaparece cada rato es un banner: tapa contenido y a quien usa lector de pantalla le interrumpe. **Una vez por sesión** basta. |

---

## 6. Requerimientos mínimos

### Del cliente, sin los cuales no se arranca

1. **Alguien que escriba y apruebe el corpus.** Con nombre y apellido.
2. **Las fuentes**, aunque estén desordenadas.
3. **Un canal de derivación** —formulario, correo, WhatsApp— al que mandar lo
   que el asistente no responde.
4. **Decisión sobre lo que no se dice**: precios, plazos, comparaciones.
5. **Cuentas propias** de modelo y hosting, a su nombre y a su cargo.

### Técnicos

- Un dominio o subdominio para el asistente.
- La lista de dominios desde los que se va a consultar.
- Poder añadir una línea `<script>` al sitio. Si el sitio lo maneja un tercero,
  **confirmarlo antes de vender**.

---

## 7. Qué se le entrega

| Entregable                                     | Por qué importa                                                                                                                                                                                        |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| El asistente andando, con la marca del cliente | Lo obvio                                                                                                                                                                                               |
| **Informe de evaluación**                      | Acierto de recuperación, tasa de abstención correcta y resultado del set de ataques, sobre _sus_ preguntas. **Es el diferenciador**: se le entrega al cliente la prueba de que su asistente no miente. |
| **Manual de redacción de la base**             | Le permite mantener su propio corpus. Suena a regalar el negocio; es al revés: quita el miedo a quedar atrapado y hace que firmen.                                                                     |
| Informe mensual de preguntas sin respuesta     | Justifica la suscripción con trabajo visible                                                                                                                                                           |
| Repositorio con el corpus versionado           | Cada cambio tiene autor, fecha y revisión                                                                                                                                                              |

---

## 8. Lista de comprobación de implantación

**Antes de firmar**

- [ ] Hay quién escriba y apruebe el corpus, con nombre.
- [ ] Existe canal de derivación.
- [ ] Se puede tocar el `<script>` del sitio.
- [ ] La facturación internacional del cliente pasa.

**Fase 0**

- [ ] Entrevista de alcance y las preguntas reales anotadas.
- [ ] Corpus redactado, con fuente y vigencia por documento.
- [ ] Reglas de contenido propias del cliente.
- [ ] Los tres conjuntos de evaluación.

**Antes de publicar**

- [ ] Los tres conjuntos pasan, con **cero fugas** en el de ataques.
- [ ] Umbrales calibrados con datos, no por conjetura.
- [ ] Lista de orígenes con el dominio real **y** las previews.
- [ ] Secreto de firma propio configurado.
- [ ] Aviso de privacidad y política de retención acordados.
- [ ] Probado con teclado, a 320 px y con el endpoint apagado a propósito.

**Después**

- [ ] Primer informe de preguntas sin respuesta a los 7 días.
- [ ] Revisión de documentos vencidos, mensual.
