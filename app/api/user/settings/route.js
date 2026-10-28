// app/api/user/settings/route.js
// GET /api/user/settings — fetch the owner's profile, merged preferences and meta.
// PATCH /api/user/settings — deep-merge preference changes and audit the diff.

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import User from "@/lib/db/models/User";
import { requireUserId, withErrorHandling, validationError } from "@/lib/auth/session";
import { updateSettingsSchema } from "@/lib/validations/schemas";
import { logAudit, requestMeta } from "@/lib/audit/logAudit";
import { readJsonBody } from "@/lib/security/sanitize";
import {
  deepMergeSettings,
  mergeSettings,
  DEFAULT_SETTINGS,
} from "@/lib/settings/defaults";
import { getStorageMeta, aiProviderStatus } from "@/lib/settings/server";

async function buildMeta(userId) {
  const [storage, ai] = await Promise.all([
    getStorageMeta(userId),
    Promise.resolve(aiProviderStatus()),
  ]);
  return {
    ...storage,
    storage,
    ai,
  };
}

async function getHandler() {
  const userId = await requireUserId();
  await connectDB();

  const user = await User.findById(userId).select("-passwordHash").lean();
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const settings = mergeSettings(user.settings, {
    preferredCurrency: user.preferredCurrency,
  });
  const meta = await buildMeta(userId);

  return NextResponse.json({
    user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      preferredCurrency: user.preferredCurrency,
      role: user.role,
      createdAt: user.createdAt,
      settings,
    },
    settings,
    meta,
    defaults: DEFAULT_SETTINGS,
  });
}

async function patchHandler(request) {
  const userId = await requireUserId();
  const body = await readJsonBody(request);
  const parsed = updateSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(parsed);
  }
  const { name, preferredCurrency, settings: patch } = parsed.data;

  await connectDB();
  const user = await User.findById(userId);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const beforeSettings = mergeSettings(user.settings, {
    preferredCurrency: user.preferredCurrency,
  });
  const before = {
    name: user.name,
    preferredCurrency: user.preferredCurrency,
    settings: beforeSettings,
  };

  if (name !== undefined) user.name = name;

  const nextSettings = deepMergeSettings(beforeSettings, patch || {});

  // Currency coherence: the reporting currency is the session's preferred
  // currency (used by every module for display and new-record defaults), and
  // the profile's default currency is kept in lock-step with it unless the
  // caller explicitly set the two apart in a single payload.
  const touchedReport = patch?.financial?.reportingCurrency;
  const touchedDefault = patch?.profile?.defaultCurrency;
  if (touchedReport) {
    nextSettings.profile.defaultCurrency = nextSettings.financial.reportingCurrency;
  } else if (touchedDefault) {
    nextSettings.financial.reportingCurrency = nextSettings.profile.defaultCurrency;
  }
  if (preferredCurrency) {
    nextSettings.financial.reportingCurrency = preferredCurrency;
    nextSettings.profile.defaultCurrency = preferredCurrency;
  }

  user.settings = nextSettings;
  if (preferredCurrency || touchedReport || touchedDefault) {
    user.preferredCurrency = nextSettings.financial.reportingCurrency;
  }

  await user.save();

  const changedSections = Object.keys(patch || {}).filter(
    (key) =>
      key !== "data" &&
      key !== "activity" &&
      JSON.stringify(beforeSettings[key]) !== JSON.stringify(nextSettings[key])
  );
  const summary = changedSections.length
    ? `Updated settings: ${changedSections.join(", ")}`
    : "Saved account settings";

  await logAudit(
    userId,
    "update",
    "settings",
    userId,
    before,
    {
      name: user.name,
      preferredCurrency: user.preferredCurrency,
      settings: nextSettings,
    },
    summary,
    requestMeta(request)
  );

  return NextResponse.json({
    user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      preferredCurrency: user.preferredCurrency,
    },
    settings: nextSettings,
    changedSections,
  });
}

export const GET = withErrorHandling(getHandler);
export const PATCH = withErrorHandling(patchHandler);
