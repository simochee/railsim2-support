import { fileNamePluginTypeMap } from "@railsim2-support/language-server/schema";

const VALID_PLUGIN_TYPES = new Set(Object.values(fileNamePluginTypeMap));

/**
 * エディタ内容から PluginType を簡易推定する。
 * PluginHeader ブロック直下の PluginType プロパティのみを対象とし、
 * コメント行・インラインコメントは無視する。Save-As の候補名用途。
 */
export function guessPluginType(content: string): string | undefined {
  const lines = content.split("\n");
  let inPluginHeader = false;
  let braceDepth = 0;

  for (const rawLine of lines) {
    // インラインコメントを除去（// と # 以降を削除）
    const line = rawLine.replace(/\/\/.*$/, "").replace(/#.*$/, "").trim();
    if (line === "") continue;

    if (!inPluginHeader) {
      if (/^PluginHeader\s*\{/.test(line)) {
        inPluginHeader = true;
        braceDepth = 0;
        for (const ch of line) {
          if (ch === "{") braceDepth++;
          else if (ch === "}") braceDepth--;
        }
        // 同一行に PluginType がある場合
        const match = line.match(/PluginType\s*=\s*(\w+)/);
        if (match && VALID_PLUGIN_TYPES.has(match[1])) return match[1];
        if (braceDepth <= 0) inPluginHeader = false;
      }
      continue;
    }

    // brace depth を更新
    for (const ch of line) {
      if (ch === "{") braceDepth++;
      else if (ch === "}") braceDepth--;
    }

    // 直下（depth=1）のみ PluginType を探す
    if (braceDepth === 1) {
      const match = line.match(/^PluginType\s*=\s*(\w+)/);
      if (match && VALID_PLUGIN_TYPES.has(match[1])) return match[1];
    }

    if (braceDepth <= 0) {
      inPluginHeader = false;
    }
  }
  return undefined;
}

/**
 * Save-As の候補ファイル名を決定する。
 */
export function suggestFileName(
  activeFile: string,
  isLocalFile: boolean,
  localFileName: string | null,
  content: string,
): string {
  if (!isLocalFile) return activeFile;
  if (localFileName) return localFileName;
  const pluginType = guessPluginType(content);
  return pluginType ? `${pluginType}2.txt` : "Plugin.txt";
}
