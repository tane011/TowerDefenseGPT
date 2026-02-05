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
import os from "node:os";
import { fileURLToPath } from "node:url";
import { spawn, spawnSync } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const LOCK_PATH = path.join(os.tmpdir(), "towerdefensegpt-server.lock");
const STOP_TIMEOUT_MS = 3000;
const STOP_POLL_MS = 150;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

function isProcessAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function readLockFile() {
  try {
    const raw = fs.readFileSync(LOCK_PATH, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeLockFile(data) {
  try {
    fs.writeFileSync(LOCK_PATH, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

function serveFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const type = MIME.get(ext) || "application/octet-stream";
  const stream = fs.createReadStream(filePath);
  stream.on("error", () => send(res, 404, "Not found"));
  res.writeHead(200, { "Content-Type": type, "Cache-Control": "no-store" });
  stream.pipe(res);
}

async function stopPid(pid, label) {
  if (!Number.isFinite(pid) || pid <= 0) return false;
  if (pid === process.pid) return false;
  if (!isProcessAlive(pid)) return true;

  const tag = label ? ` (${label})` : "";
  // eslint-disable-next-line no-console
  console.log(`Stopping process ${pid}${tag}...`);
  try {
    process.kill(pid, "SIGTERM");
  } catch {
    return false;
  }

  const deadline = Date.now() + STOP_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (!isProcessAlive(pid)) return true;
    await sleep(STOP_POLL_MS);
  }

  try {
    process.kill(pid, "SIGKILL");
  } catch {
    return false;
  }

  const killDeadline = Date.now() + STOP_TIMEOUT_MS;
  while (Date.now() < killDeadline) {
    if (!isProcessAlive(pid)) return true;
    await sleep(STOP_POLL_MS);
  }

  return !isProcessAlive(pid);
}

function listOtherServerPids() {
  if (process.platform === "win32") return [];
  const scriptPath = path.resolve(repoRoot, "scripts/start.mjs");
  const result = spawnSync("ps", ["-ax", "-o", "pid=,command="], { encoding: "utf8" });
  if (result.error || result.status !== 0 || !result.stdout) return [];
  const pids = new Set();
  for (const line of result.stdout.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const match = trimmed.match(/^(\d+)\s+(.*)$/);
    if (!match) continue;
    const pid = Number(match[1]);
    if (!Number.isFinite(pid) || pid === process.pid) continue;
    const command = match[2];
    if (command.includes(scriptPath) || command.includes("scripts/start.mjs")) {
      pids.add(pid);
    }
  }
  return [...pids];
}

function listPidsOnPort(port) {
  if (!Number.isFinite(port) || port <= 0) return [];
  const pids = new Set();
  if (process.platform === "win32") {
    const result = spawnSync("netstat", ["-ano", "-p", "tcp"], { encoding: "utf8" });
    if (result.error || result.status !== 0 || !result.stdout) return [];
    const token = `:${port}`;
    for (const line of result.stdout.split("\n")) {
      if (!line.includes(token)) continue;
      const parts = line.trim().split(/\s+/);
      if (parts.length < 5) continue;
      const local = parts[1] || "";
      const state = parts[parts.length - 2];
      const pid = Number(parts[parts.length - 1]);
      if (!local.includes(token)) continue;
      if (state !== "LISTENING") continue;
      if (Number.isFinite(pid)) pids.add(pid);
    }
    return [...pids];
  }

  const result = spawnSync("lsof", ["-nP", `-iTCP:${port}`, "-sTCP:LISTEN"], { encoding: "utf8" });
  if (result.error || result.status !== 0 || !result.stdout) return [];
  for (const line of result.stdout.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("COMMAND")) continue;
    const parts = trimmed.split(/\s+/);
    const pid = Number(parts[1]);
    if (Number.isFinite(pid)) pids.add(pid);
  }
  return [...pids];
}

async function stopOtherServerProcesses() {
  const pids = listOtherServerPids();
  if (!pids.length) return;
  // eslint-disable-next-line no-console
  console.log(`Stopping ${pids.length} other TowerDefenseGPT server process${pids.length === 1 ? "" : "es"}...`);
  for (const pid of pids) {
    await stopPid(pid, "other TowerDefenseGPT server");
  }
}

async function freePort(port) {
  const pids = listPidsOnPort(port).filter((pid) => pid !== process.pid);
  if (!pids.length) return;
  // eslint-disable-next-line no-console
  console.log(`Port ${port} is in use. Stopping ${pids.length} process${pids.length === 1 ? "" : "es"} holding it...`);
  for (const pid of pids) {
    await stopPid(pid, `port ${port}`);
  }
}

async function stopExistingServer(existing) {
  if (!existing?.pid) return false;
  return stopPid(existing.pid, "existing TowerDefenseGPT server");
}

async function main() {
  const args = parseArgs(process.argv);
  let lockHeld = false;
  let lockData = null;

  const acquireLock = async () => {
    try {
      const fd = fs.openSync(LOCK_PATH, "wx");
      fs.closeSync(fd);
      lockData = { pid: process.pid, host: args.host, port: null, startedAt: Date.now() };
      writeLockFile(lockData);
      lockHeld = true;
      return true;
    } catch (err) {
      if (!err || err.code !== "EEXIST") throw err;
      const existing = readLockFile();
      if (!existing) {
        try {
          const stat = fs.statSync(LOCK_PATH);
          const ageMs = Date.now() - stat.mtimeMs;
          if (ageMs < 5000) {
            // eslint-disable-next-line no-console
            console.log("TowerDefenseGPT launch already in progress.");
            return false;
          }
          fs.unlinkSync(LOCK_PATH);
          return acquireLock();
        } catch {
          // eslint-disable-next-line no-console
          console.log("TowerDefenseGPT launch already in progress.");
          return false;
        }
      }
      if (existing?.pid && isProcessAlive(existing.pid)) {
        const stopped = await stopExistingServer(existing);
        if (!stopped) {
          const url = existing.port ? `http://${existing.host || args.host}:${existing.port}` : null;
          // eslint-disable-next-line no-console
          console.log("TowerDefenseGPT is already running.");
          if (url) {
            // eslint-disable-next-line no-console
            console.log(`Open ${url}`);
          }
          return false;
        }
        try {
          fs.unlinkSync(LOCK_PATH);
        } catch {
          // ignore
        }
        return acquireLock();
      }
      try {
        fs.unlinkSync(LOCK_PATH);
      } catch {
        // ignore
      }
      return acquireLock();
    }
  };

  await stopOtherServerProcesses();
  await freePort(args.port);

  if (!(await acquireLock())) return;

  const cleanupLock = () => {
    if (!lockHeld) return;
    lockHeld = false;
    try {
      fs.unlinkSync(LOCK_PATH);
    } catch {
      // ignore
    }
  };

  process.on("exit", cleanupLock);
  process.on("SIGINT", () => {
    cleanupLock();
    process.exit(0);
  });
  process.on("SIGTERM", () => {
    cleanupLock();
    process.exit(0);
  });

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

  server.once("error", (err) => {
    if (err && err.code === "EADDRINUSE") {
      const url = `http://${args.host}:${args.port}`;
      // eslint-disable-next-line no-console
      console.log(`Port ${args.port} is already in use.`);
      // eslint-disable-next-line no-console
      console.log(`If TowerDefenseGPT is running, open ${url}`);
      cleanupLock();
      process.exit(0);
      return;
    }
    throw err;
  });

  server.listen(args.port, args.host, () => {
    const url = `http://${args.host}:${args.port}`;
    if (lockHeld && lockData) {
      lockData.port = args.port;
      writeLockFile(lockData);
    }
    // eslint-disable-next-line no-console
    console.log(`TowerDefenseGPT running at ${url}`);
    // eslint-disable-next-line no-console
    console.log(`Press Ctrl+C to stop.`);
    if (args.open) tryOpen(url);
  });
}

main();
