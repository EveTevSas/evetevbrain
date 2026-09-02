import { SeccionPendiente, TituloSeccion } from "@/components/seccion";

export default function ProveedoresPage() {
  return (
    <>
      <TituloSeccion
        titulo="Proveedores de pago"
        descripcion="La adquirencia detrás de PaymentProvider: quién está activo y en qué estado."
      />
      <SeccionPendiente
        fase="Fase C"
        criterios={[
          "Proveedor activo (fake · akua · combopay), credenciales presentes y capacidades (CA-11)",
          "Prueba de salud real contra el proveedor (CA-12)",
          "Checklist de habilitación — arranca con los pasos T6 de ComboPay (CA-13)",
          "Proveedor de origen visible en el histórico de cada cobro (CA-14)"
        ]}
      />
    </>
  );
}
