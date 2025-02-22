import { Feed } from "feed";
import { FeedError } from "../types/errors.js";
import { v4 as uuid } from "uuid";
import { FeedItem } from "./types.js";
import config from "../config.js";
import { URLProcessingError } from "../types/errors.js";

const generateFeed = (feedItems: FeedItem[], siteUrl: string) => {
  if (feedItems.length === 0) {
    throw new FeedError("No feed items provided", "INVALID_STRUCTURE");
  }

  const feedId = uuid();
  const siteName = new URL(siteUrl).hostname;

  if (!siteName) {
    throw new URLProcessingError('Invalid URL format', 'INVALID_FORMAT');
  }

  const feed = new Feed({
    title: siteName,
    id: feedId,
    link: `${config.baseUrl}/feed/${siteName}.xml`,
    copyright: "",
    feedLinks: {
      json: `${config.baseUrl}/feed/${siteName}.json`,
    },
  });

  feedItems.forEach((item, index) => {
    if (!item.title || !item.link) {
      throw new FeedError(
        `Missing required fields in item ${index + 1}`,
        "INVALID_STRUCTURE"
      );
    }

    const parsedDate = new Date(item.date);
    if (isNaN(parsedDate.getTime())) {
      throw new FeedError(`Invalid date format in item ${index + 1}`, "DATE_PARSING");
    }

    try {
      feed.addItem({
        title: item.title,
        id: item.link,
        link: item.link,
        description: item.description,
        author: [
          {
            name: item.author,
          },
        ],
        date: parsedDate,
      });
    } catch {
      throw new FeedError(`Failed to generate XML for item ${index + 1}`, "XML_GENERATION")
    }
  });

  return { feedXml: feed.rss2(), feedId };
};

export default generateFeed;
