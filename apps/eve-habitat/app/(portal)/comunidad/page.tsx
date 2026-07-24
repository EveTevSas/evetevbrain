import type { Metadata } from "next";
import { CommunityPage } from "../../../components/portal-pages";

export const metadata: Metadata = { title: "Comunidad" };

export default function Page() {
  return <CommunityPage />;
}
