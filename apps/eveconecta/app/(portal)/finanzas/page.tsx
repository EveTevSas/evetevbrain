import type { Metadata } from "next";
import { FinancesPage } from "../../../components/portal-pages";

export const metadata: Metadata = { title: "Finanzas" };

export default function Page() {
  return <FinancesPage />;
}
