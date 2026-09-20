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
assert(homeHtml.includes("<title>DASHIT — #1 Grocery Delivery App in Anantnag"), "Home title optimized");
assert(homeHtml.includes('name="description" content="Download the DASHIT mobile app for Android &amp; iOS. #1 fastest grocery delivery across Anantnag.'), "Home description present");
assert(homeHtml.includes('<link rel="canonical" href="https://dashit.co.in/"/>'), "Home canonical link present");
assert(homeHtml.includes('property="og:image" content="https://dashit.co.in/og-image.png"'), "Home og:image present");
assert(homeHtml.includes('name="twitter:card" content="summary_large_image"'), "Home twitter:card present");
assert(homeHtml.includes('"@type":"WebSite"'), "Home WebSite JSON-LD present");
assert(homeHtml.includes('"@type":"Organization"'), "Home Organization JSON-LD present");
assert(homeHtml.includes('"@type":"GroceryStore"'), "Home GroceryStore JSON-LD present");
assert(homeHtml.includes('<link rel="manifest" href="/site.webmanifest"/>'), "Home manifest linked");

// 2. Shop Page SEO
const shopHtml = fs.readFileSync(path.join(OUT, "shop/index.html"), "utf8");
assert(shopHtml.includes("<title>Online Grocery Store Anantnag — #1 Fastest Grocery Delivery"), "Shop title optimized");
assert(shopHtml.includes('<link rel="canonical" href="https://dashit.co.in/shop/"/>'), "Shop canonical link present");
assert(shopHtml.includes('"@type":"BreadcrumbList"'), "Shop BreadcrumbList JSON-LD present");

// 3. Categories Page SEO
const catHtml = fs.readFileSync(path.join(OUT, "categories/index.html"), "utf8");
assert(catHtml.includes("— Grocery Categories"), "Categories title present");
assert(catHtml.includes('<link rel="canonical" href="https://dashit.co.in/categories/"/>'), "Categories canonical link present");
assert(catHtml.includes('"@type":"BreadcrumbList"'), "Categories BreadcrumbList JSON-LD present");

// 4. Product SSG Page SEO
const p1Html = fs.readFileSync(path.join(OUT, "product/1/index.html"), "utf8");
assert(p1Html.includes("<title>Amul Gold Full Cream Milk — Buy Online in Anantnag"), "Product 1 title present");
assert(p1Html.includes('<link rel="canonical" href="https://dashit.co.in/product/1/"/>'), "Product 1 canonical link present");
assert(p1Html.includes('"@type":"Product"'), "Product 1 Product JSON-LD present");
assert(p1Html.includes('"price":36') && p1Html.includes('"priceCurrency":"INR"'), "Product 1 price and currency in JSON-LD");
assert(p1Html.includes('"availability":"https://schema.org/InStock"'), "Product 1 InStock schema");
assert(p1Html.includes('property="og:type" content="product"'), "Product 1 og:type is product");

// 5. Legal Pages SEO
const privHtml = fs.readFileSync(path.join(OUT, "privacy/index.html"), "utf8");
assert(privHtml.includes('<link rel="canonical" href="https://dashit.co.in/privacy/"/>'), "Privacy canonical link present");
const termsHtml = fs.readFileSync(path.join(OUT, "terms/index.html"), "utf8");
assert(termsHtml.includes('<link rel="canonical" href="https://dashit.co.in/terms/"/>'), "Terms canonical link present");
const delHtml = fs.readFileSync(path.join(OUT, "delete-account/index.html"), "utf8");
assert(delHtml.includes('<link rel="canonical" href="https://dashit.co.in/delete-account/"/>'), "Delete account canonical link present");

// 6. Robots Safeguards on Internal/Private Pages
const searchHtml = fs.readFileSync(path.join(OUT, "search/index.html"), "utf8");
assert(searchHtml.includes('content="noindex, follow"'), "Search page has noindex, follow");

const cartHtml = fs.readFileSync(path.join(OUT, "cart/index.html"), "utf8");
assert(cartHtml.includes('content="noindex, nofollow, noarchive"'), "Cart page has noindex, nofollow");

const checkoutHtml = fs.readFileSync(path.join(OUT, "checkout/index.html"), "utf8");
assert(checkoutHtml.includes('content="noindex, nofollow, noarchive"'), "Checkout page has noindex, nofollow");

const ordersHtml = fs.readFileSync(path.join(OUT, "orders/index.html"), "utf8");
assert(ordersHtml.includes('content="noindex, nofollow, noarchive"'), "Orders page has noindex, nofollow");

const accountHtml = fs.readFileSync(path.join(OUT, "account/index.html"), "utf8");
assert(accountHtml.includes('content="noindex, nofollow, noarchive"'), "Account page has noindex, nofollow");

// 7. Sitemap & Robots
const sitemap = fs.readFileSync(path.join(OUT, "sitemap.xml"), "utf8");
assert(sitemap.includes("https://dashit.co.in/product/1/") && sitemap.includes("<image:image>"), "Sitemap includes products and images");
const robots = fs.readFileSync(path.join(OUT, "robots.txt"), "utf8");
assert(robots.includes("Sitemap: https://dashit.co.in/sitemap.xml"), "Robots.txt points to sitemap");

console.log(`\nResults: ${passed} passed, ${failed} failed.\n`);
if (failed > 0) process.exit(1);
