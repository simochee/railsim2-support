/**
 * Vendor help document utilities.
 *
 * Reads RailSim II help files from the vendor submodule (Shift_JIS → UTF-8),
 * extracts page metadata and body content for use in Astro pages.
 *
 * Original help documents: Copyright (C) 2003-2009 インターネット停留所
 * Licensed under LGPL v2.1 — see vendor/railsim2/Distribution/jp/RailSim2/COPYING.txt
 */

import { readdirSync } from "node:fs";
import { resolve } from "node:path";
import { RAILSIM2_ROOT, readShiftJIS } from "./build-utils.js";

const HELP_SRC = resolve(RAILSIM2_ROOT, "Help");

function extractTitle(html: string): string {
  const match = html.match(/<title>(.*?)<\/title>/i);
  return match?.[1] ?? "RailSim II Help";
}

export function extractDescription(html: string): string | undefined {
  const match = html.match(
    /<h2\b[^>]*>\s*概要\s*<\/h2>\s*<p\b[^>]*>([\s\S]*?)<\/p>/i,
  );
  return match?.[1]?.replace(/<[^>]*>/g, "").trim() || undefined;
}

function extractBody(html: string): string {
  const match = html.match(/<body>([\s\S]*)<\/body>/i);
  return match?.[1] ?? "";
}

function fixEntities(html: string): string {
  return html.replace(/&(nbsp|amp|lt|gt|quot)([^;])/g, "&$1;$2");
}

function fixHelpPageLinks(html: string): string {
  // ../index.html → / (top page from help subpage)
  html = html.replace(/href="\.\.\/index\.html"/g, 'href="/"');
  return fixEntities(html);
}

function fixIndexPageLinks(html: string): string {
  // Help/xxx.html and help/xxx.html → xxx.html (flatten)
  html = html.replace(/href="[Hh]elp\//g, 'href="');
  // Help/xxx.png → xxx.png (flatten image paths)
  html = html.replace(/src="[Hh]elp\//g, 'src="');
  // Self-referencing index link
  html = html.replace(/href="index\.html"/g, 'href="/"');
  // COPYING.txt → GitHub
  html = html.replace(
    /href="COPYING\.txt"/g,
    'href="https://github.com/aizentranza/railsim2/blob/master/Distribution/jp/RailSim2/COPYING.txt" target="_blank" rel="noopener"',
  );
  return fixEntities(html);
}

export function getVendorCss(): string {
  return readShiftJIS(resolve(HELP_SRC, "main.css"));
}

export interface HelpPage {
  slug: string;
  title: string;
  body: string;
}

export function getHelpPages(): HelpPage[] {
  const indexRaw = readShiftJIS(resolve(RAILSIM2_ROOT, "index.html"));
  const pages: HelpPage[] = [
    {
      slug: "index",
      title: extractTitle(indexRaw),
      body: fixIndexPageLinks(extractBody(indexRaw)),
    },
  ];

  for (const file of readdirSync(HELP_SRC)) {
    if (!file.endsWith(".html")) continue;
    const raw = readShiftJIS(resolve(HELP_SRC, file));
    pages.push({
      slug: file.replace(".html", ""),
      title: extractTitle(raw),
      body: fixHelpPageLinks(extractBody(raw)),
    });
  }

  return pages;
}

