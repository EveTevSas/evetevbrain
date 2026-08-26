import { resumenCartera } from "@/lib/cartera";
import CarteraClient from "./CarteraClient";

export const dynamic = "force-dynamic";

export default async function CarteraPage() {
  const clientes = await resumenCartera();
  return <CarteraClient clientes={clientes} />;
}
