"use client";
// components/invoices/InvoiceWorkspace.js
// Loads a browser draft (or a fresh draft) and mounts the editor. The store is
// intentionally client-only in Stage 1, so loading happens after mount.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FileQuestion, Plus } from "lucide-react";
import Button from "@/components/ui/Button";
import PageSkeleton from "@/components/ui/PageSkeleton";
import InvoiceEditor from "./InvoiceEditor";
import { createEmptyInvoice } from "@/lib/invoices/factories";
import {
  getDraft,
  readInvoiceSettings,
  saveInvoiceSettings,
} from "@/lib/invoices/localDrafts";
import { invoiceSettingsFromUserSettings } from "@/lib/settings/defaults";

export default function InvoiceWorkspace({ id = null }) {
  const router = useRouter();
  const [state, setState] = useState({
    ready: false,
    invoice: null,
    settings: null,
    missing: false,
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      // Server-stored invoice defaults are authoritative; the local copy stays
      // as an offline fallback for this browser.
      let settings = readInvoiceSettings();
      try {
        const res = await fetch("/api/user/settings");
        if (res.ok) {
          const json = await res.json();
          if (json?.settings) {
            settings = saveInvoiceSettings(
              invoiceSettingsFromUserSettings(json.settings)
            );
          }
        }
      } catch {
        // Keep the browser copy when the network is unavailable.
      }
      if (cancelled) return;

      if (!id) {
        setState({
          ready: true,
          invoice: createEmptyInvoice(settings),
          settings,
          missing: false,
        });
        return;
      }
      const draft = getDraft(id);
      setState({
        ready: true,
        invoice: draft,
        settings,
        missing: !draft,
      });
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (!state.ready) return <PageSkeleton cards={0} rows={6} />;

  if (state.missing) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-20 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--color-surface-2)] text-[var(--color-text-tertiary)]">
          <FileQuestion className="h-6 w-6" aria-hidden="true" />
        </div>
        <h1 className="mt-4 text-lg font-semibold text-[var(--color-text-primary)]">
          Draft not found
        </h1>
        <p className="mt-1 text-sm leading-relaxed text-[var(--color-text-secondary)]">
          This draft is not stored in this browser. It may have been deleted,
          or it may have been created in a different browser profile.
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push("/invoices")}
          >
            Back to invoices
          </Button>
          <Button
            type="button"
            icon={Plus}
            onClick={() => router.push("/invoices/new")}
          >
            New invoice
          </Button>
        </div>
      </div>
    );
  }

  return (
    <InvoiceEditor
      key={state.invoice.id}
      initialInvoice={state.invoice}
      settings={state.settings}
      mode={id ? "edit" : "create"}
    />
  );
}
