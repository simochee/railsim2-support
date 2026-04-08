import * as fs from "node:fs";
import * as iconv from "iconv-lite";
import * as cheerio from "cheerio";
import type { CheerioAPI } from "cheerio";

export interface BnfBlock {
  nontermName: string;
  body: string;
  refs: string[];
  rawHtml: string;
  fileName?: string;
}

/**
 * Read a Shift-JIS encoded HTML file and return a CheerioAPI instance.
 */
export function readHelpHtml(filePath: string): CheerioAPI {
  const buf = fs.readFileSync(filePath);
  const html = iconv.decode(buf, "Shift_JIS");
  return cheerio.load(html);
}

/**
 * Extract BNF grammar blocks from the parsed HTML.
 *
 * Looks for `<div class="contbox cb_src">` containers that hold
 * `<pre class="nonterm">` (the production name) followed by
 * `<pre class="ind">` or `<pre class="ind_j">` (the grammar body).
 */
export function extractBnfBlocks($: CheerioAPI): BnfBlock[] {
  const blocks: BnfBlock[] = [];

  $("pre.nonterm").each((_i, el) => {
    const preNonterm = $(el);
    const text = preNonterm.text().trim();

    // Extract nontermName from "XXX ::=" pattern
    const match = text.match(/^(.+?)\s*::=$/);
    if (!match) return;

    const nontermName = match[1].trim();

    // Find the next sibling <pre class="ind"> or <pre class="ind_j">
    const preInd = preNonterm.nextAll('pre.ind, pre.ind_j').first();
    if (preInd.length === 0) return;

    const rawHtml = preInd.html() ?? "";
    const body = preInd.text();

    // Collect refs from <a class="nonterm"> inside the ind block
    const refs: string[] = [];
    preInd.find('a.nonterm').each((_j, a) => {
      const refText = $(a).text().trim();
      if (refText && !refs.includes(refText)) {
        refs.push(refText);
      }
    });

    // Check for file-level grammar: look for fileName in <h2> of parent contbox
    let fileName: string | undefined;
    const contbox = preNonterm.closest("div.contbox.cb_src");
    const h2 = contbox.find("h2").first();
    const h2Text = h2.text();
    const fileMatch = h2Text.match(/定義ファイル\s*\(([^)]+)\)\s*文法/);
    if (fileMatch) {
      fileName = fileMatch[1];
    }

    blocks.push({ nontermName, body, refs, rawHtml, fileName });
  });

  return blocks;
}

/**
 * Extract property documentation pairs from `<p class="argname">` and
 * the following `<p class="argexp">` or `<p class="argexp_f">`.
 */
export function extractPropertyDocs($: CheerioAPI): Map<string, string> {
  const docs = new Map<string, string>();

  $("p.argname").each((_i, el) => {
    const nameEl = $(el);
    const name = nameEl.text().trim();

    // Find the next sibling that is argexp or argexp_f
    const expEl = nameEl.nextAll("p.argexp, p.argexp_f").first();
    if (expEl.length > 0) {
      docs.set(name, expEl.text().trim());
    }
  });

  return docs;
}

/**
 * Extract the overview text: the first `<p>` after `<h2>概要</h2>`.
 */
export function extractOverview($: CheerioAPI): string | null {
  let result: string | null = null;

  $("h2").each((_i, el) => {
    if ($(el).text().trim() === "概要") {
      const p = $(el).next("p");
      if (p.length > 0) {
        result = p.text().trim();
      }
      return false; // break
    }
  });

  return result;
}
