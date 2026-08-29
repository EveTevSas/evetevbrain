# Fase 2 — Básicos, diferenciadores y oportunidades no cubiertas

**Proyecto:** plataforma EVETEV para gestión de conjuntos residenciales  
**Fecha:** 18 de julio de 2026  
**Entrada:** [Fase 1 — Estado del arte](./FASE_1_ESTADO_DEL_ARTE.md)

## 1. Resumen ejecutivo

Una solución competitiva para propiedad horizontal en Colombia necesita resolver, como mínimo, administración financiera, cartera, comunicación, PQRS, reservas, portería, mantenimiento, asambleas y trazabilidad. Tener una app, usar códigos QR, aceptar PSE o enviar mensajes por WhatsApp ya no constituye por sí mismo una ventaja sostenible: estas funciones aparecen en varios competidores.

La oportunidad de diferenciación más defendible para EVETEV es construir una **plataforma de confianza operativa para propiedad horizontal**. Su promesa no sería simplemente “tener todo en un solo lugar”, sino:

> Cada peso, decisión, ingreso, solicitud y mantenimiento queda autorizado, explicado y trazable; la operación continúa aun cuando falla internet; y la copropiedad conserva el control de sus datos.

La propuesta se apoyaría en cinco pilares:

1. **transparencia verificable:** aprobaciones, evidencias, auditoría y rendición de cuentas comprensible;
2. **operación resiliente:** portería y emergencias con funcionamiento sin conexión y sincronización segura;
3. **inclusión digital:** app, web y canales sin instalación, con accesibilidad para adultos mayores y usuarios de baja alfabetización digital;
4. **datos abiertos y portables:** exportación completa, API e integraciones sin encerrar a la copropiedad;
5. **inteligencia responsable:** automatización financiera, mantenimiento predictivo e IA basada en documentos aprobados, siempre con control humano.

Estos pilares atacan vacíos observados en la oferta pública: los proveedores describen muchas funciones, pero pocos demuestran seguridad, continuidad, portabilidad, accesibilidad, gobierno de aprobaciones o calidad de implantación.

## 2. Usuarios que la solución debe atender

La aplicación no debe diseñarse únicamente para “el administrador”. Una copropiedad funciona como un sistema de actores con responsabilidades y niveles de autoridad diferentes.

| Rol                                    | Necesidad principal                                                                                       |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Administrador o empresa administradora | Operar una o varias copropiedades, recaudar, ejecutar presupuesto, controlar proveedores y rendir cuentas |
| Consejo de administración              | Aprobar, supervisar, comparar ejecución contra presupuesto y detectar excepciones                         |
| Contador                               | Mantener registros consistentes, conciliar, cerrar períodos y producir informes                           |
| Revisor fiscal o auditor               | Consultar evidencias y trazabilidad sin alterar la operación                                              |
| Propietario                            | Conocer su estado de cuenta, votar, autorizar y verificar la gestión de su patrimonio                     |
| Arrendatario o residente               | Acceder a servicios cotidianos sin ver información reservada al propietario                               |
| Portería o vigilancia                  | Validar ingresos, registrar novedades, correspondencia y emergencias con mínima fricción                  |
| Mantenimiento                          | Recibir órdenes, consultar activos, registrar materiales, tiempos, costos y evidencias                    |
| Proveedor o contratista                | Presentar documentos, cotizaciones, entregables, facturas y soportes de cumplimiento                      |
| Comité de convivencia                  | Gestionar casos sensibles con confidencialidad, debido proceso y trazabilidad                             |

La separación entre propietario, arrendatario y ocupante es fundamental. Una misma unidad puede tener varios residentes, autorizados temporales, apoderados y vehículos; los permisos deben depender de la relación vigente con la unidad y no de una cuenta genérica.

## 3. Elementos básicos de una solución competitiva

Los siguientes componentes constituyen **paridad mínima de mercado**. No todos necesitan liberarse el mismo día, pero el producto completo debe contemplarlos desde su modelo funcional para evitar reconstrucciones posteriores.

### 3.1 Plataforma multi-copropiedad y estructura organizacional

