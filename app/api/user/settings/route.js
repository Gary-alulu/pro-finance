// app/api/user/settings/route.js
// GET /api/user/settings — fetch user profile and preferences
// PATCH /api/user/settings — update preferences (currency, privacy, notifications)

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import User from "@/lib/db/models/User";
import { requireUserId, withErrorHandling, validationError } from "@/lib/auth/session";
import { updateSettingsSchema } from "@/lib/validations/schemas";
import { logAudit, requestMeta } from "@/lib/audit/logAudit";
import { readJsonBody } from "@/lib/security/sanitize";

async function getHandler() {
  const userId = await requireUserId();
  await connectDB();

  const user = await User.findById(userId).select("-passwordHash").lean();
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    user: {
      ...user,
      id: user._id.toString(),
    },
  });
}

async function patchHandler(request) {
  const userId = await requireUserId();
  const body = await readJsonBody(request);
  const parsed = updateSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(parsed);
  }
  const { name, preferredCurrency, settings } = parsed.data;

  await connectDB();
  const user = await User.findById(userId);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const before = {
    name: user.name,
    preferredCurrency: user.preferredCurrency,
    settings: user.settings?.toObject?.() || user.settings,
  };

  if (name !== undefined) user.name = name;
  if (preferredCurrency !== undefined) user.preferredCurrency = preferredCurrency;
  if (settings) {
    user.settings = {
      ...user.settings,
      ...settings,
    };
  }

  await user.save();

  await logAudit(
    userId,
    "update",
    "settings",
    userId,
    before,
    { name: user.name, preferredCurrency: user.preferredCurrency, settings: user.settings },
    "Updated account settings",
    requestMeta(request)
  );

  return NextResponse.json({
    user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      preferredCurrency: user.preferredCurrency,
      settings: user.settings,
    },
  });
}

export const GET = withErrorHandling(getHandler);
export const PATCH = withErrorHandling(patchHandler);
