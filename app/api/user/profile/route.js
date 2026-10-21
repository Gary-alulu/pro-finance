// app/api/user/profile/route.js
// PATCH /api/user/profile — authenticated profile changes.
//   mode: "details"  → name and/or email (current password required)
//   mode: "password" → rotate password (current password required)
// Generic errors: never reveal whether an account/email exists.

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db/mongoose";
import User from "@/lib/db/models/User";
import { requireUserId, withErrorHandling, validationError } from "@/lib/auth/session";
import { changeProfileSchema } from "@/lib/validations/schemas";
import { logAudit, requestMeta } from "@/lib/audit/logAudit";
import { readJsonBody } from "@/lib/security/sanitize";

const INVALID = () =>
  NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });

async function patchHandler(request) {
  const userId = await requireUserId();
  const body = await readJsonBody(request);
  const parsed = changeProfileSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(parsed);
  }
  const data = parsed.data;

  await connectDB();
  const user = await User.findById(userId).select("+passwordHash");
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Constant-fail when the current password doesn't match — same shape for
  // every mode so timing/response never leaks which change was attempted.
  const passwordOk = await bcrypt.compare(data.currentPassword, user.passwordHash);
  if (!passwordOk) {
    return INVALID();
  }

  const before = { name: user.name, email: user.email };

  if (data.mode === "password") {
    user.passwordHash = await bcrypt.hash(data.newPassword, 12);
    await user.save();

    await logAudit(
      userId,
      "update",
      "settings",
      userId,
      { passwordChanged: false },
      { passwordChanged: true },
      "Changed account password",
      requestMeta(request)
    );

    return NextResponse.json({ message: "Password updated successfully" });
  }

  // mode === "details"
  let changed = false;
  if (data.name !== undefined && data.name !== user.name) {
    user.name = data.name;
    changed = true;
  }
  const normalizedEmail = data.email !== undefined ? data.email.toLowerCase() : undefined;
  if (normalizedEmail !== undefined && normalizedEmail !== user.email) {
    user.email = normalizedEmail;
    changed = true;
  }

  if (!changed) {
    return NextResponse.json({ message: "No changes to save" });
  }

  try {
    await user.save();
  } catch (err) {
    if (err.code === 11000) {
      return NextResponse.json(
        { error: "That email address is already in use." },
        { status: 409 }
      );
    }
    throw err;
  }

  await logAudit(
    userId,
    "update",
    "settings",
    userId,
    before,
    { name: user.name, email: user.email },
    "Updated profile details",
    requestMeta(request)
  );

  return NextResponse.json({
    user: { id: user._id.toString(), name: user.name, email: user.email },
  });
}

export const PATCH = withErrorHandling(patchHandler);
