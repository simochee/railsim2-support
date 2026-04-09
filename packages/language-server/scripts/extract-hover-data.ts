/**
 * extract-hover-data.ts
 *
 * Unified entry point: generates both hover data and semantic schema
 * from RailSim II help HTML files.
 *
 * Output:
 *   - src/server/hoverData.generated.ts  (hover documentation)
 *   - src/schema/semantic.generated.ts   (semantic schema)
 *
 * Original help documents: Copyright (C) 2003-2009 インターネット停留所
 * Licensed under LGPL v2.1
 */

import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { SymbolTable } from "./lib/symbol-table.js";
import { emitSemanticSchema } from "./lib/schema-emitter.js";
import { emitHoverData } from "./lib/hover-emitter.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const HELP_DIR = resolve(__dirname, "../../../vendor/railsim2/Distribution/jp/RailSim2/Help");
const HOVER_OUTPUT = resolve(__dirname, "../src/server/hoverData.generated.ts");
const SCHEMA_OUTPUT = resolve(__dirname, "../src/schema/semantic.generated.ts");

// 1. Build symbol table (parses all HTML once)
const table = SymbolTable.fromHelpDir(HELP_DIR);

// 2. Generate hover data
emitHoverData(HELP_DIR, HOVER_OUTPUT);

// 3. Generate semantic schema
const schemaCode = emitSemanticSchema(table);
writeFileSync(SCHEMA_OUTPUT, schemaCode, "utf-8");
console.log(`Generated semantic schema → ${SCHEMA_OUTPUT}`);
