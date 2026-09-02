import { SeccionPendiente, TituloSeccion } from "@/components/seccion";

export default function ConciliacionPage() {
  return (
    <>
      <TituloSeccion
        titulo="Conciliación y ledger"
        descripcion="Lo cobrado cuadra con lo liquidado, y cada peso es reconstruible."
      />
      <SeccionPendiente
        fase="Fase E"
        criterios={[
          "Conciliación por comercio y rango, con histórico de corridas (CA-19)",
          "Estado de conciliación manual cuando el proveedor no da settlements (CA-20)",
          "Ledger con saldo reconstruido desde los asientos y alarma de descuadre (CA-21)"
        ]}
      />
    </>
  );
}
