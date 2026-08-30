import { redirect } from "next/navigation";

// La aplicación abre en el dashboard: es la vista que responde "cómo va el mes"
// de un vistazo. La lista de cierres, que antes vivía aquí, tiene ahora su
// propia dirección en /cierres.
export default function HomePage() {
  redirect("/dashboard");
}
