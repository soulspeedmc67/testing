import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { ALL_PRODUCTS } from "../src/data/products.js";

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
    path: "/shop/",
    priority: "0.9",
    changefreq: "daily",
  },
  {
    path: "/categories/",
    priority: "0.8",
    changefreq: "weekly",
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

  // 1. Static Pages
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

  // 2. Product Pages
  for (const product of ALL_PRODUCTS) {
    const productUrl = `${BASE_URL}/product/${product.id}/`;
    const escapedName = (product.name || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const escapedImg = (product.img || "").replace(/&/g, "&amp;");

    xml += `  <url>
    <loc>${productUrl}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
    ${
      escapedImg
        ? `<image:image>
      <image:loc>${escapedImg}</image:loc>
      <image:title>${escapedName}</image:title>
    </image:image>`
        : ""
    }
  </url>
`;
  }

  xml += `</urlset>\n`;
  return xml;
}

const sitemapContent = generateSitemapXml();
const targetPath = path.resolve(__dirname, "../public/sitemap.xml");

fs.writeFileSync(targetPath, sitemapContent, "utf8");
console.log(`[SEO] Sitemap successfully written to ${targetPath} (${ALL_PRODUCTS.length + STATIC_ROUTES.length} URLs indexed)`);
