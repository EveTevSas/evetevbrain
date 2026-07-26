import type { Metadata } from "next";
import { AuditPage } from "../../../components/portal-pages";

export const metadata: Metadata = { title: "Auditoría" };

export default function Page() {
  return <AuditPage />;
}
