/**
 * File System Access API wrapper for opening/saving local RailSim2 files.
 * Encoding detection and conversion are dynamically imported to keep initial bundle small.
 */

type Encoding = "SJIS" | "UTF8";

export interface OpenedFile {
  content: string;
  fileName: string;
  handle: FileSystemFileHandle;
  encoding: Encoding;
}

export function isFileAccessSupported(): boolean {
  return "showOpenFilePicker" in window;
}

async function detectEncoding(buffer: ArrayBuffer): Promise<Encoding> {
  const { detect } = await import("encoding-japanese");
  const bytes = new Uint8Array(buffer);
  const detected = detect(bytes);
  return detected === "SJIS" ? "SJIS" : "UTF8";
}

async function decode(buffer: ArrayBuffer, encoding: Encoding): Promise<string> {
  if (encoding === "UTF8") {
    return new TextDecoder("utf-8").decode(buffer);
  }
  return new TextDecoder("shift_jis").decode(buffer);
}

async function encode(text: string, encoding: Encoding): Promise<Uint8Array> {
  if (encoding === "UTF8") {
    return new TextEncoder().encode(text);
  }
  const { convert } = await import("encoding-japanese");
  const unicodeArray = Array.from(text, (c) => c.charCodeAt(0));
  const sjisArray = convert(unicodeArray, { to: "SJIS", from: "UNICODE" });
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
  const encoding = await detectEncoding(buffer);
  const content = await decode(buffer, encoding);

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
