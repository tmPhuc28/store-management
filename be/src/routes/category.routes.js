const BaseRouter = require("./base/base.router");
const CategoryController = require("../controllers/category.controller");
const {
  createCategoryValidator,
  updateCategoryValidator,
} = require("../validators/category.validator");
const { objectIdValidator } = require("../validators/common.validator");

class CategoryRouter extends BaseRouter {
  constructor() {
    super(
      new CategoryController(),
      {
        create: createCategoryValidator,
        update: updateCategoryValidator,
      },
      {
        protected: true,
        routes: {
          getAll: {
            protected: true,
            adminOnly: false,
          },
          getOne: {
            protected: true,
            adminOnly: false,
          },
          create: {
            protected: true,
            adminOnly: true,
          },
          update: {
            protected: true,
            adminOnly: true,
          },
          updateStatus: {
            protected: true,
            adminOnly: true,
          },
          delete: {
            protected: true,
            adminOnly: true,
          },
          getHistory: {
            protected: true,
            adminOnly: true,
          },
          deleteHistoryEntry: {
            protected: true,
            adminOnly: true,
          },
          clearHistory: {
            protected: true,
            adminOnly: true,
          },
        },
      }
    );
  }

  initializeCustomRoutes() {
    // Get root categories
    this.router.get(
      "/roots",
      this.protected(),
      this.controller.getRootCategories
    );

    // Get leaf categories
    this.router.get(
      "/leaves",
      this.protected(),
      this.controller.getLeafCategories
    );

    // Get category path
    this.router.get(
      "/:id/path",
      [this.protected(), objectIdValidator("id")],
      this.controller.getCategoryPath
    );

    // Get category children
    this.router.get(
      "/:id/children",
      [this.protected(), objectIdValidator("id")],
      this.controller.getChildren
    );

    // Get category descendants
    this.router.get(
      "/:id/descendants",
      [this.protected(), objectIdValidator("id")],
      this.controller.getDescendants
    );
  }
}

module.exports = new CategoryRouter().getRouter();
