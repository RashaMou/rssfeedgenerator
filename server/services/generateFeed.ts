import { Feed } from "feed";
import { v4 as uuid } from "uuid";
import { FeedItem } from "./types";

const generateFeed = (feedItems: FeedItem[], siteUrl: string) => {
  const feedId = uuid();

  const feed = new Feed({
    title: new URL(siteUrl).hostname,
    id: feedId,
    link: `http://localhost:3000/feed/${feedId}.xml`,
    copyright: "",
    feedLinks: {
      json: "https://example.com/json",
    },
  });

  feedItems.forEach((item) => {
    feed.addItem({
      title: item.title.text,
      id: item.url.text,
      link: item.url.text,
      description: item.description.text,
      author: [
        {
          name: item.author.text,
        },
      ],
      date: new Date(item.date.text),
    });
  });

  return { feedXml: feed.rss2(), feedId };
};

export default generateFeed;
