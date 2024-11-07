import express, { Request, Response, NextFunction } from "express";
import { HtmlParser } from "./services/htmlParser.js";
import generateFeed from "./services/generateFeed.js";
import { AnalysisResult } from "./services/types.js";
import logger from "./logger.js";
import config from "./config.js";

const router = express.Router();
const feedStore = new Map();

router.get("/", (_, res: Response) => {
  res.send("Hello from the server");
});

// Error handling middleware
const asyncHandler =
  (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

// Routes
router.get(
  "/analyze/:url",
  asyncHandler(async (req: Request, res: Response) => {
    console.log({
      NODE_ENV: process.env.NODE_ENV,
      configEnv: config.env,
      URL_PARAM: req.params.url,
      DECODED: decodeURIComponent(req.params.url),
      HEADERS: req.headers,
    });

    const decodedUrl = decodeURIComponent(req.params.url);
    logger.info("got url to analyze:", decodedUrl);

    let result: AnalysisResult | null;

    try {
      const feedAnalyzer = new HtmlParser(decodedUrl);
      result = await feedAnalyzer.analyze();
      res.json({ success: true, result });
    } catch (err) {
      logger.error("Error analyzing URL", { url: decodedUrl, error: err });
      res
        .status(500)
        .json({ success: false, message: "Failed to analyze the URL" });
      return;
    }
  }),
);

router.post(
  "/generate-feed",
  asyncHandler(async (req: Request, res: Response) => {
    const { feedItems, siteUrl } = req.body;

    const { feedXml, feedId } = generateFeed(feedItems, siteUrl);
    feedStore.set(feedId, { feedXml, feedItems, siteUrl });

    const feedUrl = new URL(
      `/api/feed/${feedId}.xml`,
      config.env === "production" ? config.baseUrl : "http://localhost:3000",
    ).toString();

    res.send(feedUrl);
  }),
);

router.get(
  "/feed/:feedId.xml",
  asyncHandler(async (req: Request, res: Response) => {
    const { feedId } = req.params;
    const feedData = feedStore.get(feedId);

    if (!feedData) {
      res.status(404).send("Feed not found");
      return;
    }

    res.set("Content-Type", "text/xml");
    res.send(feedData.feedXml);
  }),
);

router.get(
  "/test-analyze:url",
  asyncHandler(async (req: Request, res: Response) => {
    const decodedUrl = decodeURIComponent(req.params.url);
    res.json({
      received: decodedUrl,
      encoded: req.params.url,
    });
  }),
);

// Global error handler
router.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error(err.stack);
  res.status(500).json({
    success: false,
    error:
      process.env.NODE_ENV === "production"
        ? "Internal server error"
        : err.message,
  });
});

export default router;
