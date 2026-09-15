const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = 3000;
const ROOT = path.resolve(__dirname, "..", "out");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
};

const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split("?")[0]);
  let filePath = path.join(ROOT, urlPath);

  // Prevent path traversal
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    return res.end("Forbidden");
  }

  // Check if direct file exists
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    return fs.createReadStream(filePath).pipe(res);
  }

  // Try directory index.html
  const indexPath = path.join(filePath, "index.html");
  if (fs.existsSync(indexPath) && fs.statSync(indexPath).isFile()) {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    return fs.createReadStream(indexPath).pipe(res);
  }

  // Try appending .html
  const htmlPath = filePath + ".html";
  if (fs.existsSync(htmlPath) && fs.statSync(htmlPath).isFile()) {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    return fs.createReadStream(htmlPath).pipe(res);
  }

  // Fallback to 404.html
  const notFoundPath = path.join(ROOT, "404.html");
  if (fs.existsSync(notFoundPath)) {
    res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
    return fs.createReadStream(notFoundPath).pipe(res);
  }

  res.writeHead(404);
  res.end("Not Found");
});

// Ignore stdin so process never exits on EOF
process.stdin.resume();

server.listen(PORT, "0.0.0.0", () => {
  console.log(`DASHit static server running at http://localhost:${PORT}`);
});
