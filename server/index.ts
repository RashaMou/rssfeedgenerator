import cors from "cors";
import { join } from "path";
import express, { Express, Request, Response, NextFunction } from "express";
import routes from "./routes.js";
import dotenv from "dotenv";
import config from "./config.js";
import logger from "./logger.js";
import { errorHandler } from "./middleware/errorHandler.js";

dotenv.config();

const app: Express = express();
const port: number = parseInt(process.env.PORT || "8080", 10);

app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  next();
});

app.use(express.static(join(process.cwd(), "dist/client")));

app.use(
  cors({
    origin: config.baseUrl,
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
  }),
);

app.use(express.json({ limit: "1mb" }));

app.use(errorHandler);

// Routes
app.use("/api", routes);

app.get("*", (_: Request, res: Response) => {
  res.redirect("/");
});

// 404 handler
app.use((_: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: "Not found",
  });
});

// Error handler
app.use((err: Error, _: Request, res: Response, _next: NextFunction) => {
  logger.error(err.stack);
  res.status(500).json({
    success: false,
    error:
      process.env.NODE_ENV === "production"
        ? "Internal server error"
        : err.message,
  });
});

app.listen(port, () => {
  logger.info(`Server running on ${config.baseUrl}:${config.port}`);
});
