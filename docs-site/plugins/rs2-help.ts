/**
 * Vite plugin for RailSim II help documentation.
 *
 * - Converts vendor Shift_JIS HTML → UTF-8 in the config hook
 * - Processes banner CSS Module (postcss-modules) at build time
 * - Injects an "unofficial mirror" banner via transformIndexHtml
 * - Provides rollup input entries for MPA build
 *
 * Original help documents: Copyright (C) 2003-2009 インターネット停留所
 * Licensed under LGPL v2.1 — see vendor/railsim2/Distribution/jp/RailSim2/COPYING.txt
 */

import { readFileSync, writeFileSync, mkdirSync, copyFileSync, readdirSync } from "node:fs";
import { resolve, extname } from "node:path";
import type { Plugin } from "vite";
import postcss from "postcss";
import postcssModules from "postcss-modules";
import iconv from "iconv-lite";

const RAILSIM2_ROOT = resolve(
  __dirname,
  "../../vendor/railsim2/Distribution/jp/RailSim2",
);
const HELP_SRC = resolve(RAILSIM2_ROOT, "Help");
const PAGES_OUT = resolve(__dirname, "../pages");
const HELP_OUT = resolve(PAGES_OUT, "Help");

const GLOBAL_CSS_SRC = resolve(__dirname, "../global.css");
const BANNER_CSS_SRC = resolve(__dirname, "../banner.module.css");

function loadIcon(name: string): string {
  const svg = readFileSync(
    resolve(__dirname, `../../node_modules/@tabler/icons/icons/outline/${name}.svg`),
    "utf-8",
  );
  // Strip class attribute and collapse to single line
  return svg.replace(/\s*class="[^"]*"/, "").replace(/\n\s*/g, " ").trim();
}

// ---------------------------------------------------------------------------
// CSS Module processing
// ---------------------------------------------------------------------------

async function processBannerCss(): Promise<{
  css: string;
  classMap: Record<string, string>;
}> {
  const raw = readFileSync(BANNER_CSS_SRC, "utf-8");
  let classMap: Record<string, string> = {};

  const result = await postcss([
    postcssModules({
      generateScopedName: "[name]__[local]___[hash:base64:5]",
      getJSON(_, json) {
        classMap = json;
      },
    }),
  ]).process(raw, { from: BANNER_CSS_SRC });

  return { css: result.css, classMap };
}

function buildBannerHtml(cls: Record<string, string>): string {
  const iconGithub = loadIcon("brand-github");
  const iconVscode = loadIcon("brand-vscode");

  return `\
<div class="${cls.banner}">
  <div class="${cls.inner}">
    <span class="${cls.left}">
      <span class="${cls.badge}">UNOFFICIAL</span>
      <span>このページは RailSim II ヘルプドキュメントの非公式ミラーです。</span>
    </span>
    <span class="${cls.links}">
      <a href="https://github.com/simochee/railsim2-support" target="_blank" rel="noopener">${iconVscode} RailSim2 Support</a>
      <a href="https://github.com/aizentranza/railsim2" target="_blank" rel="noopener">${iconGithub} aizentranza/railsim2</a>
    </span>
  </div>
</div>`;
}

// ---------------------------------------------------------------------------
// Shift_JIS → UTF-8 file generation
// ---------------------------------------------------------------------------

function readShiftJIS(filePath: string): string {
  return iconv.decode(readFileSync(filePath), "shift_jis");
}

function modernizeHtml(html: string): string {
  html = html.replace(/<!DOCTYPE[^>]*>/i, "<!DOCTYPE html>");

  html = html.replace(
    /<meta\s+http-equiv="Content-Type"\s+content="text\/html;\s*charset=shift_jis"\s*>/i,
    '<meta charset="UTF-8">',
  );

  html = html.replace(/&(nbsp|amp|lt|gt|quot)([^;])/g, "&$1;$2");

  // Inject CSS links so Vite can bundle them
  html = html.replace(
    /<\/head>/i,
    '<link rel="stylesheet" href="/global.css">\n<link rel="stylesheet" href="/banner.css">\n</head>',
  );

  return html;
}

function processIndexHtml(html: string): string {
  html = modernizeHtml(html);

  // Fix case-inconsistent links: help/ → Help/
  html = html.replace(/href="help\//g, 'href="Help/');

  // Fix COPYING.txt link to point to GitHub
  html = html.replace(
    /href="COPYING\.txt"/g,
    'href="https://github.com/aizentranza/railsim2/blob/master/Distribution/jp/RailSim2/COPYING.txt" target="_blank" rel="noopener"',
  );

  return html;
}

function generatePages(bannerCss: string): Record<string, string> {
  mkdirSync(HELP_OUT, { recursive: true });

  // Copy global.css and write processed banner CSS
  copyFileSync(GLOBAL_CSS_SRC, resolve(PAGES_OUT, "global.css"));
  writeFileSync(resolve(PAGES_OUT, "banner.css"), bannerCss, "utf-8");

  // Root index.html
  const indexRaw = readShiftJIS(resolve(RAILSIM2_ROOT, "index.html"));
  writeFileSync(resolve(PAGES_OUT, "index.html"), processIndexHtml(indexRaw), "utf-8");

  // Help/*.html + assets
  const inputs: Record<string, string> = {
    index: resolve(PAGES_OUT, "index.html"),
  };

  for (const file of readdirSync(HELP_SRC)) {
    const srcPath = resolve(HELP_SRC, file);
    const destPath = resolve(HELP_OUT, file);
    const ext = extname(file).toLowerCase();

    if (ext === ".html") {
      writeFileSync(destPath, modernizeHtml(readShiftJIS(srcPath)), "utf-8");
      inputs[`Help/${file.replace(".html", "")}`] = destPath;
    } else if ([".css", ".png", ".jpg", ".gif", ".ico"].includes(ext)) {
      if (ext === ".css") {
        writeFileSync(destPath, readShiftJIS(srcPath), "utf-8");
      } else {
        copyFileSync(srcPath, destPath);
      }
    }
  }

  return inputs;
}

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------

export function rs2Help(): Plugin {
  let bannerHtml = "";

  return {
    name: "rs2-help",

    async config() {
      const { css, classMap } = await processBannerCss();
      bannerHtml = buildBannerHtml(classMap);
      const inputs = generatePages(css);

      return {
        root: PAGES_OUT,
        build: {
          outDir: resolve(__dirname, "../dist"),
          emptyOutDir: true,
          rollupOptions: { input: inputs },
        },
      };
    },

    transformIndexHtml(html) {
      html = html.replace(/<body>/i, `<body>\n${bannerHtml}`);
      return html;
    },
  };
}
