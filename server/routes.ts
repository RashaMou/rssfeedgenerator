import express, { Request, Response } from "express";
import { HtmlParser } from "./services/htmlParser";

const router = express.Router();

router.get("/", (_, res: Response) => {
  res.send("Hello from the server");
});

router.get("/analyze/:url", async (req: Request, res: Response) => {
  const decodedUrl = decodeURIComponent(req.params.url);
  console.log("Route accessed with URL:", decodedUrl);

  const feedAnalyzer = new HtmlParser(decodedUrl);

  const result = await feedAnalyzer.analyze();
  res.json({ success: true, result });
});

export default router;
