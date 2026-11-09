// app/(app)/calculator/page.js
// Financial Calculator & Planning Engine — Server component entry point.

import { auth } from "@/auth";
import CalculatorClient from "./CalculatorClient";

export const metadata = {
  title: "Financial Calculator & Planning Engine",
  description: "Platform-wide financial calculations, decision evaluation, and scenario planning in Kenya / KES.",
};

export default async function CalculatorPage({ searchParams }) {
  const session = await auth();
  const params = await searchParams;
  const initialCategory = params?.category || "basic";
  const focusId = params?.focus || "";

  return (
    <CalculatorClient
      initialUser={session?.user}
      initialCategory={initialCategory}
      focusId={focusId}
    />
  );
}

