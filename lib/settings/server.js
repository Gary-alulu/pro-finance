// lib/settings/server.js
// Server-only helpers for reading the account owner's persisted settings.

import { connectDB } from "@/lib/db/mongoose";
import User from "@/lib/db/models/User";
import Document from "@/lib/db/models/Document";
import mongoose from "mongoose";
import { mergeSettings } from "./defaults";

const MAX_STORAGE_BYTES = 512 * 1024 * 1024; // advisory workspace budget

export async function getUserSettings(userId) {
  if (!userId) return null;
  await connectDB();
  const user = await User.findById(userId)
    .select("name email preferredCurrency settings role createdAt")
    .lean();
  if (!user) return null;

  return {
    user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      preferredCurrency: user.preferredCurrency,
      role: user.role,
      createdAt: user.createdAt,
    },
    settings: mergeSettings(user.settings, {
      preferredCurrency: user.preferredCurrency,
    }),
  };
}

export async function getStorageMeta(userId) {
  if (!userId) {
    return {
      documentCount: 0,
      storageBytes: 0,
      largestFileBytes: 0,
      storageLimitBytes: MAX_STORAGE_BYTES,
    };
  }
  await connectDB();
  const rows = await Document.aggregate([
    { $match: { ownerId: new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: null,
        documentCount: { $sum: 1 },
        storageBytes: { $sum: { $ifNull: ["$fileSize", 0] } },
        largestFileBytes: { $max: { $ifNull: ["$fileSize", 0] } },
      },
    },
  ]);
  const row = rows[0] || {};
  return {
    documentCount: row.documentCount || 0,
    storageBytes: row.storageBytes || 0,
    largestFileBytes: row.largestFileBytes || 0,
    storageLimitBytes: MAX_STORAGE_BYTES,
  };
}

export function aiProviderStatus() {
  const provider = (process.env.AI_PROVIDER || "").toLowerCase();
  if (provider === "gemini" && process.env.GEMINI_API_KEY) {
    return { provider: "gemini", configured: true };
  }
  if (provider === "openai" && process.env.OPENAI_API_KEY) {
    return { provider: "openai", configured: true };
  }
  if (process.env.GEMINI_API_KEY) return { provider: "gemini", configured: true };
  if (process.env.OPENAI_API_KEY) return { provider: "openai", configured: true };
  return { provider: "unconfigured", configured: false };
}
