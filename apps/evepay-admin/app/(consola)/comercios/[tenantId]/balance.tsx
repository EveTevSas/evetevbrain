import type { BalanceComercio } from "@/lib/api/evepay";
import { formatoMonto } from "@/lib/formato";

function Dato({
  etiqueta,
  valor,
  destacado,
  tono
}: {
  etiqueta: string;
  valor: number;
  destacado?: boolean;
  tono?: "rojo" | "verde";
}) {
  const color = tono === "rojo" ? "#B91C1C" : tono === "verde" ? "#15803D" : "#0A2540";
  return (
    <div>
      <div
        style={{ fontSize: "0.67rem", fontWeight: 700, color: "#94A3B8", letterSpacing: "0.04em" }}
      >
        {etiqueta.toUpperCase()}
      </div>
      <div
        style={{
          fontSize: destacado ? "1rem" : "0.85rem",
          fontWeight: destacado ? 700 : 400,
          color,
          marginTop: "0.15rem",
          fontVariantNumeric: "tabular-nums"
        }}
      >
        {formatoMonto(valor, "COP")}
      </div>
    </div>
  );
}

/**
 * Balance del comercio (spec `ledger-custodia`, CA-9): reconstruido desde las
 * líneas del ledger con el signo de la naturaleza de cada cuenta. Dice de
 * quién es cada peso: cuánto se le debe al comercio, cuánto es de EvePay,
 * cuánto de la DIAN, cuánto costó el proveedor, y dónde está el dinero.
 */
export function Balance({ balance, proveedor }: { balance: BalanceComercio; proveedor: string }) {
  return (
    <div>
      <h2 style={{ margin: "0 0 1.1rem", fontSize: "0.98rem", color: "#0A2540" }}>Balance</h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: "1.1rem"
        }}
      >
        <Dato etiqueta="Por pagar al comercio" valor={balance.porPagar} destacado />
        <Dato etiqueta="Comisión EvePay" valor={balance.comision} />
        <Dato etiqueta="IVA por pagar (DIAN)" valor={balance.ivaPorPagar} />
        <Dato etiqueta={`Costo ${proveedor}`} valor={balance.costoProveedor} />
        <Dato
          etiqueta="Margen EvePay"
          valor={balance.margen}
          destacado
          tono={balance.margen < 0 ? "rojo" : "verde"}
        />
        <Dato etiqueta="En tránsito (nos debe el proveedor)" valor={balance.enTransito} />
        <Dato etiqueta="En la cuenta de recaudo" valor={balance.enRecaudo} />
        {balance.porPagarProveedor > 0 && (
          <Dato etiqueta={`Por pagar a ${proveedor}`} valor={balance.porPagarProveedor} />
        )}
      </div>
      <p style={{ margin: "1rem 0 0", fontSize: "0.74rem", color: "#94A3B8", lineHeight: 1.5 }}>
        Reconstruido desde el ledger, con el signo de la naturaleza de cada cuenta: lo que se le
        debe al comercio y a la DIAN son pasivos, la comisión un ingreso, el costo un gasto, y el
        dinero en tránsito o en recaudo, activos.
      </p>
    </div>
  );
}
