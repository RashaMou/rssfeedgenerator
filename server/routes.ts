import express, { Request, Response, NextFunction } from "express";
import { HtmlParser } from "./services/htmlParser.js";
import generateFeed from "./services/generateFeed.js";
import { AnalysisResult } from "./services/types.js";
import logger from "./logger.js";
import config from "./config.js";

const router = express.Router();
const feedStore = new Map();

router.get("/", (_: Request, res: Response) => {
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
    const decodedUrl = decodeURIComponent(req.params.url);
    logger.info("got url to analyze:", decodedUrl);

    let result: AnalysisResult | null;

    try {
      const feedAnalyzer = new HtmlParser(decodedUrl);
      result = await feedAnalyzer.analyze();

      if (result && result.error) {
        // Send error response with appropriate status code
        res.status(result.error.statusCode || 500).json({
          success: false,
          error: result.error.message,
          result,
        });
        return;
      }

      res.json({ success: true, result });
    } catch (error) {
      logger.error("Error analyzing URL", { url: decodedUrl, error: error });
      res.status(500).json({
        success: false,
        error: "Failed to analyze URL",
        result: {
          items: [],
          logs: [],
          html: "",
          error: {
            message: error instanceof Error ? error.message : "Unknown error",
            statusCode: 500,
          },
        },
      });
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
  "/test-analyze/:url",
  asyncHandler(async (req: Request, res: Response) => {
    const decodedUrl = decodeURIComponent(req.params.url);
    res.json({
      received: decodedUrl,
      encoded: req.params.url,
    });
  }),
);

router.get(
  "/check-url/:url",
  asyncHandler(async (req: Request, res: Response) => {
    const decodedUrl = decodeURIComponent(req.params.url);

    if (!decodedUrl) {
      return res.status(400).json({ error: "URL parameter is required" });
    }

    try {
      const response = await fetch(decodedUrl, {
        method: "HEAD",
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; URL Validator/1.0;)",
        },
      });

      if (response.ok) {
        res.status(200).json({ status: "ok" });
      } else {
        res.status(404).json({ error: "Website not found" });
      }
    } catch (error) {
      res.status(500).json({ error: "Unable to reach website" });
    }
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
