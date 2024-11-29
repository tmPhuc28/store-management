const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please add a category name"],
      unique: true,
      trim: true,
      maxlength: [50, "Name cannot be more than 50 characters"],
    },
    description: {
      type: String,
      maxlength: [500, "Description cannot be more than 500 characters"],
      default: null,
    },
    parentCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: Number,
      enum: [0, 1],
      default: 1,
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

// Virtual field cho trạng thái dạng text
categorySchema.virtual("statusText").get(function () {
  return this.status === 1 ? "active" : "inactive";
});

// Query helpers - giúp tạo các query phổ biến
categorySchema.query.active = function () {
  return this.where({ status: 1 });
};

categorySchema.query.byParent = function (parentId) {
  return this.where({ parentCategory: parentId || null });
};

// Instance method - lấy đường dẫn từ root đến category hiện tại
categorySchema.methods.getPath = async function () {
  const path = [];
  let current = this;

  while (current) {
    path.unshift(current);
    if (!current.parentCategory) break;
    current = await this.model("Category").findById(current.parentCategory);
  }
  return path;
};

// Static method - lấy tất cả leaf categories
categorySchema.statics.getLeaves = async function (
  options = { activeOnly: true }
) {
  const query = options.activeOnly ? { status: 1 } : {};
  const categories = await this.find(query);
  const parentIds = new Set(
    categories
      .filter((c) => c.parentCategory)
      .map((c) => c.parentCategory.toString())
  );
  return categories.filter((cat) => !parentIds.has(cat._id.toString()));
};

// Middleware xử lý dữ liệu trước khi lưu
categorySchema.pre("save", function (next) {
  if (!this.parentCategory || this.parentCategory === "") {
    this.parentCategory = null;
  }
  if (!this.description) {
    this.description = null;
  }
  next();
});

// Indexes cho tìm kiếm
categorySchema.index({ status: 1 });
categorySchema.index({ name: "text", description: "text" });

module.exports = mongoose.model("Category", categorySchema);