- aislamiento de datos por copropiedad;
- soporte para edificios, conjuntos de casas, copropiedades mixtas y etapas/torres;
- unidades privadas, depósitos, parqueaderos y bienes comunes;
- administración consolidada de varias copropiedades sin mezclar información;
- parametrización por reglamento, coeficientes, moneda, zonas y horarios;
- cambio de administración sin perder el historial institucional.

### 3.2 Identidad, roles y delegaciones

- perfiles distintos para administración, consejo, contador, auditor, portería, mantenimiento, residente y proveedor;
- permisos de mínimo privilegio y separación de funciones;
- autenticación reforzada para roles sensibles;
- poderes, suplencias y delegaciones con vigencia;
- altas y bajas ligadas a ocupación, contrato o período del cargo;
- registro de toda acción sensible.

### 3.3 Censo y expediente de la comunidad

- propietarios, arrendatarios, residentes, menores/dependientes y contactos de emergencia;
- mascotas, vehículos, bicicletas y parqueaderos;
- documentos con vencimiento y consentimiento de tratamiento de datos;
- importación masiva y validación de duplicados;
- historial de ocupación y relación entre personas y unidades;
- datos reservados con visibilidad diferenciada.

### 3.4 Finanzas, contabilidad y presupuesto

- generación masiva de cuotas ordinarias y extraordinarias por coeficiente o regla;
- intereses, descuentos, acuerdos de pago, multas debidamente autorizadas y otros conceptos;
- cartera por unidad, antigüedad de saldos, paz y salvos, recibos y estados de cuenta;
- ingresos, egresos, cuentas por pagar, caja menor, bancos, fondos y centros de costo;
- conciliación bancaria y trazabilidad entre cobro, pago y asiento;
- presupuesto aprobado, ejecución, desviaciones y proyecciones;
- PUC e informes contables aplicables al contexto colombiano;
- retenciones, soportes y exportación/integración con sistemas contables;
- cierre de períodos y correcciones controladas, sin borrar historia.

### 3.5 Recaudo y cobranza

- pagos por PSE y pasarelas locales, referencias identificables y conciliación automática;
- carga y validación de comprobantes para pagos por transferencia;
- recordatorios configurables por correo, push, SMS o WhatsApp;
- segmentación de cartera y gestión de cobro prejurídico/jurídico;
- acuerdos de pago y seguimiento de compromisos;
- comprobantes, reversos y manejo explícito de pagos parciales o no identificados;
- experiencia clara para múltiples propiedades asociadas a una persona.

### 3.6 Comunicaciones y gestión documental

- comunicados generales o segmentados por torre, rol, unidad o condición;
- entrega por varios canales con estado de envío, recepción y lectura;
- plantillas y programación de publicaciones;
- biblioteca de reglamentos, manuales, actas, contratos e informes;
- control de versiones, permisos, vencimientos y conservación;
- búsqueda completa y exportación;
- mensajes de emergencia separados de los comunicados ordinarios.

### 3.7 PQRS, convivencia e incidencias

- radicado único, categoría, prioridad, responsable y plazo;
- adjuntos, comentarios, historial y estados consistentes;
- acuerdos de nivel de servicio y alertas de vencimiento;
- visibilidad confidencial para casos de convivencia o datos sensibles;
- escalamiento, reapertura, encuesta de satisfacción y métricas;
- conexión con mantenimiento, seguridad, sanciones o proveedor cuando corresponda;
- expediente exportable con todas las actuaciones y evidencias.

### 3.8 Reservas y servicios comunes

- catálogo, horarios, capacidad, reglas, anticipación y límites por unidad;
- bloqueos por mantenimiento o evento;
- cobros, depósitos, multas y reembolsos;
- aprobación automática o manual;
- lista de invitados, código de ingreso y comprobante;
- prevención de cruces y reglas especiales por morosidad solo cuando sean legalmente procedentes;
- control de entrega y estado del espacio antes/después de su uso.

### 3.9 Portería, accesos, correspondencia y parqueaderos

