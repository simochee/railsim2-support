import * as fs from "node:fs";
import * as path from "node:path";
import { readHelpHtml, extractBnfBlocks } from "./html-reader.js";
import { parseBnfBody, type GrammarRule } from "./bnf-parser.js";

// ── Types ──────────────────────────────────────────────────────────

export interface GrammarSymbol {
  name: string;
  htmlFile: string;
  rules: GrammarRule[];
  fileName?: string;
}

export interface ResolvedProperty {
  type: string;
  required: boolean;
  multiple: boolean;
  arity: number;
  enumValues?: string[];
}

export interface ResolvedChild {
  required: boolean;
  multiple: boolean;
  schemaKey?: string;
}

export interface ResolvedObject {
  properties: Record<string, ResolvedProperty>;
  children: Record<string, ResolvedChild>;
  nameParameter?: string;
}

// ── SymbolTable ────────────────────────────────────────────────────

export class SymbolTable {
  private symbols: Map<string, GrammarSymbol>;
  private resolveCache: Map<string, ResolvedObject>;
  private allObjects: Map<string, ResolvedObject>;

  private constructor(symbols: Map<string, GrammarSymbol>) {
    this.symbols = symbols;
    this.resolveCache = new Map();
    this.allObjects = new Map();
  }

  /** Build from all pi_*.html in helpDir */
  static fromHelpDir(helpDir: string): SymbolTable {
    const symbols = new Map<string, GrammarSymbol>();
    const files = fs.readdirSync(helpDir).filter((f) => f.startsWith("pi_") && f.endsWith(".html"));

    for (const file of files) {
      const filePath = path.join(helpDir, file);
      const $ = readHelpHtml(filePath);
      const blocks = extractBnfBlocks($);

      for (const block of blocks) {
        const rules = parseBnfBody(block.rawHtml);
        const existing = symbols.get(block.nontermName);

        if (existing) {
          // Merge rules from duplicate nonterm names
          existing.rules.push(...rules);
        } else {
          symbols.set(block.nontermName, {
            name: block.nontermName,
            htmlFile: file,
            rules,
            fileName: block.fileName,
          });
        }
      }
    }

    return new SymbolTable(symbols);
  }

  get(name: string): GrammarSymbol | undefined {
    return this.symbols.get(name);
  }

  get size(): number {
    return this.symbols.size;
  }

  get fileSymbols(): GrammarSymbol[] {
    return [...this.symbols.values()].filter((s) => s.fileName != null);
  }

  /** Resolve a symbol into a flat ResolvedObject */
  resolve(symbolName: string): ResolvedObject {
    const cached = this.resolveCache.get(symbolName);
    if (cached) return cached;

    const result = this.resolveInternal(symbolName, new Set());
    return result;
  }

  /** Resolve all symbols and return all generated objects */
  resolveAll(): Record<string, ResolvedObject> {
    // Clear caches for fresh resolveAll
    this.resolveCache.clear();
    this.allObjects.clear();

    for (const sym of this.symbols.values()) {
      this.resolve(sym.name);
    }

    return Object.fromEntries(this.allObjects);
  }

  // ── Internal resolution ────────────────────────────────────────

  private resolveInternal(symbolName: string, visiting: Set<string>): ResolvedObject {
    // Cycle detection
    if (visiting.has(symbolName)) {
      return emptyObject();
    }

    const cached = this.resolveCache.get(symbolName);
    if (cached) return cached;

    const sym = this.symbols.get(symbolName);
    if (!sym) return emptyObject();

    visiting.add(symbolName);

    // Determine if this symbol wraps a single inline-block.
    // If so, flatten its content. Otherwise, treat all inline-blocks as children.
    const shouldFlatten = this.isSingleBlockWrapper(sym.rules);

    const result = emptyObject();
    const parentCtx = shouldFlatten ? undefined : "__root__";
    this.expandRules(sym.rules, result, visiting, parentCtx);

    // Register the resolve result in allObjects for top-level inline-blocks
    if (shouldFlatten) {
      this.registerTopLevelObjects(sym.rules, result);
    }

    visiting.delete(symbolName);
    this.resolveCache.set(symbolName, result);
    return result;
  }

