# Modelo de negocio — asistente RAG

Qué cuesta operar un asistente, qué paga el cliente y qué cobramos nosotros. Los
costos salen de **mediciones de nuestro propio asistente en producción** y de
tarifas publicadas; los supuestos van marcados como tales.

> Cómo se construye: [`PLAYBOOK_ASISTENTE_RAG.md`](./PLAYBOOK_ASISTENTE_RAG.md).
> Dólar de referencia: **$4.000 COP**. Ajústalo antes de cotizar.

---

## 1. Lo que cuesta una respuesta, medido

De peticiones reales a producción, no de estimaciones:

|                          | Observado     | Trabajo   |
| ------------------------ | ------------- | --------- |
| Tokens de entrada        | 1.272 – 1.740 | **1.400** |
| Tokens de salida         | 66 – 140      | **105**   |
| Embedding de la consulta | ~25 tokens    | 25        |
| Latencia total           | 2,3 – 4,4 s   | —         |

Con las tarifas de `kimi-k2.6` (US$0,60/M entrada · US$2,50/M salida) y
`text-embedding-v4` (US$0,07/M):

| Concepto                   | USD                        |
| -------------------------- | -------------------------- |
| Entrada                    | 0,00084                    |
| Salida                     | 0,00026                    |
| Embedding                  | 0,0000018                  |
| **Por respuesta generada** | **≈ US$0,0011 ≈ $4,4 COP** |

**Las respuestas selladas, los temas vetados y las abstenciones cuestan cero.**
No llaman al modelo.

El caché de contexto reduce la entrada aún más —se observaron entre 512 y 1.331
tokens acertados por petición—, pero **los precios de aquí no lo cuentan**: es
mejor cotizar por lo alto y que la factura sorprenda para abajo.

### Reconstruir la base completa

Para un corpus de ~400 fragmentos, incluida la contextualización:

| Concepto                            | USD                        |
| ----------------------------------- | -------------------------- |
| Contextualización (400 llamadas)    | 0,44                       |
| Embeddings del corpus               | 0,02                       |
| **Por versión completa de la base** | **≈ US$0,46 ≈ $1.850 COP** |

Se paga cada vez que el corpus cambia entero. Es ruido en la factura.

---

## 2. El costo mensual del cliente

_Supuesto declarado:_ 5 mensajes por conversación, de los cuales **la mitad se
resuelven sin modelo** (selladas, temas vetados, abstenciones). Da ~2,5
respuestas generadas por conversación. Todavía **no está medido con tráfico
real** — es lo primero que hay que corregir con datos del primer cliente.

| Conversaciones/mes | Modelo (USD) | Modelo (COP) |
| ------------------ | ------------ | ------------ |
| 500                | 1,4          | $5.600       |
| 2.000              | 5,6          | $22.400      |
| 10.000             | 28           | $112.000     |
| 50.000             | 140          | $560.000     |

### Infraestructura

| Servicio              | USD/mes               | Nota                                                                                                                                                                                                        |
| --------------------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vercel **Pro**        | 20                    | **Obligatorio**: el plan gratuito es de uso personal y no comercial, y su tope de despliegues bloquea el trabajo de un día normal — lo sufrimos tres veces montando el nuestro. Incluye 1M de invocaciones. |
| Postgres administrado | 25                    | Para el registro de eventos y el bucle de mejora. Se puede aplazar en el arranque.                                                                                                                          |
| **Piso mensual**      | **45 ≈ $180.000 COP** |                                                                                                                                                                                                             |

### El dato que decide el modelo de cobro

**La infraestructura pesa más que el modelo hasta unas 15.000 conversaciones al
mes.** A 2.000 conversaciones, el modelo son US$5,6 contra US$45 de piso: el
costo marginal de una conversación es despreciable.

Cobrar por conversación o por token sería cobrar por lo que no cuesta. **Se cobra
por el trabajo de la base y por la garantía**, que es donde está el valor y el
esfuerzo.

---

## 3. Quién paga qué

**Los recurrentes son del cliente, a su nombre.** No es solo comercial: son sus
datos y sus llaves, y así no queda atado a nosotros ni nosotros custodiando lo
suyo.

|                                     | A cargo del cliente | A cargo nuestro |
| ----------------------------------- | ------------------- | --------------- |
| Cuenta del modelo y embeddings      | ✅                  |                 |
| Hosting y base de datos             | ✅                  |                 |
| Dominio                             | ✅                  |                 |
| Implantación y redacción del corpus |                     | ✅              |
| Evaluación y calibración            |                     | ✅              |
| Mantenimiento e informes            |                     | ✅              |

### Dos formas de montarlo

