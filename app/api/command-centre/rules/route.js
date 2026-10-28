// app/api/command-centre/rules/route.js
// Manage early-warning rule configurations, enabled toggles and monitoring thresholds.

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import CommandCentreRule from "@/lib/db/models/CommandCentreRule";
import { requireUserId, withErrorHandling } from "@/lib/auth/session";
import { DEFAULT_RULES } from "@/lib/command-centre/constants";

async function getHandler() {
  const userId = await requireUserId();
  await connectDB();

  const userRules = await CommandCentreRule.find({ ownerId: userId }).lean();
  const userRulesMap = new Map();
  for (const ur of userRules) {
    userRulesMap.set(ur.ruleKey, ur);
  }

  // Merge default rules with user customization
  const merged = DEFAULT_RULES.map((def) => {
    const custom = userRulesMap.get(def.ruleKey);
    return {
      ruleKey: def.ruleKey,
      category: def.category,
      name: def.name,
      description: def.description,
      enabled: custom ? custom.enabled : def.enabled,
      severity: custom?.severity || def.severity,
      thresholds: {
        ...(def.thresholds || {}),
        ...(custom?.thresholds || {}),
      },
    };
  });

  return NextResponse.json({ rules: merged });
}

async function patchHandler(request) {
  const userId = await requireUserId();
  await connectDB();

  const body = await request.json().catch(() => ({}));
  const { ruleKey, enabled, severity, thresholds } = body;

  if (!ruleKey) {
    return NextResponse.json({ error: "ruleKey is required" }, { status: 400 });
  }

  const def = DEFAULT_RULES.find((r) => r.ruleKey === ruleKey);
  if (!def) {
    return NextResponse.json({ error: "Unknown ruleKey" }, { status: 400 });
  }

  const update = {};
  if (typeof enabled === "boolean") update.enabled = enabled;
  if (severity) update.severity = severity;
  if (thresholds && typeof thresholds === "object") update.thresholds = thresholds;

  const doc = await CommandCentreRule.findOneAndUpdate(
    { ownerId: userId, ruleKey },
    {
      $set: {
        ...update,
        category: def.category,
        name: def.name,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();

  return NextResponse.json({
    message: "Rule updated successfully",
    rule: {
      ...doc,
      id: doc._id.toString(),
    },
  });
}

export const GET = withErrorHandling(getHandler);
export const PATCH = withErrorHandling(patchHandler);
