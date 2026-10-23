// app/(app)/loading.js
// Group-level loading fallback: kept inside the (app) layout so the sidebar and
// top bar remain visible during navigation between app routes.
import PageSkeleton from "@/components/ui/PageSkeleton";

export default function Loading() {
  return <PageSkeleton cards={4} rows={6} />;
}
