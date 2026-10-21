// lib/db/models/ExchangeRate.js
// Explicit, dated exchange rates. Multi-currency totals MUST reference a stored
// rate — rates are never assumed or fetched implicitly at calculation time.
import mongoose from "mongoose";

const ExchangeRateSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    from: { type: String, required: true, uppercase: true, length: 3 },
    to: { type: String, required: true, uppercase: true, length: 3 },
    // 1 `from` = rate `to`
    rate: { type: mongoose.Schema.Types.Decimal128, required: true },
    asOf: { type: Date, required: true },
    source: {
      type: String,
      enum: ["manual", "imported", "published"],
      default: "manual",
    },
    note: String,
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        if (ret.rate) ret.rate = ret.rate.toString();
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

ExchangeRateSchema.index({ ownerId: 1, from: 1, to: 1, asOf: -1 });

export default mongoose.models.ExchangeRate ||
  mongoose.model("ExchangeRate", ExchangeRateSchema);
