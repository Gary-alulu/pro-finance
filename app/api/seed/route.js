// app/api/seed/route.js
// POST /api/seed — populate interconnected wealth demo data for the current user

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import Asset from "@/lib/db/models/Asset";
import Liability from "@/lib/db/models/Liability";
import InvestmentHolding from "@/lib/db/models/InvestmentHolding";
import Document from "@/lib/db/models/Document";
import Transaction from "@/lib/db/models/Transaction";
import RecordRelationship from "@/lib/db/models/RecordRelationship";
import AccountabilityItem from "@/lib/db/models/AccountabilityItem";
import { requireUserId, withErrorHandling } from "@/lib/auth/session";
import mongoose from "mongoose";

async function postHandler(request) {
  const userId = await requireUserId();
  await connectDB();

  const userObjectId = new mongoose.Types.ObjectId(userId);
  const now = new Date();
  const daysAgo = (d) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000);

  // 1. Clear existing demo data for user
  await Promise.all([
    Asset.deleteMany({ ownerId: userObjectId }),
    Liability.deleteMany({ ownerId: userObjectId }),
    InvestmentHolding.deleteMany({ ownerId: userObjectId }),
    Document.deleteMany({ ownerId: userObjectId }),
    Transaction.deleteMany({ ownerId: userObjectId }),
    RecordRelationship.deleteMany({ ownerId: userObjectId }),
    AccountabilityItem.deleteMany({ ownerId: userObjectId }),
  ]);

  // 2. Create Assets
  const westlandsApt = await Asset.create({
    ownerId: userObjectId,
    name: "Westlands 2-Bedroom Luxury Apartment",
    category: "property",
    subCategory: "Residential Condominium",
    currency: "KES",
    description: "Title No. IR 184920/1. Leased to diplomatic tenant.",
    status: "active",
    currentValue: {
      amount: mongoose.Types.Decimal128.fromString("14500000.00"),
      asOf: daysAgo(20),
      source: "ai_extracted",
      approvedBy: userObjectId,
      approvedAt: daysAgo(20),
    },
    valuationHistory: [
      {
        amount: mongoose.Types.Decimal128.fromString("13200000.00"),
        currency: "KES",
        asOf: daysAgo(365),
        source: "manual",
        note: "Purchase price",
      },
      {
        amount: mongoose.Types.Decimal128.fromString("14500000.00"),
        currency: "KES",
        asOf: daysAgo(20),
        source: "ai_extracted",
        note: "Lloyd Masika Professional Appraisal",
      },
    ],
  });

  const karenPlot = await Asset.create({
    ownerId: userObjectId,
    name: "Karen 0.5-Acre Commercial Plot",
    category: "property",
    subCategory: "Commercial Land",
    currency: "KES",
    description: "Freehold commercial development parcel on Dagoretti Road.",
    status: "active",
    currentValue: {
      amount: mongoose.Types.Decimal128.fromString("28000000.00"),
      asOf: daysAgo(15),
      source: "manual",
      approvedBy: userObjectId,
      approvedAt: daysAgo(15),
    },
    valuationHistory: [
      {
        amount: mongoose.Types.Decimal128.fromString("28000000.00"),
        currency: "KES",
        asOf: daysAgo(15),
        source: "manual",
        note: "Valuation benchmark from adjacent plot transaction",
      },
    ],
  });

  const bankAccount = await Asset.create({
    ownerId: userObjectId,
    name: "NCBA Priority Checking Account",
    category: "bank_account",
    currency: "KES",
    description: "Account #1092839120. Primary operational cash reserve.",
    status: "active",
    currentValue: {
      amount: mongoose.Types.Decimal128.fromString("1850000.00"),
      asOf: daysAgo(3),
      source: "statement",
      approvedBy: userObjectId,
      approvedAt: daysAgo(3),
    },
  });

  const vehicle = await Asset.create({
    ownerId: userObjectId,
    name: "Toyota Land Cruiser Prado TX-L",
    category: "vehicle",
    currency: "KES",
    description: "Reg No. KDK 492X. 2021 model.",
    status: "active",
    currentValue: {
      amount: mongoose.Types.Decimal128.fromString("5200000.00"),
      asOf: daysAgo(115), // Outdated (>90d) to trigger accountability scanner!
      source: "manual",
      approvedBy: userObjectId,
      approvedAt: daysAgo(115),
    },
  });

  // 3. Create Liabilities
  const mortgage = await Liability.create({
    ownerId: userObjectId,
    name: "Stanbic Home Mortgage Loan",
    category: "mortgage",
    currency: "KES",
    lender: "Stanbic Bank Kenya",
    principalAmount: mongoose.Types.Decimal128.fromString("9500000.00"),
    currentBalance: {
      amount: mongoose.Types.Decimal128.fromString("8420000.00"),
      asOf: daysAgo(10),
      source: "statement",
    },
    interestRate: mongoose.Types.Decimal128.fromString("13.25"),
    linkedAssetId: westlandsApt._id,
    status: "active",
    notes: "15-year facility maturing 2038.",
  });

  const creditCard = await Liability.create({
    ownerId: userObjectId,
    name: "NCBA Platinum Visa Card",
    category: "credit_card",
    currency: "KES",
    lender: "NCBA Bank",
    currentBalance: {
      amount: mongoose.Types.Decimal128.fromString("185000.00"),
      asOf: daysAgo(5),
      source: "statement",
    },
    interestRate: mongoose.Types.Decimal128.fromString("19.00"),
    status: "active",
  });

  // 4. Create Investments
  const safaricom = await InvestmentHolding.create({
    ownerId: userObjectId,
    name: "Safaricom PLC",
    type: "listed_equity",
    ticker: "SCOM",
    exchange: "NSE",
    currency: "KES",
    units: mongoose.Types.Decimal128.fromString("50000"),
    costBasis: {
      totalCost: mongoose.Types.Decimal128.fromString("750000.00"),
      currency: "KES",
      asOf: daysAgo(180),
    },
    currentPrice: {
      price: mongoose.Types.Decimal128.fromString("16.85"),
      currency: "KES",
      asOf: daysAgo(1),
      source: "market_feed",
    },
  });

  const bond = await InvestmentHolding.create({
    ownerId: userObjectId,
    name: "Kenya Infrastructure Bond IFB1/2023/17",
    type: "bond",
    ticker: "IFB1/2023/17",
    exchange: "Central Bank of Kenya",
    currency: "KES",
    units: mongoose.Types.Decimal128.fromString("20000"),
    costBasis: {
      totalCost: mongoose.Types.Decimal128.fromString("2000000.00"),
      currency: "KES",
      asOf: daysAgo(300),
    },
    currentPrice: {
      price: mongoose.Types.Decimal128.fromString("103.40"),
      currency: "KES",
      asOf: daysAgo(7),
      source: "market_feed",
    },
  });

  // 5. Create Documents
  const deedDoc = await Document.create({
    ownerId: userObjectId,
    filename: "Westlands_Apartment_Title_Deed_IR184920.pdf",
    mimeType: "application/pdf",
    storageKey: `${userId}/demo/Westlands_Deed.pdf`,
    fileSize: 2450000,
    uploadedAt: daysAgo(20),
    documentType: "property_deed",
    processingStatus: "approved",
    linkedAssetId: westlandsApt._id,
    approvedData: {
      name: "Westlands 2-Bedroom Luxury Apartment",
      amount: "14500000.00",
      currency: "KES",
      date: daysAgo(20).toISOString(),
    },
    approvedAt: daysAgo(20),
    approvedBy: userObjectId,
  });

  const mortgageDoc = await Document.create({
    ownerId: userObjectId,
    filename: "Stanbic_Mortgage_Facility_Letter_2024.pdf",
    mimeType: "application/pdf",
    storageKey: `${userId}/demo/Stanbic_Facility.pdf`,
    fileSize: 1240000,
    uploadedAt: daysAgo(15),
    documentType: "loan_agreement",
    processingStatus: "approved",
    linkedLiabilityId: mortgage._id,
    approvedData: {
      name: "Stanbic Home Mortgage Loan",
      amount: "8420000.00",
      currency: "KES",
      date: daysAgo(15).toISOString(),
    },
    approvedAt: daysAgo(15),
    approvedBy: userObjectId,
  });

  const pendingDoc = await Document.create({
    ownerId: userObjectId,
    filename: "NCBA_Statement_October_2026.pdf",
    mimeType: "application/pdf",
    storageKey: `${userId}/demo/NCBA_Oct.pdf`,
    fileSize: 450000,
    uploadedAt: daysAgo(2),
    documentType: "bank_statement",
    processingStatus: "awaiting_review",
    extractionResult: {
      modelUsed: "gemini-1.5-flash",
      extractedAt: daysAgo(2),
      confidence: 0.94,
      uncertainFields: ["transactionReferenceCode"],
      proposedFields: {
        documentType: "bank_statement",
        proposedEntityType: "transaction",
        name: "Executive Advisory Monthly Retainer",
        amount: "450000.00",
        currency: "KES",
        date: daysAgo(2).toISOString().split("T")[0],
        counterparty: "Acuity Strategic Advisory Ltd",
        category: "income",
        confidence: 0.94,
        summary: "Monthly retainer credit extracted from bank statement deposit.",
      },
    },
  });

  // 6. Create Transactions
  await Transaction.create([
    {
      ownerId: userObjectId,
      date: daysAgo(2),
      description: "Executive Advisory Monthly Retainer",
      amount: mongoose.Types.Decimal128.fromString("450000.00"),
      currency: "KES",
      direction: "inflow",
      category: "income",
      evidenceStatus: "supported",
      approvalStatus: "approved",
      linkedDocumentId: pendingDoc._id,
      notes: "Direct deposit credit into NCBA checking.",
    },
    {
      ownerId: userObjectId,
      date: daysAgo(10),
      description: "Stanbic Mortgage EMI Monthly Deduction",
      amount: mongoose.Types.Decimal128.fromString("112450.00"),
      currency: "KES",
      direction: "outflow",
      category: "loan_repayment",
      evidenceStatus: "supported",
      approvalStatus: "approved",
      linkedLiabilityId: mortgage._id,
      notes: "Principal + interest scheduled deduction.",
    },
    {
      ownerId: userObjectId,
      date: daysAgo(18),
      description: "Land Cruiser Major Suspension Service & Brake Pads",
      amount: mongoose.Types.Decimal128.fromString("82500.00"),
      currency: "KES",
      direction: "outflow",
      category: "expense",
      evidenceStatus: "missing", // Missing evidence to trigger accountability!
      approvalStatus: "pending",
      linkedAssetId: vehicle._id,
      notes: "Cash payment at garage — pending invoice receipt upload.",
    },
  ]);

  // 7. Create Explicit Graph Relationships
  await RecordRelationship.create([
    {
      ownerId: userObjectId,
      sourceType: "liability",
      sourceId: mortgage._id,
      targetType: "asset",
      targetId: westlandsApt._id,
      relationshipType: "secures",
      confidence: "confirmed",
      confirmedAt: now,
      confirmedBy: userObjectId,
    },
    {
      ownerId: userObjectId,
      sourceType: "document",
      sourceId: deedDoc._id,
      targetType: "asset",
      targetId: westlandsApt._id,
      relationshipType: "evidences",
      confidence: "confirmed",
      confirmedAt: now,
      confirmedBy: userObjectId,
    },
    {
      ownerId: userObjectId,
      sourceType: "document",
      sourceId: mortgageDoc._id,
      targetType: "liability",
      targetId: mortgage._id,
      relationshipType: "evidences",
      confidence: "confirmed",
      confirmedAt: now,
      confirmedBy: userObjectId,
    },
  ]);

  // 8. Trigger Accountability Scan (forward the session cookie so auth is preserved)
  const base = process.env.NEXTAUTH_URL || "http://localhost:3000";
  await fetch(`${base}/api/accountability`, {
    method: "POST",
    headers: { cookie: request.headers.get("cookie") || "" },
  }).catch(() => {});

  return NextResponse.json({
    success: true,
    message: "Demo portfolio seeded successfully with connected real-world financial assets and documents.",
  });
}

export const POST = withErrorHandling(postHandler);
