-- Búsqueda en español.
--
-- La función más usada de cualquier tienda y la peor atendida. Se resuelve con
-- Postgres y no con un servicio aparte: el catálogo tiene 25 productos, y meter
-- otra cosa que desplegar y mantener para eso sería pagar operación por un
-- problema que no existe. Se cambia cuando el catálogo lo pida, con una
-- medición encima.
--
-- **Sin tildes, o no sirve.** Nadie escribe «Ácido Hialurónico» en un buscador:
-- escribe «acido hialuronico». Con la configuración `spanish` a secas esa
-- consulta no encuentra nada, y el usuario concluye que no lo tenemos. Por eso
-- se compone una configuración propia que pasa `unaccent` ANTES del lematizador
-- español: así «hialuronico» y «hialurónico» acaban en el mismo lexema.

create extension if not exists unaccent with schema extensions;

-- Configuración propia. Se copia de `spanish` y se le antepone el diccionario
-- `unaccent` a cada tipo de token de palabra. El orden importa: unaccent
-- normaliza y pasa el resultado al stemmer, que es el que reduce «aceites» a
-- «aceit».
drop text search configuration if exists tienda.espanol;
create text search configuration tienda.espanol (copy = spanish);

alter text search configuration tienda.espanol
  alter mapping for hword, hword_part, word
  with extensions.unaccent, spanish_stem;

-- Aplanar los atributos exige una subconsulta, y Postgres no las admite dentro
-- de una columna generada. Se encapsula en una función IMMUTABLE, que sí puede
-- usarse: la inmutabilidad es cierta porque para un mismo jsonb devuelve
-- siempre el mismo texto.
create or replace function tienda.texto_atributos(a jsonb)
returns text language sql immutable as $$
  select coalesce(string_agg(value, ' '), '') from jsonb_each_text(coalesce(a, '{}'::jsonb))
$$;

-- El vector se guarda como columna generada: se recalcula solo en cada
-- escritura y no hay forma de que quede desincronizado del producto. Un
-- disparador que lo actualizara podría olvidarse en una ruta de escritura
-- nueva; una columna generada, no.
--
-- Los pesos ordenan la relevancia:
--   A  nombre y marca      — lo que la gente teclea
--   B  contenido y atributos — «250 ml», «piel grasa», «vegano»
--   C  descripción          — coincide, pero pesa menos
alter table tienda.producto
  add column if not exists busqueda tsvector
  generated always as (
    setweight(to_tsvector('tienda.espanol', coalesce(nombre, '')), 'A') ||
    setweight(to_tsvector('tienda.espanol', coalesce(marca, '')), 'A') ||
    setweight(to_tsvector('tienda.espanol', coalesce(contenido, '')), 'B') ||
    setweight(to_tsvector('tienda.espanol', tienda.texto_atributos(atributos)), 'B') ||
    setweight(to_tsvector('tienda.espanol', coalesce(descripcion, '')), 'C')
  ) stored;

create index if not exists producto_busqueda_idx on tienda.producto using gin (busqueda);
