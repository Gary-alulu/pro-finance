// app/(app)/documents/page.js
// Document intelligence and review studio — server shell.

import { auth } from "@/auth";
import DocumentsClient from "./DocumentsClient";

export const metadata = {
  title: "Document Intelligence & Review",
  description: "Upload financial documents, review AI-extracted proposals, and approve official records.",
};

export default async function DocumentsPage({ searchParams }) {
  const session = await auth();
  const sp = await searchParams;
  return (
    <DocumentsClient
      user={session?.user}
      focusId={typeof sp.focus === "string" ? sp.focus : null}
      newRecord={sp.new === "1"}
    />
  );
}