  /**
   * A symbol is a "single block wrapper" if it has exactly one
   * inline-block at the root level and all other rules are refs
   * to symbols without blocks (pure properties).
   */
  private isSingleBlockWrapper(rules: GrammarRule[]): boolean {
    let blockCount = 0;
    for (const rule of rules) {
      if (rule.kind === "inline-block") {
        blockCount++;
      } else if (rule.kind === "union-block") {
        blockCount++;
      } else if (rule.kind === "ref") {
        const sym = this.symbols.get(rule.symbol);
        if (sym && rulesHaveBlocks(sym.rules)) {
          blockCount++;
        }
      } else if (rule.kind === "union") {
        // Unions with blocks count
        const hasBlock = rule.alternatives.some((alt) =>
          alt.some((r) => r.kind === "inline-block" || r.kind === "union-block"),
        );
        if (hasBlock) blockCount++;
      }
    }
    return blockCount === 1;
  }

  /**
   * If the symbol's rules contain inline-blocks at root level,
   * register each block's objectName in allObjects with the full resolved content.
   */
  private registerTopLevelObjects(rules: GrammarRule[], resolved: ResolvedObject): void {
    for (const rule of rules) {
      if (rule.kind === "inline-block") {
        // The resolved object IS the content of this block
        // (since expandInlineBlock merges body into target)
        this.allObjects.set(rule.objectName, resolved);
      }
    }
  }

  /**
   * Expand an array of GrammarRules into the given ResolvedObject.
   * `parentObjectName` is set when we are inside an inline-block body
   * (used for schemaKey generation in union-blocks).
   * `refQuantifier` carries the parent ref's min/max quantifier so that
   * child objects inherit the correct required/multiple flags.
   */
  private expandRules(
    rules: GrammarRule[],
    target: ResolvedObject,
    visiting: Set<string>,
    parentObjectName: string | undefined,
    refQuantifier?: { min: number; max: number },
  ): void {
    for (const rule of rules) {
      this.expandRule(rule, target, visiting, parentObjectName, refQuantifier);
    }
  }

  private expandRule(
    rule: GrammarRule,
    target: ResolvedObject,
    visiting: Set<string>,
    parentObjectName: string | undefined,
    refQuantifier?: { min: number; max: number },
  ): void {
    switch (rule.kind) {
      case "property":
        target.properties[rule.name] = {
          type: rule.type,
          required: !rule.optional,
          multiple: rule.multiple,
          arity: rule.arity,
        };
        break;

      case "union-property":
        for (const name of rule.names) {
          target.properties[name] = {
            type: rule.type,
            required: !rule.optional,
            multiple: rule.multiple,
            arity: rule.arity,
          };
        }
        break;

      case "ref":
        this.expandRef(rule, target, visiting, parentObjectName);
        break;

      case "inline-block":
        this.expandInlineBlock(rule, target, visiting, parentObjectName, refQuantifier);
        break;

      case "union-block":
        this.expandUnionBlock(rule, target, visiting, parentObjectName, refQuantifier);
        break;

      case "union":
        this.expandUnion(rule, target, visiting, parentObjectName, refQuantifier);
        break;
    }
  }

  private expandRef(
    rule: Extract<GrammarRule, { kind: "ref" }>,
    target: ResolvedObject,
    visiting: Set<string>,
    parentObjectName: string | undefined,
  ): void {
    const sym = this.symbols.get(rule.symbol);
    if (!sym) return;

    // Check what the referenced symbol contains
    const hasBlocks = rulesHaveBlocks(sym.rules);

    if (hasBlocks) {
      // The ref points to a symbol that defines child objects.
      // Expand its rules into our target so inline-blocks become children.
      // Use a sentinel parentObjectName ("__ref__") if we don't have one,
      // so that inline-blocks inside the ref are registered as children
      // rather than being flattened into the target.
      const refParent = parentObjectName ?? "__ref__";
      // Propagate the ref's quantifier (min/max) so child objects inherit
      // the correct required/multiple flags from BNF (e.g., * → optional, 1+ → required).
      const quantifier = { min: rule.min, max: rule.max };
      this.expandRules(sym.rules, target, new Set(visiting), refParent, quantifier);
    } else {
      // Pure properties/refs — resolve and merge.
      // Apply the ref's quantifier: if the ref is optional (min=0), all
      // merged properties/children become optional; if max>1, they become multiple.
      const resolved = this.resolveInternal(rule.symbol, new Set(visiting));
      const isRefOptional = rule.min === 0;
      const isRefMultiple = rule.max > 1;

      for (const [name, prop] of Object.entries(resolved.properties)) {
        if (!target.properties[name]) {
          target.properties[name] = {
            ...prop,
            ...(isRefOptional && { required: false }),
            ...(isRefMultiple && { multiple: true }),
          };
        }
      }
      for (const [name, child] of Object.entries(resolved.children)) {
        if (!target.children[name]) {
          target.children[name] = {
            ...child,
            ...(isRefOptional && { required: false }),
            ...(isRefMultiple && { multiple: true }),
          };
        }
      }
    }
  }

