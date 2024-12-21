const BaseService = require("./base/base.service");
const Category = require("../models/Category");
const { checkDuplicate } = require("../utils/duplicateCheck");

class CategoryService extends BaseService {
  constructor() {
    super(Category, "Category");
    this.nullableFields = ["description", "parentCategory"];
    this.useHistory = true;
    this.useTransactions = true;
    this.excludeFields = [...this.excludeFields];
  }

  getSearchFields() {
    return ["name", "code", "description"];
  }

  getPopulateConfig(view = "list") {
    const configs = {
      list: [
        { path: "parentCategory", select: "name" },
        { path: "createdBy", select: "username" },
      ],
      detail: [
        { path: "parentCategory", select: "name code path" },
        { path: "path", select: "name code" },
        { path: "createdBy", select: "username email" },
        { path: "updateHistory.updatedBy", select: "username email" },
      ],
    };
    return configs[view] || configs.list;
  }

  buildCustomQuery(params) {
    const query = {};

    if (params.status !== undefined) {
      query.status = parseInt(params.status);
    }

    if (params.level !== undefined) {
      query.level = parseInt(params.level);
    }

    if (params.isLeaf !== undefined) {
      query.isLeaf = params.isLeaf === "true";
    }

    if (params.parent !== undefined) {
      query.parentCategory = params.parent === "null" ? null : params.parent;
    }

    return query;
  }

  async validateUnique(data, excludeId = null) {
    if (data.code) {
      await checkDuplicate(
        this.model,
        { code: data.code.toUpperCase() },
        excludeId,
        "Category code already exists"
      );
    }

    // Check unique name within same level
    if (data.name) {
      const parentId = data.parentCategory || null;
      await checkDuplicate(
        this.model,
        {
          name: data.name,
          parentCategory: parentId,
        },
        excludeId,
        "Category name already exists at this level"
      );
    }
  }

  async validateStatusChange(document, newStatus) {
    // First perform base validation
    const baseValidation = await super.validateStatusChange(
      document,
      newStatus
    );
    if (!baseValidation.isValid) {
      return baseValidation;
    }

    // Cannot deactivate if has active children
    if (newStatus === 0) {
      const hasActiveChildren = await this.model.exists({
        parentCategory: document._id,
        status: 1,
      });

      if (hasActiveChildren) {
        return {
          isValid: false,
          message: "Cannot deactivate category with active sub-categories",
        };
      }

      // Check for active products
      const Product = require("../models/Product");
      const hasActiveProducts = await Product.exists({
        category: document._id,
        status: 1,
      });

      if (hasActiveProducts) {
        return {
          isValid: false,
          message: "Cannot deactivate category with active products",
        };
      }
    }

    // Cannot activate if parent is inactive
    if (newStatus === 1 && document.parentCategory) {
      const parent = await this.model.findById(document.parentCategory);
      if (parent && parent.status === 0) {
        return {
          isValid: false,
          message: "Cannot activate category when parent category is inactive",
        };
      }
    }

    return { isValid: true };
  }

  /**
   * Get root categories
   */
  async getRootCategories(options = { onlyActive: true }) {
    try {
      let query = this.model.find().byParent(null);

      if (options.onlyActive) {
        query = query.active();
      }

      const categories = await query
        .populate(this.getPopulateConfig())
        .sort("name");

      return this.processResponse(categories);
    } catch (error) {
      this.logger.error("Failed to get root categories", error);
      throw error;
    }
  }

  /**
   * Get leaf categories
   */
  async getLeafCategories(options = { activeOnly: true }) {
    try {
      let query = this.model.find().leaves();

      if (options.activeOnly) {
        query = query.active();
      }

      const categories = await query
        .populate(this.getPopulateConfig())
        .sort("name");

      return this.processResponse(categories);
    } catch (error) {
      this.logger.error("Failed to get leaf categories", error);
      throw error;
    }
  }

  /**
   * Get category path from root
   */
  async getCategoryPath(id) {
    try {
      const category = await this.model
        .findById(id)
        .populate("path", "name code");

      if (!category) {
        throw new Error("Category not found");
      }

      return this.processResponse(category.path);
    } catch (error) {
      this.logger.error("Failed to get category path", error);
      throw error;
    }
  }

  /**
   * Get category children
   */
  async getChildren(id, options = { onlyActive: true }) {
    try {
      let query = this.model.find({ parentCategory: id });

      if (options.onlyActive) {
        query = query.active();
      }

      const children = await query
        .populate(this.getPopulateConfig())
        .sort("name");

      return this.processResponse(children);
    } catch (error) {
      this.logger.error("Failed to get category children", error);
      throw error;
    }
  }

  /**
   * Get all descendants
   */
  async getDescendants(id, options = { onlyActive: true }) {
    try {
      let query = this.model.find({ path: id });

      if (options.onlyActive) {
        query = query.active();
      }

      const descendants = await query
        .populate(this.getPopulateConfig())
        .sort("level");

      return this.processResponse(descendants);
    } catch (error) {
      this.logger.error("Failed to get category descendants", error);
      throw error;
    }
  }
}

module.exports = new CategoryService();
