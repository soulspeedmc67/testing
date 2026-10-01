#!/usr/bin/env node
/**
 * Renders the DASHIT rider (scripts/rider3d/index.html) in headless Chromium.
 *
 *   node scripts/rider3d/render.mjs                 24 frames + the .glb into data/rider3d/
 *   node scripts/rider3d/render.mjs --preview 0,90,180,270    a contact sheet for a look
 *
 * A tiny local server serves the page, three.js (from node_modules) and the
 * logo pieces, and takes the frames the page posts back.
 */
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join, extname } from "node:path";

const root = process.cwd();
const out = join(root, "data/rider3d");
mkdirSync(out, { recursive: true });
const previewAt = process.argv.indexOf("--preview");
const preview = previewAt > 0 ? process.argv[previewAt + 1] : "";

const types = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".png": "image/png", ".json": "application/json" };
let finish;
const finished = new Promise((r) => (finish = r));

const server = createServer((req, res) => {
  const url = new URL(req.url, "http://x");
  if (req.method === "POST") {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      if (url.pathname === "/done") finish();
      else if (url.pathname.startsWith("/save/")) writeFileSync(join(out, url.pathname.slice(6)), Buffer.concat(chunks));
      res.end("ok");
    });
    return;
  }
  let file;
  if (url.pathname === "/") file = join(root, "scripts/rider3d/index.html");
  else if (url.pathname.startsWith("/three/")) file = join(root, "node_modules/three", url.pathname.slice(7));
  else if (url.pathname.startsWith("/assets/")) file = join(root, "android-compose/app/src/main/res/drawable-xxxhdpi", url.pathname.slice(8));
  if (!file || !existsSync(file)) { res.statusCode = 404; return res.end("not found"); }
  res.setHeader("Content-Type", types[extname(file)] || "application/octet-stream");
  res.end(readFileSync(file));
});
await new Promise((r) => server.listen(8765, r));

const chromeDir = readdirSync(join(homedir(), ".cache/ms-playwright")).find((d) => d.startsWith("chromium-"));
const chrome = join(homedir(), ".cache/ms-playwright", chromeDir, "chrome-linux64/chrome");
const flags = [
  "--headless=new", "--no-sandbox", "--use-angle=swiftshader", "--enable-unsafe-swiftshader",
  "--ignore-gpu-blocklist", "--hide-scrollbars", "--window-size=1500,1100",
];
if (preview) {
  const shot = join(out, "preview.png");
  const proc = spawn(chrome, [...flags, `--screenshot=${shot}`, "--virtual-time-budget=25000", `http://localhost:8765/?preview=${preview}`], { stdio: "ignore" });
  await new Promise((r) => proc.on("exit", r));
  console.log("preview:", shot);
} else {
  const proc = spawn(chrome, [...flags, "--remote-debugging-port=0", "http://localhost:8765/"], { stdio: "ignore" });
  await Promise.race([finished, new Promise((_, rej) => setTimeout(() => rej(new Error("timed out")), 240000))]);
  proc.kill();
  console.log("frames and model in", out);
}
server.close();