  private expandInlineBlock(
    rule: Extract<GrammarRule, { kind: "inline-block" }>,
    target: ResolvedObject,
    visiting: Set<string>,
    parentObjectName: string | undefined,
    refQuantifier?: { min: number; max: number },
  ): void {
    if (parentObjectName === undefined) {
      // Top-level inline-block: flatten its body into target.
      // This is the "wrapper" case (e.g., piston-zy -> PistonZY{...}).
      if (rule.nameParam) {
        target.nameParameter = rule.nameParam;
      }
      this.expandRules(rule.body, target, new Set(visiting), rule.objectName);
      // Registration in allObjects happens in registerTopLevelObjects.
    } else {
      // Nested inline-block: register as a child.
      // Combine the inline-block's own optional flag with the parent ref's quantifier.
      // e.g., "body-object *" → ref min=0 → child required=false, multiple=true
      //        "axle-object 1+" → ref min=1 → child required=true, multiple=true
      //        "( FrontCabin{...} ) opt" → inline-block optional=true → required=false
      const isRefOptional = refQuantifier != null && refQuantifier.min === 0;
      const isRefMultiple = refQuantifier != null && refQuantifier.max > 1;
      target.children[rule.objectName] = {
        required: !rule.optional && !isRefOptional,
        multiple: isRefMultiple,
      };

      // Create a separate resolved object for this child
      const childObj = emptyObject();
      if (rule.nameParam) {
        childObj.nameParameter = rule.nameParam;
      }
      this.expandRules(rule.body, childObj, new Set(visiting), rule.objectName);
      this.allObjects.set(rule.objectName, childObj);
    }
  }

  private expandUnionBlock(
    rule: Extract<GrammarRule, { kind: "union-block" }>,
    target: ResolvedObject,
    visiting: Set<string>,
    parentObjectName: string | undefined,
    refQuantifier?: { min: number; max: number },
  ): void {
    for (const objName of rule.objectNames) {
      const effectiveParent =
        parentObjectName && parentObjectName !== "__ref__" && parentObjectName !== "__root__"
          ? parentObjectName
          : undefined;
      const schemaKey = effectiveParent ? `${objName}:${effectiveParent}` : undefined;

      // Union alternatives are inherently optional (you pick one),
      // but multiple is inherited from the parent ref's quantifier.
      const isRefMultiple = refQuantifier != null && refQuantifier.max > 1;
      target.children[objName] = {
        required: false,
        multiple: isRefMultiple,
        schemaKey,
      };

      // Create the child object with the shared body
      const childObj = emptyObject();
      this.expandRules(rule.body, childObj, new Set(visiting), objName);
      this.allObjects.set(schemaKey ?? objName, childObj);
    }
  }

  private expandUnion(
    rule: Extract<GrammarRule, { kind: "union" }>,
    target: ResolvedObject,
    visiting: Set<string>,
    parentObjectName: string | undefined,
    refQuantifier?: { min: number; max: number },
  ): void {
    for (const alt of rule.alternatives) {
      // Propagate refQuantifier so nested inline-blocks get correct required/multiple.
      this.expandRules(alt, target, visiting, parentObjectName, refQuantifier);
    }
  }
}

// ── Helpers ────────────────────────────────────────────────────────

function emptyObject(): ResolvedObject {
  return { properties: {}, children: {} };
}

function rulesHaveBlocks(rules: GrammarRule[]): boolean {
  return rules.some(
    (r) =>
      r.kind === "inline-block" ||
      r.kind === "union-block" ||
      (r.kind === "union" &&
        r.alternatives.some((alt) =>
          alt.some((rr) => rr.kind === "inline-block" || rr.kind === "union-block"),
        )),
  );
}

function mergeProperties(target: ResolvedObject, source: ResolvedObject): void {
  for (const [name, prop] of Object.entries(source.properties)) {
    if (!target.properties[name]) {
      target.properties[name] = { ...prop };
    }
  }
}

function mergeChildren(target: ResolvedObject, source: ResolvedObject): void {
  for (const [name, child] of Object.entries(source.children)) {
    if (!target.children[name]) {
      target.children[name] = { ...child };
    }
  }
}
