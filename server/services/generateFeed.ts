import { Feed } from "feed";
import { v4 as uuid } from "uuid";
import { FeedItem } from "./types";

const generateFeed = (feedItems: FeedItem[], siteUrl: string) => {
  const feedId = uuid();
  const siteName = new URL(siteUrl).hostname;

  const feed = new Feed({
    title: siteName,
    id: feedId,
    link: `http://localhost:3000/feed/${siteName}.xml`,
    copyright: "",
    feedLinks: {
      json: "https://example.com/json",
    },
  });

  feedItems.forEach((item) => {
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
      date: new Date(item.date),
    });
  });

  return { feedXml: feed.rss2(), feedId };
};

export default generateFeed;