|                   | **A — cuentas del cliente**              | **B — alojado por nosotros**        |
| ----------------- | ---------------------------------------- | ----------------------------------- |
| Infraestructura   | Suya, a su nombre                        | Nuestra, multi-cliente              |
| Piso mensual      | ~US$45 suyos                             | Amortizado entre clientes           |
| Custodia de datos | Suya                                     | Nuestra, con lo que eso implica     |
| Nos exige         | Nada nuevo                               | Terminar el multi-cliente (fase 5)  |
| Para quién        | Empresa mediana, área de sistemas propia | Cliente pequeño, sin equipo técnico |

**Para los primeros clientes: modelo A.** No requiere trabajo nuevo, no nos hace
custodios de datos ajenos, y el piso de US$45 es asumible para quien puede pagar
la implantación. El B es la jugada de escala y llega cuando haya demanda que lo
justifique.

---

## 4. Qué cobramos

### El esfuerzo real, por fases

Horas del primer montaje. Para un cliente con documentación ya escrita, la
redacción baja mucho.

| Fase                                          | Horas       |
| --------------------------------------------- | ----------- |
| Entrevista de alcance e inventario de fuentes | 6 – 10      |
| **Redacción del corpus (30–60 documentos)**   | **20 – 40** |
| Conjuntos de evaluación                       | 6 – 10      |
| Configuración, marca del widget y despliegue  | 8 – 12      |
| Calibración e informe de evaluación           | 6 – 10      |
| **Total**                                     | **46 – 82** |

La redacción es la mitad del proyecto. Cuando alguien pida rebaja, **lo que se
recorta es el alcance del corpus**, no las guardas ni la evaluación.

### La fórmula

```
Implantación = horas × tarifa
Suscripción  = (4 a 8 horas/mes) × tarifa
```

_Ejemplo con una tarifa de referencia de $180.000 COP/hora — **cámbiala por la
tuya**, es el único número aquí que no está medido ni publicado:_

| Plan            | Alcance                                                            | Implantación | Suscripción    |
| --------------- | ------------------------------------------------------------------ | ------------ | -------------- |
| **Arranque**    | Hasta 40 documentos · un sitio · informe trimestral                | $8.500.000   | $750.000/mes   |
| **Estándar**    | Hasta 150 documentos · informe mensual · actualizaciones incluidas | $14.500.000  | $1.400.000/mes |
| **A la medida** | Corpus grande, integraciones, multi-sitio, varios idiomas          | Cotización   | Cotización     |

### Qué incluye la suscripción, para que se vea el trabajo

- Informe mensual de **preguntas sin respuesta**, agrupadas: cada grupo es un
  documento que falta.
- Actualización del corpus con esos hallazgos.
- Re-evaluación contra los tres conjuntos y reporte de métricas.
- Revisión de documentos vencidos.
- Soporte y ajustes de umbrales.

**Sin suscripción el asistente envejece**, y envejece afirmando cosas con
seguridad. Eso se dice en la venta, no se esconde.

---

## 5. Ganchos de promoción, con números que aguantan

Todos verificables; ninguno inventado.

- **«No inventa, y se lo demostramos.»** Cada respuesta cita el documento del que
  salió, y la cita se verifica en código antes de mostrarse. Al cierre se entrega
  el informe de evaluación sobre las preguntas del propio cliente.
- **«Cuando no sabe, lo dice.»** Si no encuentra respaldo, ni siquiera llama al
  modelo: responde que no lo tiene y pasa a una persona.
- **«Menos de $25.000 COP al mes de modelo para 2.000 conversaciones.»** Medido.
- **«Responde en dos segundos.»** Medido en producción, con el texto apareciendo
  frase a frase.
- **«Su base documental es suya.»** Se entrega escrita, versionada y con manual
  de redacción. No queda atrapado.
- **«Si el asistente falla, su sitio no se rompe»**: vuelve solo al formulario de
  contacto.
- **«Se instala con una línea»**, sin tocar el resto del sitio.

### Lo que NO se promete

Ni exactitud del 100%, ni que reemplace a una persona, ni que aprenda solo de
conversaciones. Un asistente anclado es tan bueno como su base — y esa es
justamente la parte que se vende.

---

## 6. Riesgos del negocio

| Riesgo                                           | Mitigación                                                                                                                                             |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **El cliente no tiene quién escriba el corpus**  | Es el que mata proyectos. Se detecta en la entrevista y **se rechaza el trabajo** o se cotiza la redacción completa.                                   |
| Espera un chatbot que lo sabe todo               | Se explican las seis capas en la primera reunión: la abstención es la característica, no la limitación.                                                |
| Cambia el precio del modelo                      | El motor está detrás de una interfaz: cambiar de proveedor es cambiar un archivo. La factura es del cliente, así que el riesgo es suyo y transparente. |
| El corpus envejece y nadie avisa                 | Fecha de vigencia obligatoria e informe mensual de vencidos.                                                                                           |
| El cliente quiere que responda cosas que no debe | Las reglas de contenido se acuerdan por escrito en la fase 0 y se comprueban en código.                                                                |
| Pide rebaja                                      | Se recorta el **alcance del corpus**. Nunca las guardas ni la evaluación: son el producto.                                                             |
