// app/(app)/calculator/scenarios/[id]/page.js
// Multi-scenario comparison viewer.

import { auth } from "@/auth";
import ScenarioClient from "./ScenarioClient";

export const metadata = {
  title: "Scenario Comparison",
  description: "Side-by-side financial scenario and strategy comparison.",
};

export default async function ScenarioDetailPage({ params }) {
  const session = await auth();
  const { id } = await params;
  return <ScenarioClient initialUser={session?.user} scenarioId={id} />;
}

