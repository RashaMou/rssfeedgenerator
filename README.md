# Feed-a-tron

This project aims to create a web application that transforms website content
into RSS feeds. Users can manage their feeds with functionalities to add, edit,
and delete RSS sources. The application attempts to auto-generate RSS feeds by
analyzing website structures. If auto-generation fails, users can manually
select elements from the website's interface.

## Features

- Feed Management: Add, edit, and delete website feeds.
- Automatic Feed Generation: Attempts to detect relevant elements (title, URL,
  content, date, author) automatically.
- Manual Feed Mapping: Interactive UI for users to manually map elements if
  automatic parsing fails.
- Real-Time Preview: Shows a live preview of the feed as users modify feed
  mappings.

## Tech Stack

- Frontend: TypeScript, HTML, CSS
- Backend: Node.js and Express
- Deployment: Hosted on feedatron.onrender.com
