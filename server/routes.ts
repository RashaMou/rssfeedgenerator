import express, { Request, Response, NextFunction } from "express";
import { HtmlParser } from "./services/htmlParser";
import generateFeed from "./services/generateFeed";

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
    const decodedUrl = decodeURIComponent(req.params.url);

    const feedAnalyzer = new HtmlParser(decodedUrl);

    const result = await feedAnalyzer.analyze();
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
      process.env.NODE_ENV === "production"
        ? "https://rasha.dev/feedatron"
        : "http://localhost:3000",
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

// Global error handler
router.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error:
      process.env.NODE_ENV === "production"
        ? "Internal server error"
        : err.message,
  });
});

export default router;
