// app/api/auth/register/route.js
// POST /api/auth/register — create the first (and only) user account.
// In MVP, only allows registration if no users exist yet.

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db/mongoose";
import User from "@/lib/db/models/User";
import { registerSchema } from "@/lib/validations/schemas";
import { withErrorHandling, validationError } from "@/lib/auth/session";
import { readJsonBody } from "@/lib/security/sanitize";

async function postHandler(request) {
  const body = await readJsonBody(request);
  const result = registerSchema.safeParse(body);

  if (!result.success) {
    return validationError(result);
  }

  await connectDB();

  const { name, email, password, preferredCurrency } = result.data;
  const normalizedEmail = email.trim().toLowerCase();
  const passwordHash = await bcrypt.hash(password, 12);

  // M-4: atomic single-owner claim — upsert against the singleton isOwner
  // slot. If a user already exists the filter matches it and we 409; if not,
  // $setOnInsert creates the first user. Concurrent races surface as E11000
  // on the partial unique index (or return the winner's doc).
  try {
    const user = await User.findOneAndUpdate(
      { isOwner: true },
      {
        $setOnInsert: {
          name,
          email: normalizedEmail,
          passwordHash,
          preferredCurrency: preferredCurrency || "KES",
          isOwner: true,
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    if (user.email !== normalizedEmail) {
      return NextResponse.json(
        { error: "An account already exists. This platform is single-owner." },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { message: "Account created successfully", userId: user._id.toString() },
      { status: 201 }
    );
  } catch (err) {
    if (err.code === 11000) {
      return NextResponse.json(
        { error: "An account already exists. This platform is single-owner." },
        { status: 409 }
      );
    }
    throw err;
  }
}

export const POST = withErrorHandling(postHandler);
