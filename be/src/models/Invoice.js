const mongoose = require("mongoose");

const invoiceItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, "Quantity must be at least 1"],
  },
  price: {
    type: Number,
    required: true,
    min: [0, "Price cannot be negative"],
  },
  discount: {
    type: Number,
    default: 0,
  },
  finalPrice: {
    type: Number,
    required: true,
  },
  subTotal: {
    type: Number,
    required: true,
    min: [0, "Subtotal cannot be negative"],
  },
});

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    items: [invoiceItemSchema],
    subTotal: {
      type: Number,
      required: true,
      min: [0, "Subtotal cannot be negative"],
      default: 0,
    },
    discount: {
      discountId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Discount",
      },
      code: String,
      type: {
        type: String,
        enum: ["percentage", "fixed"],
      },
      value: {
        type: Number,
        default: 0,
      },
      amount: {
        type: Number,
        default: 0,
      },
    },
    total: {
      type: Number,
      required: true,
      min: [0, "Total cannot be negative"],
      default: 0,
    },
    paymentMethod: {
      type: String,
      required: true,
      enum: ["cash", "bank_transfer"],
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "cancelled"],
      default: "pending",
    },
    bankTransferInfo: {
      amount: {
        type: Number,
        default: 0,
      },
      description: String,
      qrCode: String,
    },
    notes: String,
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

// Calculate item prices and subtotals
invoiceSchema.pre("save", async function (next) {
  try {
    if (this.isNew || this.isModified("items")) {
      let totalAmount = 0;

      for (const item of this.items) {
        const product = await mongoose.model("Product").findById(item.product);
        if (!product) {
          throw new Error(`Product not found: ${item.product}`);
        }

        item.price = product.price;
        item.finalPrice = product.finalPrice || product.price;
        item.subTotal = item.finalPrice * item.quantity;
        totalAmount += item.subTotal;
      }

      this.subTotal = totalAmount;
    }
    next();
  } catch (error) {
    next(error);
  }
});

// Calculate totals and generate QR
invoiceSchema.pre("save", async function (next) {
  try {
    // Apply discount if exists
    if (this.discount && this.discount.value > 0) {
      if (this.discount.type === "percentage") {
        this.discount.amount = (this.subTotal * this.discount.value) / 100;
      } else {
        this.discount.amount = this.discount.value;
      }
    }

    // Calculate final total
    this.total = this.subTotal - (this.discount?.amount || 0);

    // Generate VietQR for bank transfer
    if (this.paymentMethod === "bank_transfer") {
      const Store = mongoose.model("Store");
      const store = await Store.findOne();

      if (!store) {
        throw new Error("Store information not found");
      }

      const description = `Thanh toan ${this.invoiceNumber}`;
      this.bankTransferInfo = {
        amount: this.total,
        description,
        qrCode: store.generateVietQRUrl(this.total, description),
      };
    }

    next();
  } catch (error) {
    next(error);
  }
});

// Generate invoice number
invoiceSchema.pre("save", async function (next) {
  try {
    if (this.isNew) {
      const count = await mongoose.model("Invoice").countDocuments();
      const currentDate = new Date();
      const year = currentDate.getFullYear().toString().slice(-2);
      const month = (currentDate.getMonth() + 1).toString().padStart(2, "0");
      this.invoiceNumber = `INV${year}${month}${(count + 1)
        .toString()
        .padStart(6, "0")}`;
    }
    next();
  } catch (error) {
    next(error);
  }
});

// Add indexes
invoiceSchema.index({ invoiceNumber: 1 });
invoiceSchema.index({ customer: 1 });
invoiceSchema.index({ "discount.discountId": 1 });
invoiceSchema.index({ status: 1 });
invoiceSchema.index({ createdAt: -1 });
invoiceSchema.index({ paymentStatus: 1 });

module.exports = mongoose.model("Invoice", invoiceSchema);
