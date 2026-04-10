import { loadWASM } from "onigasm";
import { Registry } from "monaco-textmate";
import { wireTmGrammars } from "monaco-editor-textmate";
import type * as Monaco from "monaco-editor";

let initialized = false;

export async function setupGrammar(
  monaco: typeof Monaco,
  editor: Monaco.editor.ICodeEditor,
  grammarDefinition: object,
): Promise<void> {
  if (!initialized) {
    const wasmResponse = await fetch("/onigasm.wasm");
    const wasmBuffer = await wasmResponse.arrayBuffer();
    await loadWASM(wasmBuffer);
    initialized = true;
  }

  const registry = new Registry({
    getGrammarDefinition: async () => ({
      format: "json" as const,
      content: JSON.stringify(grammarDefinition),
    }),
  });

  const grammars = new Map<string, string>();
  grammars.set("railsim2", "source.rs2");

  await wireTmGrammars(monaco, registry, grammars, editor);
}
