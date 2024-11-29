// src/services/category.service.js
const Category = require("../models/Category");
const normalizeData = require("../utils/normalizeData");
const { checkDuplicate } = require("../utils/duplicateCheck");
const {
  createHistoryRecord,
  mergeHistory,
} = require("../utils/historyHandler");
const { logAction } = require("../utils/logger");
const { validateGeneralStatusChange } = require("../utils/statusValidator");

const categoryLog = logAction("Category");

class CategoryService {
  constructor() {
    this.nullableFields = ["description", "parentCategory"];
    this.model = Category;
  }

  async getCategories(query = {}, user = null) {
    try {
      const {
        page = 1,
        limit = 10,
        search = "",
        status,
        parent: parentId,
        sortBy = "-createdAt",
      } = query;

      const startIndex = (page - 1) * limit;
      const queryObj = {};

      // Build search query
      if (search) {
        queryObj.$or = [
          { name: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
        ];
      }

      // Handle parent category filter
      if (parentId === "null") {
        queryObj.parentCategory = null;
      } else if (parentId) {
        queryObj.parentCategory = parentId;
      }

      // Handle status filter
      if (status !== undefined) {
        queryObj.status = parseInt(status);
      }

      const [total, categories] = await Promise.all([
        this.model.countDocuments(queryObj),
        this.model
          .find(queryObj)
          .populate("parentCategory", "name")
          .populate("createdBy", "username")
          .populate("updateHistory.updatedBy", "username")
          .sort(sortBy)
          .skip(startIndex)
          .limit(parseInt(limit)),
      ]);

      categoryLog.success("Retrieved categories list", {
        userId: user?._id,
        query: queryObj,
      });

      return {
        count: categories.length,
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: parseInt(page),
        data: categories,
      };
    } catch (error) {
      categoryLog.error("Failed to retrieve categories", error);
      throw error;
    }
  }

  async getCategoryById(id, user) {
    try {
      const category = await this.model
        .findById(id)
        .populate("parentCategory", "name")
        .populate("createdBy", "username email")
        .populate("updateHistory.updatedBy", "username email");

      if (!category) {
        throw new Error("Category not found");
      }

      categoryLog.success("Retrieved category details", {
        categoryId: id,
        userId: user?._id,
      });

      return category;
    } catch (error) {
      categoryLog.error("Failed to retrieve category", error, {
        categoryId: id,
        userId: user?._id,
      });
      throw error;
    }
  }

  async validateCategory(data, categoryId = null) {
    // Validate category name uniqueness
    await this.validateCategoryName(data.name, categoryId);

    // Validate parent category if provided
    if (data.parentCategory) {
      await this.validateParentCategory(data.parentCategory, categoryId);
    }

    // Normalize nullable fields
    return normalizeData(data, this.nullableFields);
  }

  async create(data, user) {
    try {
      // Validate and normalize data
      const normalizedData = await this.validateCategory(data);

      // Prepare category data with history record
      const categoryData = {
        ...normalizedData,
        createdBy: user._id,
        status: data.status !== undefined ? parseInt(data.status) : 1,
        updateHistory: [createHistoryRecord(user, normalizedData, "create")],
      };

      // Create category
      const category = await this.model.create(categoryData);

      categoryLog.success("Created category", {
        categoryId: category._id,
        userId: user._id,
        data: normalizedData,
      });

      return category;
    } catch (error) {
      categoryLog.error("Failed to create category", error, {
        userId: user._id,
        data,
      });
      throw error;
    }
  }

  async update(id, data, user) {
    try {
      const category = await this.getCategoryById(id, user);

      // Validate and normalize update data
      const normalizedData = await this.validateCategory(data, id);

      // Create history record and merge with existing history
      const historyRecord = createHistoryRecord(user, normalizedData, "update");
      const updateHistory = mergeHistory(category.updateHistory, historyRecord);

      // Update category
      const updatedCategory = await this.model.findByIdAndUpdate(
        id,
        { ...normalizedData, updateHistory },
        { new: true }
      );

      categoryLog.success("Updated category", {
        categoryId: id,
        userId: user._id,
        changes: normalizedData,
      });

      return updatedCategory;
    } catch (error) {
      categoryLog.error("Failed to update category", error, {
        categoryId: id,
        userId: user._id,
        data,
      });
      throw error;
    }
  }

  async deleteCategory(id, user) {
    try {
      const category = await this.getCategoryById(id, user);

      // Check for subcategories
      const hasSubcategories = await this.model.findOne({ parentCategory: id });
      if (hasSubcategories) {
        throw new Error(
          "Cannot delete category with subcategories. Please delete subcategories first."
        );
      }

      await category.deleteOne();

      categoryLog.success("Deleted category", {
        categoryId: id,
        userId: user._id,
        categoryName: category.name,
      });

      return { message: "Category deleted successfully" };
    } catch (error) {
      categoryLog.error("Failed to delete category", error, {
        categoryId: id,
        userId: user._id,
      });
      throw error;
    }
  }

  async updateStatus(id, status, user) {
    try {
      const category = await this.getCategoryById(id, user);

      // Validate status change
      const validation = validateGeneralStatusChange(category, status);
      if (!validation.isValid) {
        throw new Error(validation.message);
      }

      // Create history record for status change
      const historyRecord = createHistoryRecord(
        user,
        { status },
        "status_update"
      );
      const updateHistory = mergeHistory(category.updateHistory, historyRecord);

      const updatedCategory = await this.model.findByIdAndUpdate(
        id,
        { status, updateHistory },
        { new: true }
      );

      categoryLog.success("Updated category status", {
        categoryId: id,
        userId: user._id,
        oldStatus: category.status,
        newStatus: status,
      });

      return updatedCategory;
    } catch (error) {
      categoryLog.error("Failed to update category status", error, {
        categoryId: id,
        userId: user._id,
        status,
      });
      throw error;
    }
  }

  async getLeafCategories(options = { activeOnly: true }) {
    try {
      const leafCategories = await this.model.getLeaves(options);

      await this.model.populate(leafCategories, [
        { path: "parentCategory", select: "name" },
        { path: "createdBy", select: "username" },
      ]);

      categoryLog.success("Retrieved leaf categories", {
        count: leafCategories.length,
        options,
      });

      return leafCategories;
    } catch (error) {
      categoryLog.error("Failed to retrieve leaf categories", error, {
        options,
      });
      throw error;
    }
  }

  async getTopCategories(options = { onlyActive: true }) {
    try {
      let query = this.model.find().byParent(null);

      if (options.onlyActive) {
        query = query.active();
      }

      const categories = await query
        .populate("parentCategory", "name")
        .populate("createdBy", "username")
        .sort("name");

      categoryLog.success("Retrieved top categories", {
        count: categories.length,
        options,
      });

      return categories;
    } catch (error) {
      categoryLog.error("Failed to retrieve top categories", error, {
        options,
      });
      throw error;
    }
  }

  async getCategoryPath(id, user) {
    try {
      const category = await this.getCategoryById(id, user);
      const path = await category.getPath();

      await this.model.populate(path, [
        { path: "parentCategory", select: "name" },
        { path: "createdBy", select: "username" },
      ]);

      categoryLog.success("Retrieved category path", {
        categoryId: id,
        pathLength: path.length,
        userId: user?._id,
      });

      return path;
    } catch (error) {
      categoryLog.error("Failed to retrieve category path", error, {
        categoryId: id,
        userId: user?._id,
      });
      throw error;
    }
  }

  // Helper methods
  async validateCategoryName(name, excludeId = null) {
    return checkDuplicate(this.model, { name }, excludeId);
  }

  async validateParentCategory(parentId, categoryId = null) {
    if (!parentId) return true;

    if (categoryId && parentId === categoryId) {
      throw new Error("Category cannot be its own parent");
    }

    const parentCategory = await this.model.findById(parentId);
    if (!parentCategory) {
      throw new Error("Parent category not found");
    }

    if (!parentCategory.status) {
      throw new Error("Parent category is inactive");
    }

    // Check for circular reference
    if (categoryId) {
      let currentParent = parentCategory;
      const visitedIds = new Set([categoryId]);

      while (currentParent) {
        if (visitedIds.has(currentParent._id.toString())) {
          throw new Error("Circular reference detected in category hierarchy");
        }
        visitedIds.add(currentParent._id.toString());
        if (!currentParent.parentCategory) break;
        currentParent = await this.model.findById(currentParent.parentCategory);
      }
    }

    return true;
  }
}

module.exports = new CategoryService();
