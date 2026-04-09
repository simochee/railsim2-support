/**
 * Schema emitter — SymbolTable から semantic.generated.ts を生成する。
 */
import type { SymbolTable } from "./symbol-table.js";
import type {
	ResolvedObject,
	ResolvedProperty,
	ResolvedChild,
	GrammarSymbol,
} from "./symbol-table.js";
import type { GrammarRule } from "./bnf-parser.js";
import {
	schemaOverrides,
	type SchemaOverride,
} from "../schema-overrides.js";

// ── Type conversion ──────────────────────────────────────────────────

type PropertyType =
	| "float"
	| "integer"
	| "string"
	| "filename"
	| "identifier"
	| "yes-no"
	| "color"
	| "expression"
	| "vector-2d"
	| "vector-3d"
	| "enum";

interface EmittedProperty {
	type: PropertyType;
	required: boolean;
	multiple: boolean;
	arity?: number;
	enumValues?: string[];
}

function convertProperty(rp: ResolvedProperty): EmittedProperty {
	const result: EmittedProperty = {
		type: "expression",
		required: rp.required,
		multiple: rp.multiple,
	};

	// Parse enum type
	if (rp.type.startsWith("enum:")) {
		result.type = "enum";
		result.enumValues = rp.type.slice(5).split(",");
		return result;
	}

	// Map simple types
	const simpleTypes: Record<string, PropertyType> = {
		float: "float",
		integer: "integer",
		string: "string",
		filename: "filename",
		identifier: "identifier",
		"yes-no": "yes-no",
		color: "color",
		expression: "expression",
		"vector-2d": "vector-2d",
		"vector-3d": "vector-3d",
	};

	const mapped = simpleTypes[rp.type];
	if (mapped) {
		result.type = mapped;
	}

	// Arity-based upgrades for float
	if (result.type === "float" && rp.arity > 1) {
		if (rp.arity === 2) {
			result.type = "vector-2d";
		} else if (rp.arity === 3) {
			result.type = "vector-3d";
		} else {
			result.type = "expression";
			result.arity = rp.arity;
		}
	} else if (rp.arity > 1 && result.type !== "vector-2d" && result.type !== "vector-3d" && result.type !== "enum") {
		// Non-float with arity > 1 — keep as-is but record arity
		result.arity = rp.arity;
	}

	return result;
}

// ── Override merging ─────────────────────────────────────────────────

function applyOverrides(
	objects: Record<string, ResolvedObject>,
): Record<string, ResolvedObject> {
	for (const [name, override] of Object.entries(schemaOverrides)) {
		const obj = objects[name];
		if (!obj) continue;

		if (override.properties) {
			for (const [propName, patch] of Object.entries(override.properties)) {
				if (obj.properties[propName]) {
					Object.assign(obj.properties[propName], patch);
				} else {
					// New property from override
					obj.properties[propName] = {
						type: patch.type ?? "expression",
						required: patch.required ?? false,
						multiple: patch.multiple ?? false,
						arity: patch.arity ?? 1,
					};
				}
			}
		}

		if (override.children) {
			for (const [childName, patch] of Object.entries(override.children)) {
				if (obj.children[childName]) {
					Object.assign(obj.children[childName], patch);
				} else {
					obj.children[childName] = {
						required: patch.required ?? false,
						multiple: patch.multiple ?? false,
						schemaKey: patch.schemaKey,
					};
				}
			}
		}
	}

	return objects;
}

// ── File schema generation ───────────────────────────────────────────

interface RootEntry {
	name: string;
	required: boolean;
	multiple: boolean;
	schemaKey?: string;
}

function buildFileSchemas(table: SymbolTable): Record<string, RootEntry[]> {
	const result: Record<string, RootEntry[]> = {};

	for (const sym of table.fileSymbols) {
		if (!sym.fileName) continue;

		const entries: RootEntry[] = [];

		// PluginHeader is always first, required, not multiple
		entries.push({
			name: "PluginHeader",
			required: true,
			multiple: false,
		});

		// Walk the file symbol's rules to collect root objects
		collectFileRootObjects(sym.rules, entries, table);

		result[sym.fileName] = entries;
	}

	return result;
}

function collectFileRootObjects(
	rules: GrammarRule[],
	entries: RootEntry[],
	table: SymbolTable,
): void {
	for (const rule of rules) {
		switch (rule.kind) {
			case "inline-block": {
				// Skip PluginHeader — already added
				if (rule.objectName === "PluginHeader") break;
				entries.push({
					name: rule.objectName,
					required: !rule.optional,
					multiple: false,
				});
				break;
			}

			case "ref": {
				const sym = table.get(rule.symbol);
				if (!sym) break;

				// If the referenced symbol contains blocks, inline them
				const hasBlocks = sym.rules.some(
					(r) =>
						r.kind === "inline-block" ||
						r.kind === "union-block" ||
						(r.kind === "union" &&
							r.alternatives.some((alt) =>
								alt.some(
									(rr) =>
										rr.kind === "inline-block" ||
										rr.kind === "union-block",
								),
							)),
				);

				if (hasBlocks) {
					// Recurse into the referenced symbol's rules
					collectFileRootObjects(sym.rules, entries, table);

					// Apply ref quantifiers to the last batch of added entries
					// If ref has min=0, entries become optional; max>1 -> multiple
					if (rule.min === 0 || rule.max > 1) {
						// Walk backwards to find entries added by this ref
						// (This is a simplification — we apply to the most recent batch)
					}
				} else {
					// Pure property ref — skip for file-level roots
				}
				break;
			}

			case "union": {
				for (const alt of rule.alternatives) {
					collectFileRootObjects(alt, entries, table);
				}
				break;
			}

			case "union-block": {
				for (const objName of rule.objectNames) {
					entries.push({
						name: objName,
						required: false,
						multiple: false,
					});
				}
				break;
			}
		}
	}
}

