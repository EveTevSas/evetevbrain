import type { Metadata } from "next";

import { Cabecera } from "@/app/cabecera";
import { Pie } from "@/app/pie";

/* Cómo se escribe el blog, contado a quien lo lee.
 *
 * En contenido de salud la confianza no la da el tono sino el método, y este
 * método tiene dos cosas que decir sin rodeos: que quien publica también vende,
 * y que los artículos se redactan con inteligencia artificial. Lo segundo no se
 * esconde. Que un artículo suene humano es una cuestión de estilo; ocultar cómo
 * se hace sería engañar sobre justo aquello que pedimos que se crea — que lo que
 * decimos está comprobado. */
export const metadata: Metadata = {
  title: "Cómo escribimos · Eve-Orígenes",
  description:
    "Quién publica Eve-Orígenes, cómo se eligen y comprueban las fuentes, qué no afirmamos nunca y cómo avisarnos de un error."
};

export default function PoliticaEditorial() {
  return (
    <>
      <Cabecera />
      <main className="mx-auto max-w-3xl px-6 py-14">
        <p className="text-xs font-semibold uppercase tracking-widest text-petroleo">
          Eve-Orígenes
        </p>
        <h1 className="mt-2 font-display text-4xl font-bold text-oliva sm:text-5xl">
          Cómo escribimos
        </h1>

        <div className="prosa mt-8">
          <h2>Quién publica y qué vende</h2>
          <p>
            Eve-Orígenes es de Evetev S.A.S., una empresa colombiana que también vende productos de
            cuidado de la piel y vida saludable. Algunos aparecen en los artículos, con su nombre y
            su precio. Te lo decimos arriba de cada artículo porque tienes derecho a saberlo antes
            de seguir leyendo.
          </p>

          <h2>Cómo se hace un artículo</h2>
          <p>
            Los artículos se redactan con ayuda de inteligencia artificial. No se publican porque
            estén bien escritos: se publican si superan tres comprobaciones, y si fallan una no
            salen.
          </p>
          <ol>
            <li>
              Cada afirmación va atada a una fuente concreta, y de cada fuente se guarda la frase
              exacta que la sostiene.
            </li>
            <li>
              Un programa abre cada fuente y comprueba que esa frase esté de verdad en la página.
            </li>
            <li>
              Un revisor independiente, que no escribió el texto, contrasta cada afirmación con su
              fuente. Si una frase exagera lo que dice el estudio, se corrige o se quita.
            </li>
          </ol>

          <h2>Qué fuentes usamos</h2>
          <p>
            Preferimos, en este orden: revisiones científicas, estudios publicados, instituciones
            sanitarias o de investigación, periodismo especializado y, solo para completar, la
            opinión de expertos. Cada artículo necesita al menos tres fuentes, y al menos dos de las
            primeras tres categorías.
          </p>

          <h2>Lo que no hacemos</h2>
          <ul>
            <li>
              No atribuimos a un cosmético propiedades curativas o terapéuticas. Un cosmético no
              trata enfermedades, y la norma andina que los regula lo prohíbe.
            </li>
            <li>No enlazamos a la compra de suplementos dietarios.</li>
            <li>
              No recomendamos un producto para un uso que la evidencia no respalda, aunque lo
              vendamos.
            </li>
            <li>Cuando la evidencia es escasa o se contradice, lo decimos así.</li>
          </ul>

          <h2>Si encuentras un error</h2>
          <p>
            Escríbenos a <a href="mailto:contacto@evetev.com">contacto@evetev.com</a> con el enlace
            del artículo y lo que está mal. Si tienes razón, lo corregimos y la fecha de revisión
            del artículo lo refleja.
          </p>
        </div>
      </main>
      <Pie />
    </>
  );
}
