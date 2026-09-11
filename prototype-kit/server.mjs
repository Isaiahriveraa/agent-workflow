import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const toolkitDir = path.dirname(fileURLToPath(import.meta.url));

function excalidrawAssets() {
  const assetRoot = path.join(toolkitDir, "public", "excalidraw");
  const contentTypes = {
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".svg": "image/svg+xml",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
  };
  return {
    name: "prototype-kit-excalidraw-assets",
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        if (request.method !== "GET" && request.method !== "HEAD") {
          next();
          return;
        }
        const requestUrl = request.url ?? "";
        if (!requestUrl.startsWith("/excalidraw/")) {
          next();
          return;
        }
        let relativePath;
        try {
          relativePath = decodeURIComponent(requestUrl.slice("/excalidraw/".length).split("?")[0]);
        } catch {
          next();
          return;
        }
        const filePath = path.resolve(assetRoot, relativePath);
        const relativeToRoot = path.relative(assetRoot, filePath);
        if (relativeToRoot.startsWith("..") || path.isAbsolute(relativeToRoot)) {
          next();
          return;
        }
        let file;
        try {
          if (!fs.statSync(filePath).isFile()) {
            next();
            return;
          }
          file = fs.readFileSync(filePath);
        } catch {
          next();
          return;
        }
        response.statusCode = 200;
        response.setHeader("Content-Type", contentTypes[path.extname(filePath).toLowerCase()] ?? "application/octet-stream");
        response.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        if (request.method === "GET") response.end(file);
        else response.end();
      });
    },
  };
}

export function createPrototypeConfig({ root, port, strictPort = false, template = false }) {
  const canonicalRoot = path.resolve(root);
  const entry = template ? path.join(toolkitDir, "template", "prototype.tsx") : path.join(canonicalRoot, "prototype.tsx");
  return {
    root: canonicalRoot,
    configFile: false,
    envDir: false,
    envPrefix: "PROTOTYPE_PUBLIC_",
    css: { postcss: {} },
    plugins: [react(), excalidrawAssets()],
    resolve: {
      alias: {
        "@prototype": entry,
        "@prototype-kit": path.join(toolkitDir, "src", "kit.tsx"),
      },
      dedupe: ["react", "react-dom"],
    },
    cacheDir: path.join(canonicalRoot, ".vite"),
    server: {
      host: "127.0.0.1",
      port,
      strictPort,
      fs: {
        strict: true,
        allow: [canonicalRoot, toolkitDir],
      },
    },
  };
}

/**
 * Start a foreground Vite dev server for one attached prototype.
 * @param {{ root: string, port?: number }} options
 */
export async function startPrototypeServer({ root, port }) {
  if (port !== undefined && (!Number.isInteger(port) || port < 1024 || port > 65535)) {
    throw new Error("Prototype server port must be an integer between 1024 and 65535.");
  }
  const server = await createServer(createPrototypeConfig({
    root: path.resolve(root),
    port: port ?? 5173,
    strictPort: port !== undefined,
  }));
  await server.listen();
  const url = server.resolvedUrls?.local?.[0] ?? `http://127.0.0.1:${server.config.server.port}/`;
  console.log(`Prototype server ready at ${url}`);
  return server;
}
