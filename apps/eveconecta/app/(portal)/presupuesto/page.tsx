import type { Metadata } from "next";
import { BudgetPage } from "../../../components/portal-pages";

export const metadata: Metadata = { title: "Presupuesto" };

export default function Page() {
  return <BudgetPage />;
}
