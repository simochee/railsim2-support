/**
 * File System Access API wrapper for opening/saving local RailSim2 files.
 * encoding-japanese is lazy-loaded on first use to keep initial page load small.
 */

import type EncodingJapanese from "encoding-japanese";

type Encoding = "SJIS" | "UTF8";

export interface OpenedFile {
  content: string;
  fileName: string;
  handle: FileSystemFileHandle;
  encoding: Encoding;
}

export function isFileAccessSupported(): boolean {
  return "showOpenFilePicker" in window && "showSaveFilePicker" in window;
}

let encodingLib: typeof EncodingJapanese | null = null;

async function getEncoding(): Promise<typeof EncodingJapanese> {
  if (encodingLib) return encodingLib;
  // encoding-japanese uses default export
  const mod = await import("encoding-japanese");
  encodingLib = mod.default ?? mod;
  return encodingLib;
}

function detectEncoding(bytes: Uint8Array): Encoding {
  // Simple heuristic: check for Shift_JIS high bytes
  // Shift_JIS uses 0x81-0x9F, 0xE0-0xEF as lead bytes
  for (const b of bytes) {
    if ((b >= 0x81 && b <= 0x9F) || (b >= 0xE0 && b <= 0xEF)) {
      return "SJIS";
    }
    if (b >= 0x80 && b !== 0xEF && b !== 0xBB && b !== 0xBF) {
      // Non-ASCII but not UTF-8 BOM
      break;
    }
  }
  // Check for UTF-8 BOM
  if (bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) {
    return "UTF8";
  }
  // Default: try UTF-8 decode and check for replacement chars
  const text = new TextDecoder("utf-8").decode(bytes);
  return text.includes("\uFFFD") ? "SJIS" : "UTF8";
}

function decode(buffer: ArrayBuffer, encoding: Encoding): string {
  if (encoding === "UTF8") {
    return new TextDecoder("utf-8").decode(buffer);
  }
  return new TextDecoder("shift_jis").decode(buffer);
}

async function encode(text: string, encoding: Encoding): Promise<Uint8Array> {
  if (encoding === "UTF8") {
    return new TextEncoder().encode(text);
  }
  const Enc = await getEncoding();
  const unicodeArray = Array.from(text, (c) => c.charCodeAt(0));
  const sjisArray = Enc.convert(unicodeArray, { to: "SJIS", from: "UNICODE" });
  return new Uint8Array(sjisArray);
}

export async function openFile(): Promise<OpenedFile> {
  const [handle] = await window.showOpenFilePicker({
    types: [
      {
        description: "RailSim2 Plugin Files",
        accept: { "text/plain": [".txt"] },
      },
    ],
  });

  const file = await handle.getFile();
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const encoding = detectEncoding(bytes);
  const content = decode(buffer, encoding);

  return {
    content,
    fileName: file.name,
    handle,
    encoding,
  };
}

export async function saveFile(
  handle: FileSystemFileHandle,
  content: string,
  encoding: Encoding,
): Promise<void> {
  const data = await encode(content, encoding);
  const writable = await handle.createWritable();
  await writable.write(data);
  await writable.close();
}

export interface SavedAsFile {
  handle: FileSystemFileHandle;
  fileName: string;
}

export async function saveFileAs(
  content: string,
  encoding: Encoding,
  suggestedName?: string,
): Promise<SavedAsFile> {
  const handle = await window.showSaveFilePicker({
    suggestedName,
    types: [
      {
        description: "RailSim2 Plugin Files",
        accept: { "text/plain": [".txt"] },
      },
    ],
  });
  const data = await encode(content, encoding);
  const writable = await handle.createWritable();
  await writable.write(data);
  await writable.close();
  return { handle, fileName: handle.name };
}
