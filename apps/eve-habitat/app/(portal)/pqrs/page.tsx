import type { Metadata } from "next";
import { CasesPage } from "../../../components/portal-pages";

export const metadata: Metadata = { title: "PQRS e incidencias" };

export default function Page() {
  return <CasesPage />;
}