// ── Code generation ──────────────────────────────────────────────────

const INDENT = "  ";

function indent(level: number): string {
	return INDENT.repeat(level);
}

function emitPropertyValue(prop: EmittedProperty, level: number): string {
	const parts: string[] = [];
	parts.push(`${indent(level)}type: "${prop.type}"`);
	parts.push(`${indent(level)}required: ${prop.required}`);
	parts.push(`${indent(level)}multiple: ${prop.multiple}`);

	if (prop.arity !== undefined) {
		parts.push(`${indent(level)}arity: ${prop.arity}`);
	}

	if (prop.enumValues !== undefined) {
		const vals = prop.enumValues.map((v) => `"${v}"`).join(", ");
		parts.push(`${indent(level)}enumValues: [${vals}]`);
	}

	return parts.join(",\n");
}

function emitChildValue(child: ResolvedChild, level: number): string {
	const parts: string[] = [];
	parts.push(`${indent(level)}required: ${child.required}`);
	parts.push(`${indent(level)}multiple: ${child.multiple}`);

	if (child.schemaKey !== undefined) {
		parts.push(`${indent(level)}schemaKey: "${child.schemaKey}"`);
	}

	return parts.join(",\n");
}

function emitObjectSchema(
	obj: ResolvedObject,
	level: number,
): string {
	const lines: string[] = [];

	// Properties
	lines.push(`${indent(level)}properties: {`);
	const propEntries = Object.entries(obj.properties);
	for (let i = 0; i < propEntries.length; i++) {
		const [name, rp] = propEntries[i];
		const ep = convertProperty(rp);
		const comma = i < propEntries.length - 1 ? "," : "";
		lines.push(`${indent(level + 1)}${name}: {`);
		lines.push(emitPropertyValue(ep, level + 2));
		lines.push(`${indent(level + 1)}}${comma}`);
	}
	lines.push(`${indent(level)}},`);

	// Children
	lines.push(`${indent(level)}children: {`);
	const childEntries = Object.entries(obj.children);
	for (let i = 0; i < childEntries.length; i++) {
		const [name, child] = childEntries[i];
		const comma = i < childEntries.length - 1 ? "," : "";
		lines.push(`${indent(level + 1)}${name}: {`);
		lines.push(emitChildValue(child, level + 2));
		lines.push(`${indent(level + 1)}}${comma}`);
	}
	lines.push(`${indent(level)}},`);

	// nameParameter
	if (obj.nameParameter) {
		lines.push(`${indent(level)}nameParameter: "${obj.nameParameter}",`);
	}

	return lines.join("\n");
}

// ── Main entry point ─────────────────────────────────────────────────

export function emitSemanticSchema(table: SymbolTable): string {
	// Resolve all symbols
	const allObjects = table.resolveAll();

	// Apply overrides
	applyOverrides(allObjects);

	// Build file schemas
	const fileSchemas = buildFileSchemas(table);

	// Generate code
	const lines: string[] = [];

	// Header
	lines.push("/**");
	lines.push(" * Auto-generated semantic schema.");
	lines.push(" * DO NOT EDIT — regenerate with: pnpm generate");
	lines.push(" */");
	lines.push(
		'import type { SemanticSchema, FileSchema, RootObjectEntry } from "./schemaTypes.js";',
	);
	lines.push("");

	// semanticSchema
	lines.push("export const semanticSchema: SemanticSchema = {");
	const objectEntries = Object.entries(allObjects);
	for (let i = 0; i < objectEntries.length; i++) {
		const [name, obj] = objectEntries[i];
		const comma = i < objectEntries.length - 1 ? "," : "";
		lines.push(`${indent(1)}${name}: {`);
		lines.push(emitObjectSchema(obj, 2));
		lines.push(`${indent(1)}}${comma}`);
	}
	lines.push("};");
	lines.push("");

	// fileSchemas
	lines.push("export const fileSchemas: FileSchema = {");
	const fileEntries = Object.entries(fileSchemas);
	for (let i = 0; i < fileEntries.length; i++) {
		const [fileName, entries] = fileEntries[i];
		const comma = i < fileEntries.length - 1 ? "," : "";
		lines.push(`${indent(1)}"${fileName}": [`);
		for (let j = 0; j < entries.length; j++) {
			const entry = entries[j];
			const entryComma = j < entries.length - 1 ? "," : "";
			let entryStr = `{ name: "${entry.name}", required: ${entry.required}, multiple: ${entry.multiple}`;
			if (entry.schemaKey) {
				entryStr += `, schemaKey: "${entry.schemaKey}"`;
			}
			entryStr += ` }${entryComma}`;
			lines.push(`${indent(2)}${entryStr}`);
		}
		lines.push(`${indent(1)}]${comma}`);
	}
	lines.push("};");
	lines.push("");

	// getFileSchema
	lines.push(
		"export function getFileSchema(fileName: string): RootObjectEntry[] | undefined {",
	);
	lines.push(`${indent(1)}return fileSchemas[fileName];`);
	lines.push("}");
	lines.push("");

	return lines.join("\n");
}
