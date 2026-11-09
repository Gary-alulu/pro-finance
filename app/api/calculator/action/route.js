// app/api/calculator/action/route.js
// POST /api/calculator/action
// Authoritative conversion endpoint: converts approved calculation results into platform records.

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db/mongoose";
import Asset from "@/lib/db/models/Asset";
import AssetValuation from "@/lib/db/models/AssetValuation";
import Liability from "@/lib/db/models/Liability";
import FinancialScenario from "@/lib/db/models/FinancialScenario";
import JournalEntry from "@/lib/db/models/JournalEntry";
import Reminder from "@/lib/db/models/Reminder";
import Calculation from "@/lib/db/models/Calculation";
import { requireUserId, assertOwnership, withErrorHandling, validationError } from "@/lib/auth/session";
import { logAudit, requestMeta } from "@/lib/audit/logAudit";
import { calculatorActionSchema } from "@/lib/validations/schemas";
import { readJsonBody } from "@/lib/security/sanitize";

async function postHandler(request) {
  const userId = await requireUserId();
  const body = await readJsonBody(request);
  const parsed = calculatorActionSchema.safeParse(body);

  if (!parsed.success) {
    return validationError(parsed);
  }

  const { calculationId, actionType, payload, notes } = parsed.data;
  await connectDB();

  let targetEntityType = "";
  let targetEntityId = "";
  let summary = "";
  let viewHref = "";

  switch (actionType) {
    case "update_asset_valuation": {
      const { assetId, newAmount, currency, method, asOf, note } = payload;
      if (!assetId || !newAmount) {
        return Response.json({ error: "assetId and newAmount are required" }, { status: 400 });
      }

      const asset = await Asset.findById(assetId);
      if (!asset) {
        return Response.json({ error: "Asset not found" }, { status: 404 });
      }
      assertOwnership(asset.ownerId, userId);

      const valuationDate = asOf ? new Date(asOf) : new Date();
      const decAmount = mongoose.Types.Decimal128.fromString(newAmount.toString());

      // Push to asset valuation history
      asset.valuationHistory.push({
        amount: decAmount,
        currency: currency || asset.currency || "KES",
        asOf: valuationDate,
        source: "manual",
        note: note || notes || "Updated via Financial Calculator",
      });

      // Update currentValue
      asset.currentValue = {
        amount: decAmount,
        asOf: valuationDate,
        source: "manual",
        approvedBy: new mongoose.Types.ObjectId(userId),
        approvedAt: new Date(),
      };
      if (method) {
        asset.valuationMethod = method;
      }
      await asset.save();

      // Standalone valuation record
      const valDoc = await AssetValuation.create({
        ownerId: new mongoose.Types.ObjectId(userId),
        assetId: asset._id,
        amount: decAmount,
        currency: currency || asset.currency || "KES",
        asOf: valuationDate,
        source: "manual",
        status: "approved",
        confidence: "recorded",
        method: method || "depreciated_cost",
        note: note || notes,
        approvedBy: new mongoose.Types.ObjectId(userId),
        approvedAt: new Date(),
      });

      targetEntityType = "asset";
      targetEntityId = asset._id.toString();
      summary = `Updated valuation for ${asset.name} to ${newAmount} ${currency || "KES"} via calculator`;
      viewHref = `/assets?focus=${targetEntityId}`;

      await logAudit(
        userId,
        "update",
        "asset_valuation",
        valDoc._id.toString(),
        null,
        { amount: newAmount, assetId: targetEntityId, method },
        summary,
        requestMeta(request)
      );
      break;
    }

    case "create_liability_plan": {
      const { liabilityId, newMinimumRepayment, newTermMonths, repaymentStrategyNote } = payload;
      if (!liabilityId) {
        return Response.json({ error: "liabilityId is required" }, { status: 400 });
      }

      const liability = await Liability.findById(liabilityId);
      if (!liability) {
        return Response.json({ error: "Liability not found" }, { status: 404 });
      }
      assertOwnership(liability.ownerId, userId);

      if (newMinimumRepayment) {
        liability.minimumRepayment = mongoose.Types.Decimal128.fromString(newMinimumRepayment.toString());
      }
      if (newTermMonths) {
        liability.termMonths = Number(newTermMonths);
      }
      if (repaymentStrategyNote || notes) {
        liability.notes = [liability.notes, repaymentStrategyNote || notes].filter(Boolean).join("\n---\n");
      }
      await liability.save();

      targetEntityType = "liability";
      targetEntityId = liability._id.toString();
      summary = `Updated repayment strategy for ${liability.name} via calculator`;
      viewHref = `/liabilities?focus=${targetEntityId}`;

      await logAudit(
        userId,
        "update",
        "liability",
        liability._id.toString(),
        null,
        { liabilityId: targetEntityId, newMinimumRepayment, newTermMonths },
        summary,
        requestMeta(request)
      );
      break;
    }

    case "save_wealth_scenario": {
      const { name, description, timeHorizonYears, assumptions, baseSnapshot } = payload;
      if (!name) {
        return Response.json({ error: "Scenario name is required" }, { status: 400 });
      }

      const scenario = await FinancialScenario.create({
        ownerId: userId,
        name: name.trim().slice(0, 120),
        description: (description || notes || "").trim().slice(0, 500),
        timeHorizonYears: Math.max(1, Math.min(40, Number(timeHorizonYears) || 5)),
        assumptions: assumptions || {},
        baseSnapshot: baseSnapshot || { takenAt: new Date(), currency: "KES" },
      });

      targetEntityType = "calculation_scenario";
      targetEntityId = scenario._id.toString();
      summary = `Created Wealth Simulator scenario "${scenario.name}" from calculator projection`;
      viewHref = `/simulator?scenario=${targetEntityId}`;

      await logAudit(
        userId,
        "create",
        "calculation_scenario",
        scenario._id.toString(),
        null,
        { scenarioId: targetEntityId, name: scenario.name },
        summary,
        requestMeta(request)
      );
      break;
    }

    case "create_journal_memo": {
      const { title, category, contextReasoning, expectedOutcome, risksAssumptions, alternativesConsidered, amount } = payload;
      if (!title || !contextReasoning) {
        return Response.json({ error: "title and contextReasoning are required" }, { status: 400 });
      }

      const journal = await JournalEntry.create({
        ownerId: userId,
        title: title.trim(),
        category: category || "financial_planning",
        decisionDate: new Date(),
        contextReasoning: contextReasoning.trim(),
        expectedOutcome: (expectedOutcome || "").trim(),
        risksAssumptions: (risksAssumptions || "").trim(),
        alternativesConsidered: (alternativesConsidered || "").trim(),
        amount: amount?.amount
          ? {
              amount: mongoose.Types.Decimal128.fromString(amount.amount.toString()),
              currency: amount.currency || "KES",
            }
          : undefined,
        tags: ["calculator-decision", ...(payload.tags || [])],
        followUpStatus: "none",
      });

      targetEntityType = "journal_entry";
      targetEntityId = journal._id.toString();
      summary = `Logged financial decision memo "${journal.title}" from calculator`;
      viewHref = `/journal?entry=${targetEntityId}`;

      await logAudit(
        userId,
        "create",
        "journal_entry",
        journal._id.toString(),
        null,
        { journalId: targetEntityId, title: journal.title },
        summary,
        requestMeta(request)
      );
      break;
    }

    case "create_goal":
    case "update_goal_target": {
      // Create a reminder / target checkpoint for the goal
      const { goalTitle, targetAmount, targetDate, contribution } = payload;
      const rem = await Reminder.create({
        ownerId: userId,
        title: `Goal Target: ${goalTitle || "Savings Goal"} (KES ${targetAmount || ""})`,
        body: `Monthly contribution target: KES ${contribution || ""}. Planned completion: ${targetDate || "N/A"}.\n${notes || ""}`,
        dueAt: targetDate ? new Date(targetDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        priority: "normal",
        entityType: "none",
      });

      targetEntityType = "reminder";
      targetEntityId = rem._id.toString();
      summary = `Scheduled savings goal checkpoint "${goalTitle}"`;
      viewHref = `/dashboard`;
      break;
    }

    default:
      return Response.json({ error: `Unknown action type: ${actionType}` }, { status: 400 });
  }

  // Update Calculation doc with conversion history if calculationId provided
  if (calculationId) {
    try {
      const calcDoc = await Calculation.findOne({ _id: calculationId, ownerId: userId });
      if (calcDoc) {
        calcDoc.actionHistory.push({
          actionType,
          targetEntityType,
          targetEntityId: new mongoose.Types.ObjectId(targetEntityId),
          executedAt: new Date(),
          summary,
        });
        calcDoc.status = "converted";
        await calcDoc.save();
      }
    } catch (e) {
      console.warn("[Calc Action Track Error]", e?.message);
    }
  }

  return NextResponse.json({
    success: true,
    actionType,
    targetEntityType,
    targetEntityId,
    summary,
    viewHref,
  });
}

export const POST = withErrorHandling(postHandler);

