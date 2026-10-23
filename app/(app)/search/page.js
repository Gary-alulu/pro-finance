// app/(app)/search/page.js
import SemanticSearchClient from "./SemanticSearchClient";

export const metadata = {
  title: "Semantic Search",
  description: "Find information by meaning across documents and records.",
};

export default function SearchPage() {
  return <SemanticSearchClient />;
}
