// lib/db/models/User.js
import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    name: { type: String, trim: true },
    passwordHash: { type: String, required: true, select: false },
    preferredCurrency: { type: String, default: "KES" },
    // Settings are validated by the shared zod schema and merged with
    // lib/settings/defaults.js on read, so the document stays forward-compatible
    // when new preference categories are introduced.
    settings: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
    role: { type: String, enum: ["owner", "admin"], default: "owner" },
    // M-4: at most one doc may have isOwner=true (partial unique index below).
    // Registration claims the slot atomically via upsert + $setOnInsert.
    isOwner: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        delete ret.passwordHash;
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// M-4: partial unique index — the DB itself rejects a second owner doc,
// closing the check-then-create race in registration.
UserSchema.index(
  { isOwner: 1 },
  { unique: true, partialFilterExpression: { isOwner: true } }
);

export default mongoose.models.User || mongoose.model("User", UserSchema);
