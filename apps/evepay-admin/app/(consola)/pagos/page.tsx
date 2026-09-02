import { SeccionPendiente, TituloSeccion } from "@/components/seccion";

export default function PagosPage() {
  return (
    <>
      <TituloSeccion
        titulo="Pagos"
        descripcion="Todos los cobros de la pasarela, comercio por comercio."
      />
      <SeccionPendiente
        fase="Fase D"
        criterios={[
          "Listado cross-tenant con filtros y paginación (CA-15)",
          "Línea de tiempo: transiciones, webhooks recibidos y asientos ligados (CA-16)",
          "Reverificación manual contra el proveedor, auditada (CA-17, CA-18)"
        ]}
      />
    </>
  );
}
