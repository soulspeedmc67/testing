import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUT = path.resolve(__dirname, "../out");

const tests = [];
let passed = 0;
let failed = 0;

function assert(condition, testName) {
  if (condition) {
    passed++;
    console.log(`  ✓ PASS: ${testName}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${testName}`);
  }
}

console.log("\n=================== VERIFYING COMPILED HTML IN out/ ===================");

// 1. Home Page SEO
const homeHtml = fs.readFileSync(path.join(OUT, "index.html"), "utf8");
assert(homeHtml.includes("<title>DASHIT — Grocery Delivery App in Anantnag"), "Home title optimized");
assert(homeHtml.includes('name="description" content="Groceries and everyday essentials delivered across Anantnag'), "Home description present");
assert(homeHtml.includes('<link rel="canonical" href="https://dashit.co.in/"/>'), "Home canonical link present");
assert(homeHtml.includes('property="og:image" content="https://dashit.co.in/og-image.png"'), "Home og:image present");
assert(homeHtml.includes('name="twitter:card" content="summary_large_image"'), "Home twitter:card present");
assert(homeHtml.includes('"@type":"WebSite"'), "Home WebSite JSON-LD present");
assert(homeHtml.includes('"@type":"Organization"'), "Home Organization JSON-LD present");
assert(homeHtml.includes('"@type":"GroceryStore"'), "Home GroceryStore JSON-LD present");
assert(homeHtml.includes('<link rel="manifest" href="/site.webmanifest"/>'), "Home manifest linked");

// 2. The web shop is built (back for launch, 5 October 2026)
for (const page of ["shop", "categories", "search", "checkout", "orders", "account", "product", "login"]) {
  assert(fs.existsSync(path.join(OUT, page, "index.html")), `/${page}/ page in the build`);
}
assert(!fs.existsSync(path.join(OUT, "tobacco")), "No tobacco page on the website");

// 3. Help page
const helpHtml = fs.readFileSync(path.join(OUT, "help/index.html"), "utf8");
assert(helpHtml.includes("<title>"), "Help page has a title");

// 5. Legal Pages SEO
const privHtml = fs.readFileSync(path.join(OUT, "privacy/index.html"), "utf8");
assert(privHtml.includes('<link rel="canonical" href="https://dashit.co.in/privacy/"/>'), "Privacy canonical link present");
const termsHtml = fs.readFileSync(path.join(OUT, "terms/index.html"), "utf8");
assert(termsHtml.includes('<link rel="canonical" href="https://dashit.co.in/terms/"/>'), "Terms canonical link present");
const delHtml = fs.readFileSync(path.join(OUT, "delete-account/index.html"), "utf8");
assert(delHtml.includes('<link rel="canonical" href="https://dashit.co.in/delete-account/"/>'), "Delete account canonical link present");

// 7. Sitemap & Robots
const sitemap = fs.readFileSync(path.join(OUT, "sitemap.xml"), "utf8");
assert(sitemap.includes("<loc>https://dashit.co.in/</loc>") && sitemap.includes("https://dashit.co.in/help/"), "Sitemap lists the home and help pages");
assert(sitemap.includes("https://dashit.co.in/shop/") && !sitemap.includes("/product/"), "Sitemap lists the shop, not single products");
const robots = fs.readFileSync(path.join(OUT, "robots.txt"), "utf8");
assert(robots.includes("Sitemap: https://dashit.co.in/sitemap.xml"), "Robots.txt points to sitemap");

console.log(`\nResults: ${passed} passed, ${failed} failed.\n`);
if (failed > 0) process.exit(1);
