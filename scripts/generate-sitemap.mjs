import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = "https://dashit.co.in";

const STATIC_ROUTES = [
  {
    path: "/",
    priority: "1.0",
    changefreq: "daily",
  },
  {
    path: "/help/",
    priority: "0.6",
    changefreq: "monthly",
  },
  {
    path: "/privacy/",
    priority: "0.5",
    changefreq: "monthly",
  },
  {
    path: "/terms/",
    priority: "0.5",
    changefreq: "monthly",
  },
  {
    path: "/complaints/",
    priority: "0.4",
    changefreq: "monthly",
  },
  {
    path: "/delete-account/",
    priority: "0.5",
    changefreq: "monthly",
  },
];

function generateSitemapXml() {
  const currentDate = new Date().toISOString().split("T")[0];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
`;

  // The pages the website still has
  for (const route of STATIC_ROUTES) {
    const url = `${BASE_URL}${route.path}`;
    xml += `  <url>
    <loc>${url}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
  </url>
`;
  }

  // No product pages: ordering moved to the apps, and the web shop is gone.

  xml += `</urlset>\n`;
  return xml;
}

const sitemapContent = generateSitemapXml();
const targetPath = path.resolve(__dirname, "../public/sitemap.xml");

fs.writeFileSync(targetPath, sitemapContent, "utf8");
console.log(`[SEO] Sitemap successfully written to ${targetPath} (${STATIC_ROUTES.length} URLs indexed)`);
