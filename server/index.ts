import cors from "cors";
import express, { Express, Request, Response, NextFunction } from "express";
import routes from "./routes.ts";
import dotenv from "dotenv";

dotenv.config();

const app: Express = express();
const port: number = parseInt(process.env.PORT || "8080", 10);

// Security headers
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  next();
});

// Middleware
app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? "https://mydomain.dev"
        : "http://localhost:3000",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
  }),
);

app.use(express.json({ limit: "1mb" }));

// Routes
app.use("/api", routes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: "Not found",
  });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error:
      process.env.NODE_ENV === "production"
        ? "Internal server error"
        : err.message,
  });
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });
}
