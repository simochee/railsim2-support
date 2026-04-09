import { describe, it, expect } from "vitest";
import { SymbolTable } from "../../scripts/lib/symbol-table.js";

const HELP_DIR = new URL(
	"../../../../vendor/railsim2/Distribution/jp/RailSim2/Help/",
	import.meta.url,
).pathname;

describe("SymbolTable.fromHelpDir", () => {
	it("builds a symbol table with 50+ symbols", () => {
		const table = SymbolTable.fromHelpDir(HELP_DIR);
		expect(table.size).toBeGreaterThanOrEqual(50);
	});

	it("contains known symbols", () => {
		const table = SymbolTable.fromHelpDir(HELP_DIR);
		expect(table.get("piston-zy")).toBeDefined();
		expect(table.get("station-plugin")).toBeDefined();
		expect(table.get("object-3d")).toBeDefined();
		expect(table.get("lens-flare")).toBeDefined();
		expect(table.get("customizer")).toBeDefined();
	});

	it("records htmlFile for each symbol", () => {
		const table = SymbolTable.fromHelpDir(HELP_DIR);
		const sym = table.get("piston-zy");
		expect(sym?.htmlFile).toBe("pi_sym_piston_zy.html");
	});
});

describe("SymbolTable.fileSymbols", () => {
	it("includes Station2.txt and Rail2.txt file-level symbols", () => {
		const table = SymbolTable.fromHelpDir(HELP_DIR);
		const fileNames = table.fileSymbols.map((s) => s.fileName);
		expect(fileNames).toContain("Station2.txt");
		expect(fileNames).toContain("Rail2.txt");
	});
});

describe("SymbolTable.resolve", () => {
	let table: SymbolTable;

	// Build once for all resolve tests
	it("builds without error", () => {
		table = SymbolTable.fromHelpDir(HELP_DIR);
	});

	it("resolves piston-zy — children contains Link", () => {
		const resolved = table.resolve("piston-zy");
		expect(resolved.children).toHaveProperty("Link");
	});

	it("resolves station-plugin — children contain Platform and PrimaryAssembly", () => {
		const resolved = table.resolve("station-plugin");
		expect(resolved.children).toHaveProperty("Platform");
		expect(resolved.children).toHaveProperty("PrimaryAssembly");
	});

	it("resolves object-3d — properties include ModelFileName from named-object-info", () => {
		const resolved = table.resolve("object-3d");
		expect(resolved.properties).toHaveProperty("ModelFileName");
		expect(resolved.properties.ModelFileName.type).toBe("filename");
	});

	it("resolves object-3d — children include Joint3D", () => {
		const resolved = table.resolve("object-3d");
		expect(resolved.children).toHaveProperty("Joint3D");
	});

	it("does not error on cycle detection", () => {
		// Resolve all symbols without throwing
		for (const sym of table.fileSymbols) {
			expect(() => table.resolve(sym.name)).not.toThrow();
		}
	});
});

describe("SymbolTable.resolveAll", () => {
	it("resolves all objects and includes Object3D with customizer properties", () => {
		const table = SymbolTable.fromHelpDir(HELP_DIR);
		const all = table.resolveAll();

		// Object3D should exist and contain customizer-expanded properties
		expect(all).toHaveProperty("Object3D");
		const obj3d = all.Object3D;
		// ShiftTexture comes from texture-transformer via customizer
		expect(obj3d.properties).toHaveProperty("ShiftTexture");
		// SetAnimation comes from animation-applier via customizer
		expect(obj3d.properties).toHaveProperty("SetAnimation");
	});

	it("resolves LensFlare children with Circle:LensFlare schemaKey", () => {
		const table = SymbolTable.fromHelpDir(HELP_DIR);
		const all = table.resolveAll();

		expect(all).toHaveProperty("LensFlare");
		const lf = all.LensFlare;
		// flare-element has union-block (Circle | Hexagon){...}
		// These should appear as children with schemaKey
		const circleChild = lf.children["Circle"];
		expect(circleChild).toBeDefined();
		expect(circleChild.schemaKey).toBe("Circle:LensFlare");
	});
});
