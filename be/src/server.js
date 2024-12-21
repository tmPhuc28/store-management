require("dotenv").config();
const express = require("express");
const http = require("http");
const socketIO = require("socket.io");
const StockAlertService = require("./services/stockAlert.service");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./config/swagger");

// Import routes
const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
const paymentRoutes = require("./routes/payment.routes");
const storeRoutes = require("./routes/store.routes");
const employeeRoutes = require("./routes/employee.routes");
const manufacturerRoutes = require("./routes/manufacturer.routes");
const supplierRoutes = require("./routes/supplier.routes");
const productLocationRoutes = require("./routes/productLocation.routes");
const productDiscountRoutes = require("./routes/productDiscount.routes");
const invoiceDiscountRoutes = require("./routes/invoiceDiscount.routes");
const productRoutes = require("./routes/product.routes");
const categoryRoutes = require("./routes/category.routes");
const customerRoutes = require("./routes/customer.routes");
const invoiceRoutes = require("./routes/invoice.routes");

// Initialize express app
const app = express();

const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS.split(","),
    credentials: true,
  },
});

// Khởi tạo StockAlertService với io
const stockAlertService = new StockAlertService(io);

// Lưu service vào app để sử dụng trong routes
app.set("stockAlertService", stockAlertService);

// CORS Configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(",")
      : ["http://localhost:3000"]; // Default for development

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: process.env.CORS_CREDENTIALS === "true",
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
  ],
  exposedHeaders: ["set-cookie"],
  optionsSuccessStatus: 200,
};

// Security Middleware
app.use(helmet());
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

// Cookie Parser
app.use(cookieParser(process.env.COOKIE_SECRET));

// Body Parser Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate Limiting
const limiter = rateLimit({
  windowMs: process.env.RATE_LIMIT_WINDOW * 60 * 1000,
  max: process.env.RATE_LIMIT_MAX,
});
app.use(limiter);

// Mount routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/employees", employeeRoutes);
app.use("/api/v1/manufacturers", manufacturerRoutes);
app.use("/api/v1/suppliers", supplierRoutes);
app.use("/api/v1/product-locations", productLocationRoutes);
app.use("/api/v1/product-discounts", productDiscountRoutes);
app.use("/api/v1/invoice-discounts", invoiceDiscountRoutes);
app.use("/api/v2/store", storeRoutes);
app.use("/api/v2/payments", paymentRoutes);
app.use("/api/v1/products", productRoutes);
app.use("/api/v1/categories", categoryRoutes);
app.use("/api/v1/customers", customerRoutes);
app.use("/api/v1/invoices", invoiceRoutes);

// Swagger UI options
const swaggerUiOptions = {
  customCss: ".swagger-ui .topbar { display: none }",
  customSiteTitle: "PitShop API Docs",
  swaggerOptions: {
    persistAuthorization: true,
  },
};

// Serve Swagger documentation
app.use("/api-docs", swaggerUi.serve);
app.get("/api-docs", swaggerUi.setup(swaggerSpec, swaggerUiOptions));

// Get swagger.json
app.get("/swagger.json", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.send(swaggerSpec);
});

// Error Handler Middleware
const errorHandler = require("./middleware/error");
app.use(errorHandler);

// Database Connection
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("Connected to MongoDB");
    // Start server
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(
        `API Documentation available at http://localhost:${PORT}/api-docs`
      );
    });
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });

// Socket.IO connection handling
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  // Gửi danh sách cảnh báo hiện tại khi client kết nối
  stockAlertService
    .getActiveAlerts()
    .then((alerts) => {
      socket.emit("initialAlerts", alerts);
    })
    .catch(console.error);

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  console.error("Unhandled Promise Rejection:", err);
  process.exit(1);
});
