#!/usr/bin/env node
/**
 * Tiny zero-dependency static server for this repo.
 *
 * Why: makes starting the game as simple as `npm start`.
 * No bundler/dev server required; just serves `index.html` and ES modules.
 */

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

function parseArgs(argv) {
  const args = { host: "127.0.0.1", port: 5173, open: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    const next = argv[i + 1];
    if (a === "--host" && next) {
      args.host = next;
      i++;
    } else if (a === "--port" && next) {
      args.port = Number.parseInt(next, 10);
      i++;
    } else if (a === "--open") {
      args.open = true;
    }
  }
  if (!Number.isFinite(args.port) || args.port <= 0) args.port = 5173;
  return args;
}

const MIME = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".svg", "image/svg+xml"],
  [".ico", "image/x-icon"],
  [".txt", "text/plain; charset=utf-8"],
]);

function safeResolveUrlToPath(urlPath) {
  // Decode and normalize, then ensure we can't escape repoRoot.
  const decoded = decodeURIComponent(urlPath.split("?")[0] || "/");
  const clean = decoded.replaceAll("\\", "/");
  const joined = path.resolve(repoRoot, "." + clean);
  if (!joined.startsWith(repoRoot)) return null;
  return joined;
}

function tryOpen(url) {
  const platform = process.platform;
  const cmd =
    platform === "darwin" ? "open" : platform === "win32" ? "cmd" : "xdg-open";
  const args =
    platform === "win32" ? ["/c", "start", "", url] : [url];
  try {
    const child = spawn(cmd, args, { stdio: "ignore", detached: true });
    child.unref();
    return true;
  } catch {
    return false;
  }
}

function send(res, status, body, headers = {}) {
  res.writeHead(status, { "Cache-Control": "no-store", ...headers });
  res.end(body);
}

function serveFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const type = MIME.get(ext) || "application/octet-stream";
  const stream = fs.createReadStream(filePath);
  stream.on("error", () => send(res, 404, "Not found"));
  res.writeHead(200, { "Content-Type": type, "Cache-Control": "no-store" });
  stream.pipe(res);
}

function main() {
  const args = parseArgs(process.argv);
  const server = http.createServer((req, res) => {
    const p = safeResolveUrlToPath(req.url || "/");
    if (!p) return send(res, 400, "Bad request");

    let filePath = p;
    try {
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) filePath = path.join(filePath, "index.html");
    } catch {
      // If the request has no extension, try adding .html (nice for / paths).
      if (!path.extname(filePath)) {
        const html = filePath + ".html";
        if (fs.existsSync(html)) filePath = html;
      }
    }

    if (!fs.existsSync(filePath)) return send(res, 404, "Not found");
    return serveFile(res, filePath);
  });

  function listenWithFallback(port, attemptsLeft) {
    server.once("error", (err) => {
      if (err && err.code === "EADDRINUSE" && attemptsLeft > 0) {
        listenWithFallback(port + 1, attemptsLeft - 1);
        return;
      }
      throw err;
    });

    server.listen(port, args.host, () => {
      const url = `http://${args.host}:${port}`;
      // eslint-disable-next-line no-console
      console.log(`TowerDefenseGPT running at ${url}`);
      // eslint-disable-next-line no-console
      console.log(`Press Ctrl+C to stop.`);
      if (args.open) tryOpen(url);
    });
  }

  listenWithFallback(args.port, 10);
}

main();
