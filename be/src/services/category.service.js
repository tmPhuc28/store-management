// src/services/category.service.js
const Category = require("../models/Category");
const normalizeData = require("../utils/normalizeData");
const { checkDuplicate } = require("../utils/duplicateCheck");
const {
  createHistoryRecord,
  mergeHistory,
} = require("../utils/historyHandler");
const { logAction } = require("../utils/logger");
const categoryLog = logAction("Category");

class CategoryService {
  constructor() {
    this.nullableFields = ["description", "parentCategory"];
    this.model = Category;
  }

  async validateCategoryName(name, excludeId = null) {
    return checkDuplicate(
      this.model,
      { name },
      excludeId,
      "Active category with this name already exists"
    );
  }

  async validateParentCategory(parentId, categoryId = null) {
    if (!parentId || parentId === "") return true;

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

  prepareCategoryData(data, user, action = "update") {
    const normalizedData = normalizeData(data, this.nullableFields);
    const historyRecord = createHistoryRecord(user, normalizedData, action);

    return {
      ...normalizedData,
      updateHistory: [historyRecord],
    };
  }

  async validateCategory(data, categoryId = null) {
    await this.validateCategoryName(data.name, categoryId);
    await this.validateParentCategory(data.parentCategory, categoryId);
  }

  async create(data, user) {
    try {
      await this.validateCategory(data);

      const categoryData = {
        ...this.prepareCategoryData(data, user, "create"),
        createdBy: user._id,
        status: data.status !== undefined ? parseInt(data.status) : 1,
      };

      const category = await this.model.create(categoryData);

      categoryLog.success("Created category", {
        categoryId: category._id,
        userId: user._id,
        data,
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
      const category = await this.model.findById(id);
      if (!category) {
        throw new Error("Category not found");
      }

      await this.validateCategory(data, id);

      const updateData = this.prepareCategoryData(data, user, "update");
      updateData.updateHistory = mergeHistory(
        category.updateHistory,
        updateData.updateHistory[0]
      );

      const updatedCategory = await this.model.findByIdAndUpdate(
        id,
        updateData,
        { new: true }
      );

      categoryLog.success("Updated category", {
        categoryId: id,
        userId: user._id,
        changes: data,
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
  async getLeafCategories(options = { activeOnly: true }) {
    try {
      // Lấy danh sách category không có con sử dụng phương thức static
      const leafCategories = await this.model.getLeaves({
        activeOnly: options.activeOnly,
      });

      // Đổ dữ liệu liên quan
      await this.model.populate(leafCategories, [
        { path: "parentCategory", select: "name" },
        { path: "createdBy", select: "username" },
      ]);

      return leafCategories;
    } catch (error) {
      throw error;
    }
  }

  async getTopCategories(options = { onlyActive: true }) {
    try {
      // Lấy danh sách category cấp cao nhất sử dụng query helper
      let query = this.model.find().byParent(null);

      if (options.onlyActive) {
        query = query.active();
      }

      const categories = await query
        .populate("parentCategory", "name")
        .populate("createdBy", "username")
        .sort("name");

      return categories;
    } catch (error) {
      throw error;
    }
  }

  async getCategoryPath(categoryId) {
    try {
      const category = await this.model.findById(categoryId);
      if (!category) {
        throw new Error("Category not found");
      }

      // Sử dụng instance method getPath
      const path = await category.getPath();

      // Populate cho toàn bộ path
      await this.model.populate(path, [
        { path: "parentCategory", select: "name" },
        { path: "createdBy", select: "username" },
      ]);

      categoryLog.success("Retrieved category path", {
        categoryId,
        pathLength: path.length,
      });

      return path;
    } catch (error) {
      categoryLog.error("Failed to retrieve category path", error, {
        categoryId,
      });
      throw error;
    }
  }
}

module.exports = new CategoryService();
