// app/(app)/assets/loading.js
import PageSkeleton from "@/components/ui/PageSkeleton";

export default function Loading() {
  return <PageSkeleton cards={4} rows={6} />;
}
