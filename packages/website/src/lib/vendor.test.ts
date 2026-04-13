import { describe, it, expect } from "vitest";
import { extractDescription } from "./vendor";

describe("extractDescription", () => {
  it("extracts text from <p> after <h2>概要</h2>", () => {
    const html = "<h2>概要</h2>\n<p>プラグインの外観設定などに利用できる選択肢を定義します。</p>";
    expect(extractDescription(html)).toBe(
      "プラグインの外観設定などに利用できる選択肢を定義します。",
    );
  });

  it("strips inner HTML tags", () => {
    const html = '<h2>概要</h2><p><a href="foo">リンク付き</a>の説明です。</p>';
    expect(extractDescription(html)).toBe("リンク付きの説明です。");
  });

  it("handles attributes on h2 and p", () => {
    const html = '<h2 class="title">概要</h2><p class="desc">説明文。</p>';
    expect(extractDescription(html)).toBe("説明文。");
  });

  it("returns undefined when no 概要 heading exists", () => {
    const html = "<h2>はじめに</h2><p>導入文。</p>";
    expect(extractDescription(html)).toBeUndefined();
  });

  it("returns undefined for empty paragraph", () => {
    const html = "<h2>概要</h2><p></p>";
    expect(extractDescription(html)).toBeUndefined();
  });
});
