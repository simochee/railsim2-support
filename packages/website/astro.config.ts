import { defineConfig } from "astro/config";
import {
  copyFileSync,
  createReadStream,
  existsSync,
  mkdirSync,
  readdirSync,
} from "node:fs";
import { resolve, extname } from "node:path";
import { fileURLToPath } from "node:url";
import type { AstroIntegration } from "astro";
import react from "@astrojs/react";
import icon from "astro-icon";
import pagefind from "astro-pagefind";

const HELP_SRC = resolve(
  import.meta.dirname,
  "../../vendor/railsim2/Distribution/jp/RailSim2/Help",
);

const IMAGE_EXTS = new Set([".png", ".jpg", ".gif", ".ico"]);

const MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
};

const EXTENSION_OUT = resolve(
  import.meta.dirname,
  "../vscode-extension/out",
);

const ONIGASM_WASM = resolve(
  import.meta.dirname,
  "../../node_modules/onigasm/lib/onigasm.wasm",
);

/** Serve vendor images in dev, copy to dist/help/ on build */
function vendorImages(): AstroIntegration {
  return {
    name: "vendor-images",
    hooks: {
      "astro:config:setup"({ updateConfig }) {
        updateConfig({
          vite: {
            plugins: [
              {
                name: "vendor-images-dev",
                configureServer(server) {
                  server.middlewares.use((req, res, next) => {
                    const match = (req.url?.split("?")[0] ?? "").match(
                      /^\/([^/]+)$/,
                    );
                    if (!match) return next();
                    const ext = extname(match[1]).toLowerCase();
                    if (!IMAGE_EXTS.has(ext)) return next();
                    const file = resolve(HELP_SRC, match[1]);
                    if (!existsSync(file)) return next();
                    res.setHeader(
                      "Content-Type",
                      MIME[ext] ?? "application/octet-stream",
                    );
                    createReadStream(file).pipe(res);
                  });
                },
              },
            ],
          },
        });
      },
      "astro:build:done"({ dir }) {
        const dest = fileURLToPath(dir);
        for (const file of readdirSync(HELP_SRC)) {
          if (IMAGE_EXTS.has(extname(file).toLowerCase())) {
            copyFileSync(resolve(HELP_SRC, file), resolve(dest, file));
          }
        }
      },
    },
  };
}

function lspAssets(): AstroIntegration {
  const assets: Record<string, { source: string; contentType: string }> = {
    "/server.browser.js": {
      source: resolve(EXTENSION_OUT, "server.browser.js"),
      contentType: "application/javascript",
    },
    "/onigasm.wasm": {
      source: ONIGASM_WASM,
      contentType: "application/wasm",
    },
  };

  return {
    name: "lsp-assets",
    hooks: {
      "astro:config:setup"({ updateConfig }) {
        updateConfig({
          vite: {
            plugins: [
              {
                name: "lsp-assets-dev",
                configureServer(server) {
                  server.middlewares.use((req, res, next) => {
                    const url = req.url?.split("?")[0] ?? "";
                    const asset = assets[url];
                    if (!asset || !existsSync(asset.source)) return next();
                    res.setHeader("Content-Type", asset.contentType);
                    createReadStream(asset.source).pipe(res);
                  });
                },
              },
            ],
          },
        });
      },
      "astro:build:done"({ dir }) {
        const dest = fileURLToPath(dir);
        for (const [urlPath, asset] of Object.entries(assets)) {
          if (existsSync(asset.source)) {
            copyFileSync(
              asset.source,
              resolve(dest, urlPath.slice(1)),
            );
          }
        }
      },
    },
  };
}

export default defineConfig({
  site: "https://railsim2.simochee.net",
  build: { format: "preserve" },
  vite: {
    optimizeDeps: { include: ["encoding-japanese"] },
  },
  integrations: [
    react(),
    pagefind({ indexConfig: { rootSelector: ".mainbox" } }),
    vendorImages(),
    lspAssets(),
    icon(),
  ],
});
