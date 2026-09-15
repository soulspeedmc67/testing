import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

let errors = [];
let passes = [];

function check(desc, fn) {
  try {
    const res = fn();
    if (res === false) {
      errors.push(`FAIL: ${desc}`);
    } else {
      passes.push(`PASS: ${desc}`);
    }
  } catch (e) {
    errors.push(`ERROR: ${desc} - ${e.message}`);
  }
}

// 1. Sitemap verification
check("public/sitemap.xml exists and is non-empty", () => {
  const p = path.join(ROOT, "public/sitemap.xml");
  const content = fs.readFileSync(p, "utf8");
  return content.includes("<urlset") && content.includes("https://dashit.co.in/") && content.includes("<loc>");
});

// 2. Robots verification
check("public/robots.txt has Sitemap directive and proper rules", () => {
  const p = path.join(ROOT, "public/robots.txt");
  const content = fs.readFileSync(p, "utf8");
  return content.includes("Sitemap: https://dashit.co.in/sitemap.xml") &&
         content.includes("Disallow: /admin/") &&
         content.includes("Disallow: /checkout/");
});

// 3. Webmanifest verification
check("public/site.webmanifest is valid JSON with required PWA fields", () => {
  const p = path.join(ROOT, "public/site.webmanifest");
  const manifest = JSON.parse(fs.readFileSync(p, "utf8"));
  return Boolean(manifest.name && manifest.short_name && manifest.icons?.length);
});

// 4. OpenGraph preview image verification
check("public/og-image.png exists and is >= 10KB", () => {
  const p = path.join(ROOT, "public/og-image.png");
  const stat = fs.statSync(p);
  return stat.size > 10000;
});

// 5. .htaccess verification
check("public/.htaccess has sitemap, manifest MIME and rewrite rules", () => {
  const p = path.join(ROOT, "public/.htaccess");
  const content = fs.readFileSync(p, "utf8");
  return content.includes("application/manifest+json") &&
         content.includes("sitemap.xml") &&
         content.includes("RewriteRule ^product/([^/]+)/?$ /product/[id]/index.html [L]");
});

console.log("\n=================== SEO ASSETS VALIDATION ===================");
passes.forEach((p) => console.log(`✓ ${p}`));
if (errors.length > 0) {
  errors.forEach((e) => console.error(`✗ ${e}`));
  process.exit(1);
} else {
  console.log("\nAll Technical SEO assets passed validation!\n");
}
