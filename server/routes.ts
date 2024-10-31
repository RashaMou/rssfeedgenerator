import express, { Response } from "express";

const router = express.Router();

router.get("/", (_, res: Response) => {
  res.send("Hello from the server");
});

router.post("/analyze", (_, res: Response) => {
  res.json({ success: true, message: "analyzed website" });
});

export default router;