- preautorización de visitantes, domiciliarios, proveedores y personal recurrente;
- QR o PIN de un solo uso, vigencia y verificación de identidad definida por política;
- ingreso/salida de personas y vehículos, lista de restricciones y alertas;
- correspondencia con fotografía opcional, notificación, custodia y prueba de entrega;
- minuta digital y relevo de turno;
- citofonía o comunicación segura sin exponer el teléfono del residente;
- parqueaderos de residentes y visitantes, reglas, cupos, turnos y recaudo;
- modo de emergencia y operación degradada cuando no hay conectividad.

### 3.10 Asambleas y gobierno

- convocatoria, agenda, documentos previos y confirmación de entrega;
- registro de asistentes, poderes y coeficientes;
- quórum dinámico y votación nominal o por coeficiente;
- modalidades presencial, virtual e híbrida;
- preguntas, proposiciones, decisiones y tareas derivadas;
- acta, anexos, resultados y evidencias de integridad;
- reuniones y aprobaciones de consejo separadas de la asamblea general;
- trazabilidad que permita revisar cómo y cuándo se tomó una decisión.

### 3.11 Activos, mantenimiento y proveedores

- inventario de equipos, zonas, garantías, manuales y repuestos;
- mantenimiento preventivo, correctivo e inspecciones;
- órdenes de trabajo con responsable, prioridad, tiempo, materiales, costo y evidencia;
- calendario y alertas por fecha, uso o condición;
- contratos, pólizas, certificados y documentos de proveedores con vencimiento;
- solicitudes de cotización, comparación, aprobación y evaluación del servicio;
- relación entre falla, activo, proveedor, gasto y presupuesto;
- indicadores de disponibilidad, reincidencia y costo total del activo.

### 3.12 Analítica, auditoría y rendición de cuentas

- paneles adecuados al rol, no un único tablero para todos;
- cartera, flujo de caja, presupuesto, PQRS, accesos y mantenimiento;
- historial inalterable de acciones críticas;
- comparación entre período, presupuesto y copropiedades administradas;
- exportación a formatos abiertos;
- informe de gestión generado desde datos trazables;
- alertas por excepciones, no solo acumulación de gráficos.

### 3.13 Seguridad, privacidad y continuidad

- cifrado en tránsito y reposo;
- aislamiento multiempresa, copias de seguridad verificadas y recuperación;
- retención y eliminación conforme a finalidad y política;
- consentimiento, atención de derechos del titular y registro de accesos a datos sensibles;
- gestión de sesiones, dispositivos, intentos anómalos y credenciales comprometidas;
- bitácora de incidentes y comunicación de brechas;
- objetivos públicos de disponibilidad y recuperación;
- pruebas de restauración, no solo creación de backups.

### 3.14 Integraciones y portabilidad

- API documentada y webhooks;
- PSE/pasarelas, bancos, Siigo u otros sistemas contables;
- correo, push, SMS y WhatsApp mediante proveedores intercambiables;
- hardware de acceso desacoplado del sistema central;
- importación y exportación completa, incluidos adjuntos e historial;
- paquete de salida que permita a la copropiedad migrar sin depender del proveedor.

## 4. Diferenciadores encontrados en las soluciones investigadas

| Solución       | Diferenciadores observados                                                                | Aprendizaje aplicable                                                                         |
| -------------- | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| MisCondominios | Incidencias simples con historial; transparencia financiera directa al propietario        | La claridad de un flujo puede ser más valiosa que una lista extensa de módulos                |
| CondomiSOFT    | Fondos y cuentas múltiples; consumo medido; inventario; cámaras IP; reservas con cargo    | El modelo financiero debe contemplar excepciones reales y servicios cobrables                 |
| Vecinos360     | Continuidad de la historia, marca blanca, intranet propia y apoyo a licitaciones          | La información pertenece a la comunidad y debe sobrevivir al administrador                    |
| Edifito        | Profundidad de gastos, reportes, proveedores y operación administrativa; capacitación     | La implantación y el conocimiento sectorial forman parte del producto                         |
| Properix       | Contabilidad colombiana integrada, PSE, auditoría, apps por rol y asambleas completas     | Integrar los flujos evita doble digitación y pérdida de trazabilidad                          |
| ComunidadFeliz | Suite amplia, escala, IA aplicada a facturas/comunicados/reportes y asistentes            | La IA genera valor cuando actúa dentro de un proceso y sobre datos autorizados                |
| ConjuntosApp   | WhatsApp transaccional, perfil de mantenimiento, minuta, parqueaderos y reportes con IA   | Los roles operativos y los canales cotidianos deben tener recorridos propios                  |
| PH Fácil       | Plan gratuito, precio transparente, PQRS formal, Siigo e información técnica de seguridad | La confianza comercial también se construye reduciendo incertidumbre de precio e implantación |

