import type { Metadata } from "next";
import { MaintenancePage } from "../../../components/portal-pages";

export const metadata: Metadata = { title: "Mantenimiento" };

export default function Page() {
  return <MaintenancePage />;
}
