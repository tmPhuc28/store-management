const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Category name is required"],
      trim: true,
      maxlength: [50, "Name cannot be more than 50 characters"],
    },
    code: {
      type: String,
      required: [true, "Category code is required"],
      unique: true,
      trim: true,
      uppercase: true,
      maxlength: [20, "Code cannot be more than 20 characters"],
    },
    description: {
      type: String,
      default: null,
      trim: true,
      maxlength: [500, "Description cannot be more than 500 characters"],
    },
    parentCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },
    path: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
      },
    ],
    level: {
      type: Number,
      default: 0,
    },
    isLeaf: {
      type: Boolean,
      default: true,
    },
    status: {
      type: Number,
      enum: [0, 1],
      default: 1,
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
categorySchema.virtual("statusText").get(function () {
  return this.status === 1 ? "active" : "inactive";
});

categorySchema.virtual("fullPath").get(function () {
  if (!this.populated("path")) return null;
  return this.path.map((cat) => cat.name).join(" > ");
});

// Query helpers
categorySchema.query.active = function () {
  return this.where({ status: 1 });
};

categorySchema.query.leaves = function () {
  return this.where({ isLeaf: true });
};

categorySchema.query.roots = function () {
  return this.where({ parentCategory: null });
};

// Instance methods
categorySchema.methods.getAncestors = async function () {
  return await this.model("Category")
    .find({
      _id: { $in: this.path },
    })
    .sort({ level: 1 });
};

categorySchema.methods.getDescendants = async function () {
  return await this.model("Category")
    .find({
      path: this._id,
    })
    .sort({ level: 1 });
};

categorySchema.methods.getChildren = async function () {
  return await this.model("Category").find({
    parentCategory: this._id,
  });
};

// Pre-save middleware
categorySchema.pre("save", async function (next) {
  try {
    // Handle parent category change
    if (this.isModified("parentCategory")) {
      // If has parent, build path and set level
      if (this.parentCategory) {
        const parent = await this.model("Category").findById(
          this.parentCategory
        );
        if (!parent) {
          throw new Error("Parent category not found");
        }
        this.path = [...parent.path, parent._id];
        this.level = parent.level + 1;

        // Update parent's isLeaf status
        if (parent.isLeaf) {
          await parent.updateOne({ isLeaf: false });
        }
      } else {
        // Root category
        this.path = [];
        this.level = 0;
      }

      // Update old parent's isLeaf status if needed
      if (this.isModified("parentCategory") && !this.isNew) {
        const oldParentId = this._modifiedPaths().includes("parentCategory")
          ? this._original.parentCategory
          : undefined;

        if (oldParentId) {
          const oldParent = await this.model("Category").findById(oldParentId);
          const otherChildren = await this.model("Category").countDocuments({
            parentCategory: oldParentId,
            _id: { $ne: this._id },
          });

          if (oldParent && otherChildren === 0) {
            await oldParent.updateOne({ isLeaf: true });
          }
        }
      }
    }

    // Normalize empty string fields to null
    if (this.description === "") this.description = null;

    next();
  } catch (error) {
    next(error);
  }
});

// Pre-delete middleware
categorySchema.pre("deleteOne", { document: true }, async function (next) {
  try {
    // Check for children
    const hasChildren = await this.model("Category").exists({
      parentCategory: this._id,
    });
    if (hasChildren) {
      throw new Error(
        "Cannot delete category that has sub-categories. " +
          "Please delete sub-categories first."
      );
    }

    // Check for associated products
    const Product = require("./Product");
    const hasProducts = await Product.exists({ category: this._id });
    if (hasProducts) {
      throw new Error(
        "Cannot delete category that has associated products. " +
          "Please remove all products first or deactivate the category instead."
      );
    }

    // Update parent's isLeaf status if this was the only child
    if (this.parentCategory) {
      const otherChildren = await this.model("Category").countDocuments({
        parentCategory: this.parentCategory,
        _id: { $ne: this._id },
      });

      if (otherChildren === 0) {
        await this.model("Category").findByIdAndUpdate(this.parentCategory, {
          isLeaf: true,
        });
      }
    }

    next();
  } catch (error) {
    next(error);
  }
});

// Indexes
categorySchema.index({ code: 1 }, { unique: true });
categorySchema.index({ name: "text", description: "text" });
categorySchema.index({ status: 1 });
categorySchema.index({ level: 1 });
categorySchema.index({ isLeaf: 1 });
categorySchema.index({ parentCategory: 1 });
categorySchema.index({ path: 1 });
categorySchema.index({ createdAt: -1 });

module.exports = mongoose.model("Category", categorySchema);
