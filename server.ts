import express from "express";
import { createServer as createViteServer } from "vite";
import * as cheerio from "cheerio";
import TurndownService from "turndown";
import path from "path";
import Database from "better-sqlite3";

const db = new Database("scrapes.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS scrapes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    url TEXT NOT NULL,
    title TEXT,
    markdown TEXT,
    metadata TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  const turndownService = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced'
  });

  // API Routes
  app.get("/api/history", (req, res) => {
    const history = db.prepare("SELECT * FROM scrapes ORDER BY created_at DESC LIMIT 50").all();
    res.json(history);
  });

  app.delete("/api/history", (req, res) => {
    db.prepare("DELETE FROM scrapes").run();
    res.json({ success: true });
  });

  app.delete("/api/history/:id", (req, res) => {
    const { id } = req.params;
    db.prepare("DELETE FROM scrapes WHERE id = ?").run(id);
    res.json({ success: true });
  });

  app.post("/api/scrape", async (req, res) => {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      // Remove unwanted elements
      $('script, style, nav, footer, iframe, noscript, .ads, #ads, header, aside, svg, canvas').remove();

      const title = $('title').text().trim() || $('h1').first().text().trim() || 'Untitled';
      
      // Try to find the main content with better fallback
      let contentHtml = '';
      const selectors = ['main', 'article', '.content', '#content', '.post', '.article', '.main'];
      
      for (const selector of selectors) {
        const el = $(selector);
        if (el.length > 0 && el.text().trim().length > 200) {
          contentHtml = el.html() || '';
          break;
        }
      }

      if (!contentHtml) {
        contentHtml = $('body').html() || '';
      }
      
      const markdown = turndownService.turndown(contentHtml);
      
      // Handle relative URLs in metadata
      const resolveUrl = (u?: string) => {
        if (!u) return undefined;
        try {
          return new URL(u, url).href;
        } catch (e) {
          return u;
        }
      };

      const metadata = {
        description: $('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content'),
        ogImage: resolveUrl($('meta[property="og:image"]').attr('content')),
        canonical: resolveUrl($('link[rel="canonical"]').attr('href')),
      };

      // Save to DB
      db.prepare("INSERT INTO scrapes (url, title, markdown, metadata) VALUES (?, ?, ?, ?)")
        .run(url, title, markdown, JSON.stringify(metadata));

      res.json({
        title,
        url,
        markdown,
        metadata
      });
    } catch (error: any) {
      console.error("Scrape error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/crawl", async (req, res) => {
    const { url, limit = 10 } = req.body;

    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }

    try {
      const baseUrl = new URL(url).origin;
      const visited = new Set<string>();
      const queue = [url];
      const results = [];

      while (queue.length > 0 && results.length < limit) {
        const currentUrl = queue.shift()!;
        if (visited.has(currentUrl)) continue;
        visited.add(currentUrl);

        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000);

          const response = await fetch(currentUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            signal: controller.signal
          });
          clearTimeout(timeoutId);

          if (!response.ok) continue;
          
          const contentType = response.headers.get('content-type');
          if (!contentType || !contentType.includes('text/html')) continue;

          const html = await response.text();
          const $ = cheerio.load(html);

          // Extract links for further crawling
          $('a').each((_, el) => {
            const href = $(el).attr('href');
            if (href) {
              try {
                const absoluteUrl = new URL(href, currentUrl).href.split('#')[0]; // Remove hash
                if (absoluteUrl.startsWith(baseUrl) && !visited.has(absoluteUrl) && !queue.includes(absoluteUrl)) {
                  // Avoid common non-content extensions
                  if (!absoluteUrl.match(/\.(jpg|jpeg|png|gif|pdf|zip|gz|mp4|mp3|css|js)$/i)) {
                    queue.push(absoluteUrl);
                  }
                }
              } catch (e) {}
            }
          });

          // Scrape current page
          $('script, style, nav, footer, header, aside, svg').remove();
          const contentHtml = $('main').html() || $('article').html() || $('body').html() || '';
          const markdown = turndownService.turndown(contentHtml);
          const title = $('title').text().trim() || 'Untitled';

          const resultItem = {
            url: currentUrl,
            title,
            markdown,
            metadata: JSON.stringify({
              description: $('meta[name="description"]').attr('content')
            })
          };

          results.push(resultItem);

          // Save to DB
          db.prepare("INSERT INTO scrapes (url, title, markdown, metadata) VALUES (?, ?, ?, ?)")
            .run(currentUrl, title, markdown, resultItem.metadata);

        } catch (e) {
          console.error(`Error crawling ${currentUrl}:`, e);
        }
      }

      res.json({ results });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