### Diferenciadores que están convirtiéndose en básicos

No conviene posicionar la nueva solución exclusivamente alrededor de los siguientes elementos, porque son fáciles de imitar o ya están presentes en varias ofertas:

- aplicación móvil o diseño adaptable;
- códigos QR para visitantes;
- reservas de zonas comunes;
- PSE o una pasarela de pagos;
- comunicados por WhatsApp;
- PQRS con número de radicado;
- asambleas y votaciones digitales;
- chatbot genérico o redacción de mensajes con IA;
- la expresión comercial “todo en uno”.

Estos componentes deben existir, pero la ventaja competitiva debe provenir de cómo se conectan, se verifican y siguen funcionando bajo condiciones reales.

## 5. Necesidades poco cubiertas y oportunidades de diferenciación

La calificación de cobertura se refiere a la evidencia pública de las ocho soluciones estudiadas, no a una auditoría interna de sus productos.

| Oportunidad                                    | Cobertura observada | Propuesta para EVETEV                                                                                                                                       | Valor generado                                                           | Prioridad sugerida |
| ---------------------------------------------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ------------------ |
| Transparencia verificable y control antifraude | Parcial             | Doble aprobación configurable, segregación de funciones, bitácora inalterable, soporte obligatorio, presupuesto vs. ejecución y expediente de cada decisión | Reduce errores, abuso y discusiones; facilita consejo y auditoría        | Muy alta           |
| Portería sin conexión y continuidad operativa  | No evidenciada      | Caché cifrada de autorizaciones vigentes, registro offline, sincronización idempotente, modo de contingencia y prueba periódica                             | El acceso no se detiene por caída de internet o nube                     | Muy alta           |
| Portabilidad y API abierta                     | Casi no evidenciada | Exportación completa y legible, API, webhooks, conectores reemplazables y paquete de salida contractual                                                     | Elimina temor a dependencia y facilita integraciones                     | Muy alta           |
| Seguridad y privacidad demostrables            | Débil/heterogénea   | Centro de confianza, cifrado, MFA/passkeys, matriz de controles, historial de incidentes, RTO/RPO y pruebas de restauración                                 | Convierte seguridad en argumento verificable, no promesa                 | Muy alta           |
| Inclusión y acceso sin instalar app            | Parcial             | PWA, web, WhatsApp, correo/SMS, modo de texto grande, lector de pantalla, lenguaje claro y delegación a cuidador                                            | Aumenta adopción entre adultos mayores y usuarios con barreras digitales | Muy alta           |
| Gobierno y debido proceso                      | Parcial             | Flujos parametrizables para aprobaciones, multas, descargos, conflictos, poderes y evidencia de notificación                                                | Reduce riesgo legal y decisiones informales                              | Alta               |
| Ciclo de vida de activos                       | Parcial             | Activo → inspección → orden → cotización → aprobación → gasto → garantía, con QR físico e historial de costo                                                | Previene fallas y permite decidir reparar o reemplazar                   | Alta               |
| Compras y proveedores transparentes            | Parcial             | Portal de proveedor, documentos vigentes, varias ofertas, criterios comparables, conflicto de interés y evaluación                                          | Mejora precio, cumplimiento y confianza del residente                    | Alta               |
| Emergencias y seguridad comunitaria            | Poco evidenciada    | Protocolos, alertas multicanal, confirmación de estado, contactos, puntos de encuentro y bitácora posterior                                                 | Coordina respuesta ante incendio, sismo, inundación o falla crítica      | Alta               |
| Inteligencia financiera explicable             | Poco evidenciada    | Pronóstico de caja, riesgo de mora, escenarios presupuestales y recomendaciones con explicación                                                             | Permite anticipar déficit sin delegar decisiones a una “caja negra”      | Media-alta         |
| IA basada en fuentes aprobadas                 | Parcial             | Asistente que responda citando reglamento, actas y manuales; redacte pero no publique ni apruebe sin autorización                                           | Reduce consultas repetitivas preservando control y contexto              | Media-alta         |
| Sostenibilidad y consumos                      | Muy limitada        | Agua/energía/residuos, fugas, metas, paneles solares, cargadores eléctricos y reparto de consumos                                                           | Reduce costos y prepara nuevas necesidades de copropiedad                | Media              |

