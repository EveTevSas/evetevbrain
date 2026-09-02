import { SeccionPendiente, TituloSeccion } from "@/components/seccion";

export default function ComerciosPage() {
  return (
    <>
      <TituloSeccion
        titulo="Comercios"
        descripcion="Onboarding y ciclo de vida de los comercios de EvePay."
      />
      <SeccionPendiente
        fase="Fase B"
        criterios={[
          "Listado con estado del tenant, KYC del merchant y API keys (CA-6)",
          "Alta con tenant + merchant + claves mostradas una sola vez (CA-7)",
          "Paso manual del proveedor agregador señalado en el alta (CA-8)",
          "Rotación atómica de API keys (CA-9) y desactivación (CA-10)"
        ]}
      />
    </>
  );
}
