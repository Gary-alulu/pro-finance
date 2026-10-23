"use client";
// app/(app)/search/SemanticSearchClient.js
import { useState } from "react";
import { Search } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";

export default function SemanticSearchClient() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);

  const search = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/search/semantic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      if (res.ok) {
        const data = await res.json();
        setResults(data);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)] flex items-center gap-2">
          <Search className="h-6 w-6" /> Semantic Financial Search
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          Find information by meaning, not just filenames.
        </p>
      </div>

      <Card>
        <div className="p-6 flex gap-2">
          <Input placeholder='e.g., "Find the document showing what I paid for my shares"' value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && search()} className="flex-1" />
          <Button onClick={search} loading={loading}>Search</Button>
        </div>
      </Card>

      {results && (
        <Card>
          <div className="p-6 space-y-4">
            <p className="text-sm text-[var(--color-text-secondary)]">{results.explanation}</p>
            {results.results?.length === 0 && <p className="text-sm">No matches found.</p>}
            {results.results?.map((r, idx) => (
              <div key={idx} className="border-t pt-4">
                <div className="flex justify-between">
                  <p className="font-medium">{r.title}</p>
                  <span className="text-xs text-[var(--color-text-tertiary)]">{r.type}</span>
                </div>
                {r.snippet && <p className="text-sm text-[var(--color-text-secondary)] mt-1 line-clamp-2">{r.snippet}</p>}
                <p className="text-xs text-[var(--color-text-tertiary)] mt-1">{r.reason}</p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
