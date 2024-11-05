import express, { Request, Response } from "express";
import { HtmlParser } from "./services/htmlParser";
import generateFeed from "./services/generateFeed";

const router = express.Router();
const feedStore = new Map();

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

router.post("/generate-feed", (req, res) => {
  const { feedItems, siteUrl } = req.body;

  const { feedXml, feedId } = generateFeed(feedItems, siteUrl);

  // Store the feed data in an in-memory store
  feedStore.set(feedId, { feedXml, feedItems, siteUrl });

  res.send(`http://localhost:3000/api/feed/${feedId}.xml`);
});

router.get("/feed/:feedId.xml", (req: Request, res: Response) => {
  const { feedId } = req.params;

  const feedData = feedStore.get(feedId);

  if (!feedData) {
    res.status(404).send("Feed not found");
    return;
  }

  res.set("Content-Type", "text/xml");
  res.send(feedData.feedXml);
});

export default router;
