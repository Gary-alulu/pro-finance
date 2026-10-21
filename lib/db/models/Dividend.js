// lib/db/models/Dividend.js
// Income distributed by a holding. Separate from Transaction so income history is queryable.
import mongoose from "mongoose";

const DividendSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    holdingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InvestmentHolding",
      required: true,
      index: true,
    },
    exDate: Date,
    payDate: { type: Date, required: true },
    amountPerUnit: mongoose.Schema.Types.Decimal128,
    units: mongoose.Schema.Types.Decimal128,
    // Total gross dividend. Optional so a partial record is still valid.
    grossAmount: { type: mongoose.Schema.Types.Decimal128, required: true },
    // Withholding tax may be absent (unknown) rather than a genuine zero.
    taxWithheld: mongoose.Schema.Types.Decimal128,
    netAmount: mongoose.Schema.Types.Decimal128,
    currency: { type: String, required: true, default: "KES" },
    reinvested: { type: Boolean, default: false },
    linkedTransactionId: { type: mongoose.Schema.Types.ObjectId, ref: "Transaction" },
    notes: String,
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        for (const k of ["amountPerUnit", "units", "grossAmount", "taxWithheld", "netAmount"]) {
          if (ret[k] != null) ret[k] = ret[k].toString();
        }
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

DividendSchema.index({ holdingId: 1, payDate: -1 });
DividendSchema.index({ ownerId: 1, payDate: -1 });

export default mongoose.models.Dividend || mongoose.model("Dividend", DividendSchema);
