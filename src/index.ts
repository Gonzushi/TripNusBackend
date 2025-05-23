import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import { setupSwagger } from "./swagger";

import { authenticateUser } from "./middlewares/authHandler";
import {
  jsonParseErrorHandler,
  generalErrorHandler,
} from "./middlewares/errorHandler";

import authRoutes from "./routes/authRoutes";
import fareRoutes from "./routes/fareRoutes";
import paymentRoutes from "./routes/paymentRoutes";

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/auth", authRoutes);
app.use("/fare", authenticateUser, fareRoutes);
app.use("/payment", authenticateUser, paymentRoutes);

// Swagger
setupSwagger(app);

// Error Handlers
app.use(jsonParseErrorHandler);
app.use(generalErrorHandler);

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`
🚀 Server running on port ${PORT}
📚 Swagger docs available at http://localhost:${PORT}/docs
  `);
});
