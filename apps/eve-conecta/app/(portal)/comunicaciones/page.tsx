import type { Metadata } from "next";
import { CommunicationsPage } from "../../../components/portal-pages";

export const metadata: Metadata = { title: "Comunicaciones" };

export default function Page() {
  return <CommunicationsPage />;
}
