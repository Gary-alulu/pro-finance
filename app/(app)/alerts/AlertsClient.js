"use client";
// app/(app)/alerts/AlertsClient.js
import { useState, useEffect, useCallback } from "react";
import { Bell, AlertTriangle } from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

export default function AlertsClient() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState(null);

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch("/api/alerts/context-aware");
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.alerts || []);
        setInfo(data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const refresh = () => {
    setLoading(true);
    fetchAlerts();
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)] flex items-center gap-2">
            <Bell className="h-6 w-6" /> Context-Aware Alerts
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Alerts based on saved records, user-defined thresholds and transparent rules.
          </p>
        </div>
        <Button onClick={refresh} loading={loading}>Refresh</Button>
      </div>

      {info && <p className="text-xs text-[var(--color-text-tertiary)]">{info.note}</p>}

      <Card>
        <div className="p-6 space-y-4">
          {alerts.length === 0 && !loading && <p className="text-sm text-[var(--color-text-secondary)]">No alerts at this time.</p>}
          {alerts.map((alert, idx) => (
            <div key={idx} className="border-b pb-4 last:border-b-0 last:pb-0 flex gap-3">
              <AlertTriangle className={`h-5 w-5 ${alert.severity === 'high' ? 'text-red-500' : 'text-yellow-500'}`} />
              <div className="flex-1">
                <p className="font-medium">{alert.title}</p>
                <p className="text-sm text-[var(--color-text-secondary)] mt-1">{alert.message}</p>
                <p className="text-xs text-[var(--color-text-tertiary)] mt-1">Rule: {alert.rule} | Based on: {alert.basedOn}</p>
                {alert.actionHref && <a href={alert.actionHref} className="text-xs text-[var(--color-accent)] hover:underline mt-1 inline-block">Take action →</a>}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
