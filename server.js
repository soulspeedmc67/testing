/**
 * DASHit Backend API Server
 * 
 * Provides:
 * 1. GET /api/health
 */

const http = require("http");
const fs = require("fs");
const path = require("path");

// Load .env and .env.local if not already in process.env
const loadEnv = (filename) => {
  const envPath = path.resolve(__dirname, filename);
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx > 0) {
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
};

loadEnv(".env.local");
loadEnv(".env");

const PORT = process.env.PORT || 5001;

const sendJson = (res, statusCode, data) => {
  res.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  });
  res.end(JSON.stringify(data));
};

const handleApiRequest = async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    });
    return res.end();
  }

  const url = req.url.split("?")[0];

  // Health check
  if (req.method === "GET" && (url === "/" || url === "/api/health")) {
    return sendJson(res, 200, {
      status: "ok",
      service: "dashit-backend",
      mode: "cash-on-delivery",
    });
  }

  return sendJson(res, 404, { error: "Endpoint not found" });
};

const server = http.createServer(handleApiRequest);

if (require.main === module) {
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 DASHit backend server running on http://0.0.0.0:${PORT}`);
  });
}

module.exports = { server, handleApiRequest, handleRazorpayRequest: handleApiRequest };
