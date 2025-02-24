import express, { Request, Response, NextFunction } from "express";
import { HtmlParser } from "./services/htmlParser.js";
import generateFeed from "./services/generateFeed.js";
import { AnalysisResult } from "./services/types.js";
import logger from "./logger.js";
import config from "./config.js";
import { asyncHandler } from "./middleware/asyncHandler.js";
import { NotFoundError, URLProcessingError, HTMLParsingError } from "./types/errors.js";

const router = express.Router();
const feedStore = new Map();

router.get("/", (_: Request, res: Response) => {
  res.send("Hello from the server");
});

// Routes
router.get(
  "/analyze/:url",
  asyncHandler(async (req: Request, res: Response) => {
    // we already do this in check-url. can't we pass it to this?
    const decodedUrl = decodeURIComponent(req.params.url);
    logger.info("got url to analyze:", decodedUrl);


    const result = await new HtmlParser(decodedUrl).analyze();

    if (result?.error) {
      throw new HTMLParsingError(result.error.message, 'INVALID_STRUCTURE');
    }

    res.json({ success: true, result });
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
      throw new NotFoundError(`Feed with ID ${feedId} not found`);
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
      throw new URLProcessingError('URL parameter is required', 'INVALID_FORMAT');
    }

    try {
      const response = await fetch(decodedUrl, {
        method: "HEAD",
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; URL Validator/1.0;)",
        },
      });

      if (!response.ok) {
        throw new URLProcessingError('Website not found', 'UNREACHABLE');
      }
      res.status(200).json({ status: "ok" });
    } catch (error) {
      if (error instanceof URLProcessingError) {
        throw error;
      }

      throw new URLProcessingError('Unable to reach website', 'UNREACHABLE');
    }
  }),
);

export default router;
