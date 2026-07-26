import type { Metadata } from "next";
import { GatehousePage } from "../../../components/portal-pages";

export const metadata: Metadata = { title: "Portería" };

export default function Page() {
  return <GatehousePage />;
}
