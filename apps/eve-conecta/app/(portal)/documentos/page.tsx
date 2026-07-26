import type { Metadata } from "next";
import { DocumentsPage } from "../../../components/portal-pages";

export const metadata: Metadata = { title: "Documentos" };

export default function Page() {
  return <DocumentsPage />;
}
