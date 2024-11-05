import cors from "cors";
import routes from "./routes.ts";
import express, { Express } from "express";
import dotenv from "dotenv";

dotenv.config();

const app: Express = express();
const port: number = parseInt(process.env.PORT || "8080", 10);

// Middleware
app.use(cors());
app.use(express.json());
app.use("/api", routes);

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
