"use client";
// app/(app)/journal/JournalClient.js
// Personal Financial Command Journal — Main Client Workspace.

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { BookOpen, Plus, Sparkles } from "lucide-react";
import JournalOverviewHeader from "@/components/journal/JournalOverviewHeader";
import JournalFilterBar from "@/components/journal/JournalFilterBar";
import JournalEntryCard from "@/components/journal/JournalEntryCard";
import EmptyState from "@/components/ui/EmptyState";
import SkeletonLoader from "@/components/ui/SkeletonLoader";

// Modals/drawers are deferred until the user opens them.
const JournalEntryModal = dynamic(
  () => import("@/components/journal/JournalEntryModal"),
  { ssr: false }
);
const JournalDetailDrawer = dynamic(
  () => import("@/components/journal/JournalDetailDrawer"),
  { ssr: false }
);

export default function JournalClient({ initialUser }) {
  const [entries, setEntries] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [categoryCounts, setCategoryCounts] = useState({});
  const [topTags, setTopTags] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters state
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedTag, setSelectedTag] = useState(null);
  const [statusFilter, setStatusFilter] = useState("active");
  const [followUpOnly, setFollowUpOnly] = useState(false);

  // Modals state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [detailEntry, setDetailEntry] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Fetch entries based on current filters
  const fetchEntries = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (selectedCategory && selectedCategory !== "all") params.set("category", selectedCategory);
      if (selectedTag) params.set("tag", selectedTag);
      if (statusFilter) params.set("status", statusFilter);
      if (followUpOnly) params.set("followUpOnly", "true");

      const [entriesRes, overviewRes] = await Promise.all([
        fetch(`/api/journal/entries?${params.toString()}`),
        fetch("/api/journal/overview"),
      ]);

      if (entriesRes.ok) {
        const data = await entriesRes.json();
        setEntries(data.entries || []);
      }

      if (overviewRes.ok) {
        const oData = await overviewRes.json();
        setMetrics(oData.metrics);
        setCategoryCounts(oData.categoryCounts || {});
        setTopTags(oData.topTags || []);
      }
    } catch (e) {
      console.error("Failed to load journal entries:", e);
    } finally {
      setLoading(false);
    }
  }, [search, selectedCategory, selectedTag, statusFilter, followUpOnly]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (search.trim()) params.set("search", search.trim());
        if (selectedCategory && selectedCategory !== "all") params.set("category", selectedCategory);
        if (selectedTag) params.set("tag", selectedTag);
        if (statusFilter) params.set("status", statusFilter);
        if (followUpOnly) params.set("followUpOnly", "true");

        const [entriesRes, overviewRes] = await Promise.all([
          fetch(`/api/journal/entries?${params.toString()}`),
          fetch("/api/journal/overview"),
        ]);

        if (!cancelled && entriesRes.ok) {
          const data = await entriesRes.json();
          setEntries(data.entries || []);
        }

        if (!cancelled && overviewRes.ok) {
          const oData = await overviewRes.json();
          setMetrics(oData.metrics);
          setCategoryCounts(oData.categoryCounts || {});
          setTopTags(oData.topTags || []);
        }
      } catch (e) {
        console.error("Failed to load journal entries:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [search, selectedCategory, selectedTag, statusFilter, followUpOnly]);

  // Save entry (create or patch)
  async function handleSaveEntry(payload, id = null) {
    if (id) {
      const res = await fetch(`/api/journal/entries/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update entry");
      }
    } else {
      const res = await fetch("/api/journal/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create entry");
      }
    }
    await fetchEntries();
  }

  // Toggle archive status
  async function handleToggleArchive(entry) {
    const newStatus = entry.status === "archived" ? "active" : "archived";
    try {
      const res = await fetch(`/api/journal/entries/${entry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        await fetchEntries();
      }
    } catch (e) {
      console.error("Failed to update status:", e);
    }
  }

  // Record outcome & lessons learned
  async function handleUpdateOutcome(id, outcomeLessons) {
    try {
      const res = await fetch(`/api/journal/entries/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outcomeLessons, followUpStatus: "completed" }),
      });
      if (res.ok) {
        const data = await res.json();
        setDetailEntry(data.entry);
        await fetchEntries();
      }
    } catch (e) {
      console.error("Failed to update outcome:", e);
    }
  }

  function handleOpenCreate() {
    setEditingEntry(null);
    setModalOpen(true);
  }

  function handleOpenEdit(entry) {
    setEditingEntry(entry);
    setModalOpen(true);
  }

  function handleSelectEntry(entry) {
    setDetailEntry(entry);
    setDetailOpen(true);
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 lg:pt-8 pb-12 space-y-6 max-w-7xl mx-auto">
      {/* ── Top Overview Header & Metrics ─────────────────────────────────── */}
      <JournalOverviewHeader metrics={metrics} onNewEntry={handleOpenCreate} />

      {/* ── Search, Categories & Filters ──────────────────────────────────── */}
      <JournalFilterBar
        search={search}
        onSearchChange={setSearch}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        categoryCounts={categoryCounts}
        selectedTag={selectedTag}
        onTagChange={setSelectedTag}
        topTags={topTags}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        followUpOnly={followUpOnly}
        onFollowUpOnlyChange={setFollowUpOnly}
      />

      {/* ── Entry Cards Grid / Timeline ───────────────────────────────────── */}
      <div className="space-y-4">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <SkeletonLoader key={i} className="h-44 w-full rounded-2xl" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title={
              search || selectedCategory !== "all" || selectedTag || followUpOnly
                ? "No matching decision entries"
                : "Your Journal is clean"
            }
            description={
              search || selectedCategory !== "all" || selectedTag || followUpOnly
                ? "Try adjusting your search keywords, category filters, or follow-up toggle."
                : "Capture your first financial decision to document why you acted, set expected targets, and schedule a future reflection."
            }
            action={{
              label: "Record Your First Decision",
              onClick: handleOpenCreate,
            }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {entries.map((entry) => (
              <JournalEntryCard
                key={entry.id}
                entry={entry}
                onSelect={handleSelectEntry}
                onEdit={handleOpenEdit}
                onToggleArchive={handleToggleArchive}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Create / Edit Modal ───────────────────────────────────────────── */}
      {modalOpen && (
        <JournalEntryModal
          key={editingEntry?.id || "new-entry"}
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onSave={handleSaveEntry}
          initialData={editingEntry}
        />
      )}

      {/* ── Detail & Reflection Drawer ────────────────────────────────────── */}
      {detailOpen && (
        <JournalDetailDrawer
          entry={detailEntry}
          isOpen={detailOpen}
          onClose={() => setDetailOpen(false)}
          onEdit={(e) => {
            setDetailOpen(false);
            handleOpenEdit(e);
          }}
          onUpdateOutcome={handleUpdateOutcome}
        />
      )}
    </div>
  );
}
