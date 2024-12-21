const mongoose = require("mongoose");

const zoneSchema = new mongoose.Schema(
  {
    warehouse: {
      type: String,
      required: true,
      trim: true,
    },
    area: {
      type: String,
      required: true,
      trim: true,
    },
    rack: {
      type: String,
      required: true,
      trim: true,
    },
    shelf: {
      type: String,
      default: null,
      trim: true,
    },
    bin: {
      type: String,
      default: null,
      trim: true,
    },
  },
  { _id: false }
);

const productLocationSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    zone: {
      type: zoneSchema,
      required: true,
    },
    status: {
      type: Number,
      enum: [0, 1], // 0: inactive, 1: active
      default: 1,
    },
    notes: {
      type: String,
      default: null,
      trim: true,
      maxlength: [200, "Notes cannot exceed 200 characters"],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updateHistory: [
      {
        action: String,
        updatedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
        changes: Object,
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtuals
productLocationSchema.virtual("statusText").get(function () {
  return this.status === 1 ? "active" : "inactive";
});

productLocationSchema.virtual("locationCode").get(function () {
  const { warehouse, area, rack, shelf, bin } = this.zone;
  return [warehouse, area, rack, shelf, bin].filter(Boolean).join("-");
});

// Compound Unique Index
productLocationSchema.index(
  {
    product: 1,
    "zone.warehouse": 1,
    "zone.area": 1,
    "zone.rack": 1,
    "zone.shelf": 1,
    "zone.bin": 1,
  },
  { unique: true }
);

// Other Indexes
productLocationSchema.index({ status: 1 });
productLocationSchema.index({ "zone.warehouse": 1 });
productLocationSchema.index({ "zone.area": 1 });
productLocationSchema.index({ createdAt: -1 });

module.exports = mongoose.model("ProductLocation", productLocationSchema);
