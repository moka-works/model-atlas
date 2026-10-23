import { createServer } from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, join, normalize, relative, resolve } from "node:path";

const ROOT = resolve("dist");
const PORT = Number(process.env.PORT || process.argv.find((arg) => arg.startsWith("--port="))?.split("=")[1] || 4173);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml",
};

if (!existsSync(ROOT)) {
  console.error("dist/ 不存在，请先运行 npm run build");
  process.exit(1);
}

function resolveFile(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  let filePath = normalize(join(ROOT, decoded));

  if (relative(ROOT, filePath).startsWith("..")) return null;
  if (!existsSync(filePath)) return null;
  if (statSync(filePath).isDirectory()) filePath = join(filePath, "index.html");
  if (!existsSync(filePath) || !statSync(filePath).isFile()) return null;
  return filePath;
}

createServer((req, res) => {
  const pathname = req.url === "/" ? "/index.html" : req.url;
  let filePath = resolveFile(pathname);

  if (!filePath && !extname(pathname.split("?")[0])) {
    const withSlash = pathname.endsWith("/") ? pathname : `${pathname}/`;
    filePath = resolveFile(`${withSlash}index.html`);
    if (filePath && !pathname.endsWith("/")) {
      res.writeHead(301, { Location: withSlash });
      res.end();
      return;
    }
  }

  if (!filePath) {
    const notFound = join(ROOT, "404.html");
    res.writeHead(404, { "Content-Type": MIME[".html"] });
    if (existsSync(notFound)) createReadStream(notFound).pipe(res);
    else res.end("404 Not Found");
    return;
  }

  const ext = extname(filePath).toLowerCase();
  res.writeHead(200, {
    "Content-Type": MIME[ext] || "application/octet-stream",
    "Cache-Control": "no-cache",
  });
  createReadStream(filePath).pipe(res);
}).listen(PORT, "0.0.0.0", () => {
  console.log(`\n  Model Atlas  →  http://localhost:${PORT}\n`);
});
