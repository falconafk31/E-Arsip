// Rakit worker.js dari src/ - setara build.py, memakai Node agar jalan di
// lingkungan build Cloudflare Workers Builds (Node selalu tersedia di sana).
// Jalankan: node build.mjs  lalu: npx wrangler deploy
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const BASE = dirname(fileURLToPath(import.meta.url));
const SRC = join(BASE, "src");

let frontend = readFileSync(join(SRC, "frontend.html"), "utf8");
const css = readFileSync(join(SRC, "terra.css"), "utf8");
const sprite = readFileSync(join(SRC, "sprite.svg.txt"), "utf8");
if (!frontend.includes("/*__APP_CSS__*/") || !frontend.includes("<!--__SPRITE__-->")) {
  throw new Error("placeholder frontend tidak ditemukan");
}
frontend = frontend.replace("/*__APP_CSS__*/", css).replace("<!--__SPRITE__-->", sprite);
const b64 = Buffer.from(frontend, "utf8").toString("base64");

const backend = readFileSync(join(SRC, "backend.js"), "utf8");
if (!backend.includes("__FRONTEND_B64__")) {
  throw new Error("placeholder backend tidak ditemukan");
}
writeFileSync(join(BASE, "worker.js"), backend.replace("__FRONTEND_B64__", b64));
console.log("build OK (node): worker.js terbuat");