## 6. Núcleo diferenciador recomendado

Intentar diferenciar doce módulos al mismo tiempo diluiría la propuesta. Se recomienda concentrar el primer posicionamiento en seis capacidades conectadas.

### 6.1 Libro de confianza de la copropiedad

Cada evento relevante —cobro, pago, gasto, contrato, aprobación, voto, ingreso, PQRS o mantenimiento— conserva actor, fecha, estado anterior/nuevo y evidencia. La interfaz traduce esa auditoría a una explicación comprensible para residente, consejo y auditor.

No se propone usar blockchain: una bitácora append-only, controles de integridad, sellado de tiempo y copias verificables resuelven el problema con menor complejidad.

### 6.2 Aprobaciones y segregación de funciones

Las reglas dependerían del monto, categoría o riesgo. Ejemplos:

- quien crea un proveedor no puede aprobar su primer pago;
- un gasto por encima del umbral requiere consejo y soporte;
- una corrección contable conserva el registro original y su justificación;
- una minuta cerrada solo se corrige mediante adenda;
- una decisión sensible requiere quórum, evidencia y período de vigencia.

### 6.3 Portería resiliente y segura

La portería debe ser la experiencia más rápida del sistema y tolerar conectividad intermitente. Autorizaciones vigentes, listas críticas y reglas mínimas se conservan cifradas en el dispositivo; los eventos se sincronizan al recuperar conexión sin duplicarse. El sistema diferencia una contingencia autorizada de una omisión de control.

### 6.4 Experiencia inclusiva y multicanal

El residente elige canal sin perder trazabilidad. Una reserva iniciada por WhatsApp aparece en el mismo historial que una creada en web; una notificación urgente puede escalar de push a SMS; un propietario puede delegar acciones cotidianas sin ceder voto ni información financiera.

### 6.5 Datos portables y ecosistema abierto

La copropiedad puede descargar en cualquier momento su censo, cartera, contabilidad, documentos, PQRS, votaciones, accesos y auditoría en formatos abiertos. Las integraciones usan contratos versionados y proveedores intercambiables, evitando que WhatsApp, pagos o hardware determinen la arquitectura del producto.

### 6.6 Inteligencia con evidencia y aprobación humana

La IA puede clasificar PQRS, extraer campos de facturas, proponer respuestas, resumir gestión y detectar anomalías. Toda salida muestra su fuente, nivel de confianza y quién la aprobó. No debe pagar, sancionar, negar un acceso, contabilizar definitivamente ni publicar decisiones sin control humano.

## 7. Propuesta de valor por rol

| Rol                   | Promesa concreta                                                                         |
| --------------------- | ---------------------------------------------------------------------------------------- |
| Administrador         | Menos reproceso y una rendición de cuentas generada desde evidencia real                 |
| Consejo               | Ver y aprobar excepciones sin revisar carpetas, chats y hojas de cálculo                 |
| Contador              | Operación conciliada y cambios controlados, con integración en lugar de doble digitación |
| Auditor/revisor       | Acceso de solo lectura a decisiones, soportes y trazabilidad completa                    |
| Residente/propietario | Saber qué debe, qué se decidió y qué pasó con su solicitud en lenguaje claro             |
| Portería              | Autorizar y registrar en segundos, incluso con conectividad intermitente                 |
| Mantenimiento         | Conocer el activo, la prioridad y el historial antes de intervenirlo                     |
| Proveedor             | Entregar documentos, ofertas y evidencias por un canal formal y medible                  |

## 8. Alcance funcional recomendado

### Base obligatoria para competir

