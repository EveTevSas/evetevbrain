import type { Metadata } from "next";
import { ReservationsPage } from "../../../components/portal-pages";

export const metadata: Metadata = { title: "Reservas" };

export default function Page() {
  return <ReservationsPage />;
}
