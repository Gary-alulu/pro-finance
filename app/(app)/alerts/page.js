// app/(app)/alerts/page.js
import AlertsClient from "./AlertsClient";

export const metadata = {
  title: "Context-Aware Alerts",
  description: "Smart notifications based on saved records, thresholds and rules.",
};

export default function AlertsPage() {
  return <AlertsClient />;
}
