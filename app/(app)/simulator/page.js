// app/(app)/simulator/page.js
// Wealth Simulator & Future Self — Server component entry point.

import { auth } from "@/auth";
import SimulatorClient from "./SimulatorClient";

export const metadata = {
  title: "Wealth Simulator & Future Self",
  description: "Project future net worth, investment compounding, and scenario trade-offs.",
};

export default async function SimulatorPage() {
  const session = await auth();
  return <SimulatorClient initialUser={session?.user} />;
}
