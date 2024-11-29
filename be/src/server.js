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
const storeRoutes = require("./routes/store.routes");
const productRoutes = require("./routes/product.routes");
const categoryRoutes = require("./routes/category.routes");
const customerRoutes = require("./routes/customer.routes");
const invoiceRoutes = require("./routes/invoice.routes");
const discountRoutes = require("./routes/discount.routes");

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
    // Cho phép các origins được cấu hình trong env
    const allowedOrigins = process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(",")
      : ["http://localhost:3000"]; // Default cho development

    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true, // Cho phép gửi cookies qua CORS
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
  ],
  exposedHeaders: ["set-cookie"],
};

// Security Middleware
app.use(helmet());
app.use(cors(corsOptions));

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
app.use("/api/v1/store", storeRoutes);
app.use("/api/v1/products", productRoutes);
app.use("/api/v1/categories", categoryRoutes);
app.use("/api/v1/customers", customerRoutes);
app.use("/api/v1/invoices", invoiceRoutes);
app.use("/api/v1/discounts", discountRoutes);

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
