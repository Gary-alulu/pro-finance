// app/(app)/projections/page.js
import ProjectionsClient from "./ProjectionsClient";

export const metadata = {
  title: "Wealth Projections",
  description: "Scenario analysis and wealth projections with deterministic calculations.",
};

export default function ProjectionsPage() {
  return <ProjectionsClient />;
}