1. multi-copropiedad, censo y roles;
2. cuotas, cartera, pagos, presupuesto y estados de cuenta;
3. comunicaciones y documentos;
4. PQRS/incidencias;
5. reservas;
6. visitantes, correspondencia y minuta;
7. mantenimiento y proveedores;
8. asambleas, consejo y votaciones;
9. reportes, auditoría y exportación;
10. seguridad, privacidad y continuidad.

### Diferenciación que debe nacer con el producto

1. bitácora de confianza;
2. aprobaciones y segregación de funciones;
3. portería offline-first;
4. accesibilidad y experiencia multicanal;
5. exportación integral y API;
6. seguridad y recuperación públicamente documentadas.

### Expansiones posteriores de alto valor

1. contabilidad colombiana más profunda o conectores contables avanzados;
2. compras/licitaciones y cumplimiento documental de proveedores;
3. mantenimiento predictivo e IoT;
4. inteligencia financiera y detección de anomalías;
5. asistente documental con IA;
6. sostenibilidad, consumos y movilidad eléctrica.

La secuencia exacta, dependencias y criterios de liberación corresponden a la Fase 3.

## 9. Riesgos de producto que deben evitarse

- construir un “ERP enorme” antes de validar los recorridos cotidianos;
- usar IA como sustituto de controles o conocimiento legal;
- obligar a todos los residentes a instalar una app;
- depender de conexión permanente en portería;
- ligar el producto a un único proveedor de pagos, mensajería o hardware;
- permitir personalizaciones por cliente que rompan el producto común;
- presentar transparencia como muchos gráficos sin soportes ni explicaciones;
- mezclar información de propietario, residente, consejo y portería;
- publicar afirmaciones de seguridad o cumplimiento que no puedan demostrarse;
- medir éxito por usuarios registrados en vez de procesos completados y problemas resueltos.

## 10. Indicadores que validarían la diferenciación

| Objetivo                  | Indicadores útiles                                                                                     |
| ------------------------- | ------------------------------------------------------------------------------------------------------ |
| Eficiencia administrativa | Tiempo de conciliación, cierre, informe de gestión y atención de PQRS                                  |
| Confianza                 | Porcentaje de gastos con soporte/aprobación completa; excepciones de auditoría; consultas aclaratorias |
| Recaudo                   | Cartera vencida, días promedio de pago, pagos no identificados y acuerdos cumplidos                    |
| Operación                 | Tiempo de ingreso en portería, eventos offline sincronizados y duplicados/conflictos                   |
| Mantenimiento             | Cumplimiento preventivo, reincidencia, tiempo fuera de servicio y costo por activo                     |
| Inclusión                 | Residentes activos por cualquier canal, no solo app; éxito por segmento de edad/capacidad              |
| Calidad                   | Disponibilidad, restauraciones probadas, incidentes, tiempo de recuperación y errores por flujo        |
| Portabilidad              | Exportaciones completas exitosas y tiempo requerido para entregar un paquete de salida                 |

## 11. Decisión de producto recomendada

Se recomienda posicionar EVETEV como:

> **El sistema operativo confiable para la propiedad horizontal en Colombia: transparente, resiliente, inclusivo y abierto.**

El producto debe igualar a los líderes en las operaciones básicas, pero competir especialmente en aspectos que hoy aparecen poco demostrados: control de decisiones y dinero, continuidad de portería, seguridad verificable, accesibilidad, portabilidad e inteligencia explicable.

Esta dirección es más sostenible que competir solo por cantidad de módulos o precio. También crea una arquitectura conceptual clara para la Fase 3: cada épica deberá contribuir a operar, demostrar o proteger la confianza de la copropiedad.

## 12. Cierre de la Fase 2

La Fase 2 entrega:

- los elementos básicos que debe cubrir la solución;
- los diferenciadores encontrados en los ocho competidores;
- la separación entre ventajas actuales y funciones que ya son básicas;
- doce oportunidades poco cubiertas;
- seis capacidades recomendadas como núcleo diferenciador;
- una propuesta de valor y métricas de validación.

No se ha iniciado el plan técnico, la selección de arquitectura ni el desarrollo. Esas decisiones pertenecen a la Fase 3 y deberán incorporar los estándares de ingeniería de EVETEV después de la aprobación de esta fase.
