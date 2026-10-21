"use client";
// components/map/FinancialMapCanvas.js
// Interactive connected Financial Map canvas powered by @xyflow/react.
// Features: node search, entity-type filter, confirmed-vs-pending edge filter,
// expand/collapse of secondary nodes, error and empty states.

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import CenterNode from "./CenterNode";
import AssetNode from "./AssetNode";
import LiabilityNode from "./LiabilityNode";
import InvestmentNode from "./InvestmentNode";
import DocumentNode from "./DocumentNode";
import NodeDetailDrawer from "./NodeDetailDrawer";
import SkeletonLoader from "@/components/ui/SkeletonLoader";
import ErrorState from "@/components/ui/ErrorState";
import EmptyState from "@/components/ui/EmptyState";
import {
  Network,
  RefreshCw,
  Building2,
  Landmark,
  LineChart,
  FileText,
  Search,
  Eye,
  EyeOff,
  Shrink,
  Maximize2,
} from "lucide-react";

const nodeTypes = {
  centerNode: CenterNode,
  assetNode: AssetNode,
  liabilityNode: LiabilityNode,
  investmentNode: InvestmentNode,
  documentNode: DocumentNode,
};

export default function FinancialMapCanvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [activeFilter, setActiveFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [showPending, setShowPending] = useState(true);
  const [collapsed, setCollapsed] = useState(false);

  const fetchGraphData = useCallback(async () => {
    try {
      const res = await fetch("/api/map");
      if (!res.ok) throw new Error(`Map request failed (${res.status})`);
      const data = await res.json();
      setNodes(data.nodes || []);
      setEdges(data.edges || []);
      setError(null);
    } catch (err) {
      console.error("Error loading map data:", err);
      setError(err.message || "Failed to load the financial map");
    } finally {
      setLoading(false);
    }
  }, [setNodes, setEdges]);

  useEffect(() => {
    // Defer so the fetch's setState calls happen after the effect commits
    const t = setTimeout(fetchGraphData, 0);
    return () => clearTimeout(t);
  }, [fetchGraphData]);

  const onNodeClick = useCallback((event, node) => {
    if (node.type !== "centerNode") setSelectedNode(node);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const hasRecords = useMemo(
    () => nodes.some((n) => n.type !== "centerNode"),
    [nodes]
  );

  const visibleNodes = useMemo(() => {
    const q = search.trim().toLowerCase();
    return nodes.map((node) => {
      if (node.type === "centerNode") return { ...node, hidden: false };

      const matchesType =
        activeFilter === "all" ||
        (activeFilter === "assets" && node.type === "assetNode") ||
        (activeFilter === "liabilities" && node.type === "liabilityNode") ||
        (activeFilter === "investments" && node.type === "investmentNode") ||
        (activeFilter === "documents" && node.type === "documentNode");

      const matchesSearch =
        !q ||
        [node.data?.title, node.data?.label, node.data?.ticker, node.data?.category]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q));

      // Collapse hides secondary/document nodes to reduce clutter.
      const isSecondary = node.type === "documentNode";
      const matchesCollapse = !collapsed || !isSecondary;

      return {
        ...node,
        hidden: !(matchesType && matchesSearch && matchesCollapse),
      };
    });
  }, [nodes, activeFilter, search, collapsed]);

  const visibleEdges = useMemo(() => {
    const visibleNodeIds = new Set(
      visibleNodes.filter((n) => !n.hidden).map((n) => n.id)
    );
    return edges
      .filter((e) => {
        if (!showPending && e.confidence && e.confidence !== "confirmed") return false;
        return true;
      })
      .map((e) => ({
        ...e,
        hidden: !(visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target)),
      }));
  }, [edges, visibleNodes, showPending]);

  const searchMatches = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return 0;
    return visibleNodes.filter((n) => n.type !== "centerNode" && !n.hidden).length;
  }, [visibleNodes, search]);

  return (
    <div className="relative w-full h-[calc(100vh-140px)] min-h-[580px] rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs overflow-hidden">
      {/* ── Top Floating Toolbar ────────────────────────────────────────── */}
      <div className="absolute top-4 left-4 right-4 z-10 flex flex-wrap items-center gap-2 pointer-events-none">
        <div className="flex flex-wrap items-center gap-2 bg-[var(--color-surface)]/90 backdrop-blur-md p-1.5 rounded-xl border border-[var(--color-border)] shadow-sm pointer-events-auto">
          {[
            { id: "all", label: "All Network", icon: Network },
            { id: "assets", label: "Assets", icon: Building2 },
            { id: "liabilities", label: "Liabilities", icon: Landmark },
            { id: "investments", label: "Investments", icon: LineChart },
            { id: "documents", label: "Documents", icon: FileText },
          ].map((tab) => {
            const isActive = activeFilter === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveFilter(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? "bg-[var(--color-emerald-600)] text-white shadow-xs"
                    : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-2)]"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}

          <div className="h-4 w-[1px] bg-[var(--color-border)] mx-1" />

          <button
            type="button"
            onClick={() => setShowPending((v) => !v)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              showPending
                ? "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-2)]"
                : "bg-amber-50 text-amber-700 border border-amber-200"
            }`}
            title={
              showPending
                ? "Hiding suggested links"
                : "Showing suggested links"
            }
          >
            {showPending ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            {showPending ? "Pending links on" : "Pending links off"}
          </button>

          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-2)] transition-all cursor-pointer"
            title={collapsed ? "Expand secondary nodes" : "Collapse secondary nodes"}
          >
            {collapsed ? <Maximize2 className="w-3.5 h-3.5" /> : <Shrink className="w-3.5 h-3.5" />}
            {collapsed ? "Expand" : "Collapse"}
          </button>

          <div className="h-4 w-[1px] bg-[var(--color-border)] mx-1" />

          <button
            type="button"
            onClick={fetchGraphData}
            className="p-1.5 rounded-lg text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-2)] transition-colors cursor-pointer"
            title="Reload Financial Map"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Node search */}
        <div className="flex items-center gap-2 bg-[var(--color-surface)]/90 backdrop-blur-md px-3 py-2 rounded-xl border border-[var(--color-border)] shadow-sm pointer-events-auto">
          <Search className="w-3.5 h-3.5 text-[var(--color-text-tertiary)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search nodes…"
            className="bg-transparent text-xs text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] outline-none w-36"
          />
          {search.trim() && (
            <span className="text-[10px] font-semibold text-[var(--color-text-tertiary)]">
              {searchMatches} match{searchMatches === 1 ? "" : "es"}
            </span>
          )}
        </div>
      </div>

      {/* ── Canvas / Loading / Error / Empty States ─────────────────────── */}
      {loading ? (
        <div className="w-full h-full flex flex-col items-center justify-center gap-3">
          <SkeletonLoader className="w-24 h-24 rounded-full" />
          <p className="text-xs font-semibold text-[var(--color-text-secondary)]">
            Synthesizing Connected Financial Network...
          </p>
        </div>
      ) : error ? (
        <div className="w-full h-full flex items-center justify-center p-6">
          <ErrorState
            title="Map unavailable"
            description={error}
            onRetry={fetchGraphData}
          />
        </div>
      ) : !hasRecords ? (
        <div className="w-full h-full flex items-center justify-center p-6">
          <EmptyState
            title="No records to map yet"
            description="Add assets, liabilities, investments, or documents and their relationships will appear here."
            icon={Network}
          />
        </div>
      ) : (
        <ReactFlow
          nodes={visibleNodes}
          edges={visibleEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.2}
          maxZoom={1.8}
        >
          <Background color="var(--color-border)" gap={20} size={1} />
          <Controls className="!bg-[var(--color-surface)] !border-[var(--color-border)] !rounded-xl !shadow-sm !overflow-hidden" />
          <MiniMap
            nodeColor={(node) => {
              if (node.type === "assetNode") return "#10b981";
              if (node.type === "liabilityNode") return "#f04e3e";
              if (node.type === "investmentNode") return "#3b82f6";
              if (node.type === "documentNode") return "#a855f7";
              return "#c49a24";
            }}
            className="!bg-[var(--color-surface)] !border-[var(--color-border)] !rounded-xl !shadow-sm"
          />
        </ReactFlow>
      )}

      {/* ── Slide-over Detail Drawer ────────────────────────────────────── */}
      <NodeDetailDrawer
        selectedNode={selectedNode}
        onClose={() => setSelectedNode(null)}
      />
    </div>
  );
}
