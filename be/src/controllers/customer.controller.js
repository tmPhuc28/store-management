// src/controllers/customer.controller.js
const Customer = require("../models/Customer");
const { validationResult } = require("express-validator");
const logger = require("../utils/logger");
const { validateGeneralStatusChange } = require("../utils/statusValidator");

// @desc    Get all customers
// @route   GET /api/v1/customers
// @access  Private
exports.getCustomers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const startIndex = (page - 1) * limit;
    const sortBy = req.query.sortBy || "-createdAt";
    const search = req.query.search || "";
    const status =
      req.query.status !== undefined ? parseInt(req.query.status) : undefined;

    // Build query
    let query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }
    if (status !== undefined && (status === 0 || status === 1)) {
      query.status = status;
    }

    const total = await Customer.countDocuments(query);
    const customers = await Customer.find(query)
      .populate("createdBy", "username email")
      .sort(sortBy)
      .skip(startIndex)
      .limit(limit);

    res.status(200).json({
      success: true,
      count: customers.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: customers,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single customer
// @route   GET /api/v1/customers/:id
// @access  Private
exports.getCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.params.id)
      .populate("createdBy", "username email")
      .populate("purchaseHistory");

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    res.status(200).json({
      success: true,
      data: customer,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create customer
// @route   POST /api/v1/customers
// @access  Private
exports.createCustomer = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Check for duplicate phone
    const existingPhone = await Customer.findOne({
      phone: req.body.phone,
      status: 1,
    });
    if (existingPhone) {
      return res.status(400).json({
        success: false,
        message: "Phone number already registered to an active customer",
      });
    }

    // Check for duplicate email if provided
    if (req.body.email) {
      const existingEmail = await Customer.findOne({
        email: req.body.email,
        status: 1,
      });
      if (existingEmail) {
        return res.status(400).json({
          success: false,
          message: "Email already registered to an active customer",
        });
      }
    }

    const customer = await Customer.create({
      ...req.body,
      createdBy: req.user._id,
      updateHistory: [
        {
          updatedBy: req.user._id,
          changes: req.body,
        },
      ],
    });

    logger.info(`Customer created: ${customer.name} by ${req.user.email}`);

    res.status(201).json({
      success: true,
      data: customer,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update customer
// @route   PUT /api/v1/customers/:id
// @access  Private
exports.updateCustomer = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    let customer = await Customer.findById(req.params.id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    // Check for duplicate phone if changed
    if (req.body.phone && req.body.phone !== customer.phone) {
      const existingPhone = await Customer.findOne({
        phone: req.body.phone,
        status: 1,
        _id: { $ne: req.params.id },
      });
      if (existingPhone) {
        return res.status(400).json({
          success: false,
          message: "Phone number already registered to another active customer",
        });
      }
    }

    // Check for duplicate email if changed
    if (req.body.email && req.body.email !== customer.email) {
      const existingEmail = await Customer.findOne({
        email: req.body.email,
        status: 1,
        _id: { $ne: req.params.id },
      });
      if (existingEmail) {
        return res.status(400).json({
          success: false,
          message: "Email already registered to another active customer",
        });
      }
    }

    // Add to update history
    const updateHistory = [
      ...customer.updateHistory,
      {
        updatedBy: req.user._id,
        changes: req.body,
      },
    ];

    customer = await Customer.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updateHistory },
      {
        new: true,
        runValidators: true,
      }
    );

    logger.info(`Customer updated: ${customer.name} by ${req.user.email}`);

    res.status(200).json({
      success: true,
      data: customer,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update customer status
// @route   PATCH /api/v1/customers/:id/status
// @access  Private
exports.updateCustomerStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const statusNum = parseInt(status);

    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    // Sử dụng general validator
    const validation = validateGeneralStatusChange(customer, statusNum);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: validation.message,
      });
    }

    const updateCustomer = await Customer.findByIdAndUpdate(
      req.params.id,
      {
        status: statusNum,
        $push: {
          updateHistory: {
            updatedBy: req.user._id,
            changes: { status: statusNum },
          },
        },
      },
      { new: true }
    );

    logger.info(
      `Customer status updated: ${customer.name} to ${statusNum} by ${req.user.email}`
    );

    res.status(200).json({
      success: true,
      data: updateCustomer,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete customer
// @route   DELETE /api/v1/customers/:id
// @access  Private
exports.deleteCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.params.id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    // Check if customer has purchase history
    if (customer.purchaseHistory && customer.purchaseHistory.length > 0) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot delete customer with purchase history. Please deactivate instead.",
      });
    }

    await customer.deleteOne();

    logger.info(`Customer deleted: ${customer.name} by ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: "Customer deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
