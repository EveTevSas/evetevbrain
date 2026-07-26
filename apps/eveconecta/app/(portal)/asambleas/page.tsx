import type { Metadata } from "next";
import { AssembliesPage } from "../../../components/portal-pages";

export const metadata: Metadata = { title: "Asambleas" };

export default function Page() {
  return <AssembliesPage />;
}
