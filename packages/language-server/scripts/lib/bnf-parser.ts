import * as cheerio from "cheerio";

// ── IR types ────────────────────────────────────────────────────────

export type GrammarRule =
  | {
      kind: "property";
      name: string;
      type: string;
      optional: boolean;
      multiple: boolean;
      arity: number;
    }
  | { kind: "ref"; symbol: string; min: number; max: number }
  | { kind: "union"; alternatives: GrammarRule[][] }
  | {
      kind: "inline-block";
      objectName: string;
      nameParam?: string;
      body: GrammarRule[];
      optional: boolean;
    }
  | { kind: "union-block"; objectNames: string[]; body: GrammarRule[] }
  | {
      kind: "union-property";
      names: string[];
      type: string;
      optional: boolean;
      multiple: boolean;
      arity: number;
    };

// ── Token types ─────────────────────────────────────────────────────

interface TokenText {
  kind: "text";
  value: string;
}
interface TokenNonterm {
  kind: "nonterm";
  value: string;
}
interface TokenCtrl {
  kind: "ctrl";
  value: string;
}
interface TokenSub {
  kind: "sub";
  value: string;
}
interface TokenSup {
  kind: "sup";
  value: string;
}

type Token = TokenText | TokenNonterm | TokenCtrl | TokenSub | TokenSup;

// ── Tokeniser ───────────────────────────────────────────────────────

/**
 * Split a raw text string into sub-tokens, breaking at `{`, `}`, `;`,
 * and newlines so the parser receives atomic pieces.
 */
function splitTextIntoTokens(text: string): Token[] {
  const out: Token[] = [];
  // Split by special chars while keeping delimiters
  const parts = text.split(/([{};]|\n)/);
  for (const p of parts) {
    if (p === "\n") continue; // drop bare newlines
    if (p === "{" || p === "}" || p === ";") {
      out.push({ kind: "text", value: p });
    } else if (p.trim()) {
      out.push({ kind: "text", value: p });
    }
  }
  return out;
}

function tokenize(rawHtml: string): Token[] {
  const $ = cheerio.load(rawHtml, { xml: false }, false);
  const tokens: Token[] = [];

  $.root()
    .contents()
    .each((_i, node) => {
      if (node.type === "text") {
        const text = (node as any).data as string;
        tokens.push(...splitTextIntoTokens(text));
      } else if (node.type === "tag") {
        const el = node as cheerio.Element;
        const cls = el.attribs?.class ?? "";
        const inner = $(el).text();

        if (cls === "nonterm") {
          tokens.push({ kind: "nonterm", value: inner.trim() });
        } else if (cls === "ctrl") {
          tokens.push({ kind: "ctrl", value: inner.trim() });
        } else if (cls === "sub") {
          tokens.push({ kind: "sub", value: inner.trim() });
        } else if (cls === "sup") {
          tokens.push({ kind: "sup", value: inner.trim() });
        } else {
          // Unknown element — treat as text
          if (inner.trim()) {
            tokens.push({ kind: "text", value: inner });
          }
        }
      }
    });

  return tokens;
}

// ── Parser state ────────────────────────────────────────────────────

class Parser {
  private tokens: Token[];
  private pos: number;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
    this.pos = 0;
  }

  peek(): Token | undefined {
    return this.tokens[this.pos];
  }

  peekAt(offset: number): Token | undefined {
    return this.tokens[this.pos + offset];
  }

  advance(): Token | undefined {
    return this.tokens[this.pos++];
  }

  isEof(): boolean {
    return this.pos >= this.tokens.length;
  }

  match(kind: Token["kind"], value?: string): boolean {
    const t = this.peek();
    if (!t) return false;
    if (t.kind !== kind) return false;
    if (value !== undefined && t.value !== value) return false;
    return true;
  }

  matchAt(offset: number, kind: Token["kind"], value?: string): boolean {
    const t = this.peekAt(offset);
    if (!t) return false;
    if (t.kind !== kind) return false;
    if (value !== undefined && t.value !== value) return false;
    return true;
  }

  // ── Entry point ──────────────────────────────────────────────

  parseRules(): GrammarRule[] {
    const rules: GrammarRule[] = [];

    while (!this.isEof()) {
      // Skip stray semicolons and closing braces
      if (this.match("text", ";") || this.match("text", "}")) {
        this.advance();
        continue;
      }
      const rule = this.parseOne();
      if (rule) {
        rules.push(rule);
      }
    }

    return this.coalescePipeUnions(rules);
  }

  // ── Dispatch ─────────────────────────────────────────────────

  private parseOne(): GrammarRule | null {
    const t = this.peek();
    if (!t) return null;

    // Pipe delimiter — sentinel for union coalescing
    if (t.kind === "ctrl" && t.value === "|") {
      this.advance();
      return { kind: "text-pipe" } as any;
    }

    // Grouped: ctrl(
    if (t.kind === "ctrl" && t.value === "(") {
      return this.parseGrouped();
    }

    // Symbol reference: nonterm
    if (t.kind === "nonterm") {
      return this.parseNontermStart();
    }

    // Text — identifier that starts a block or property
    if (t.kind === "text") {
      return this.parseTextStart();
    }

    this.advance(); // skip unknown
    return null;
  }

  // ── Nonterm ref ──────────────────────────────────────────────

  private parseNontermStart(): GrammarRule {
    const sym = this.advance()!;
    const q = this.parseQuantifier();
    return { kind: "ref", symbol: sym.value, min: q.min, max: q.max };
  }

  // ── Text-led rules ───────────────────────────────────────────

  private parseTextStart(): GrammarRule | null {
    const t = this.peek()!;
    const text = t.value.trim();

    // "Name = " pattern (text contains identifier + equals in one token)
    const propInlineMatch = text.match(/^([A-Za-z_][\w]*)\s*=\s*$/);
    if (propInlineMatch) {
      const name = propInlineMatch[1];
      this.advance(); // consume "Name = "
      return this.parsePropertyAfterEquals(name, false);
    }

    // Pure identifier?
    const idMatch = text.match(/^([A-Za-z_][\w]*)$/);
    if (!idMatch) {
      // Not an identifier — skip (commas, operators, etc.)
      this.advance();
      return null;
    }

    const name = idMatch[1];
    this.advance(); // consume the identifier

    // Look ahead to decide what this identifier starts
    const next = this.peek();

    // "Name {" → inline-block
    if (next && next.kind === "text" && next.value.trim() === "{") {
      return this.parseInlineBlock(name);
    }

    // "Name <nonterm> {" → named inline-block (e.g. Object3D string{)
    if (next && next.kind === "nonterm") {
      const saved = this.pos;
      const nameParam = this.advance()!; // nonterm
      if (this.match("text", "{")) {
        return this.parseInlineBlock(name, nameParam.value);
      }
      // Not a named block — restore
      this.pos = saved;
    }

    // "Name" then "=" as separate token → property
    if (next && next.kind === "text" && next.value.trim().startsWith("=")) {
      return this.parseProperty(name, false);
    }

    // Bare identifier with no following context — skip
    return null;
  }

  // ── Inline block ─────────────────────────────────────────────

  private parseInlineBlock(objectName: string, nameParam?: string): GrammarRule {
    this.advance(); // consume "{"
    const bodyTokens = this.collectBlockBody();
    const body = new Parser(bodyTokens).parseRules();
    return {
      kind: "inline-block",
      objectName,
      ...(nameParam ? { nameParam } : {}),
      body,
      optional: false,
    };
  }

  // ── Property ─────────────────────────────────────────────────

  private parseProperty(name: string, optional: boolean): GrammarRule {
    // Consume "=" text token
    const eqTok = this.advance()!;
    const afterEq = eqTok.value.trim().replace(/^=\s*/, "");

    // Collect value tokens until ";"
    const valueTokens: Token[] = [];
    if (afterEq) {
      valueTokens.push({ kind: "text", value: afterEq });
    }
    this.collectUntilSemicolon(valueTokens);

    return this.buildProperty(name, valueTokens, optional, false);
  }

  /**
   * Parse property when "Name = " was already consumed as a single token.
   * Collects value tokens until ";".
   */
  private parsePropertyAfterEquals(name: string, optional: boolean): GrammarRule {
    const valueTokens: Token[] = [];
    this.collectUntilSemicolon(valueTokens);
    return this.buildProperty(name, valueTokens, optional, false);
  }

  /**
   * Collect tokens into `out` until a ";" text token is consumed.
   */
  private collectUntilSemicolon(out: Token[]): void {
    while (!this.isEof()) {
      if (this.match("text", ";")) {
        this.advance();
        return;
      }
      out.push(this.advance()!);
    }
  }

  /**
   * Build a property GrammarRule from value tokens.
   */
  private buildProperty(
    name: string,
    tokens: Token[],
    optional: boolean,
    multiple: boolean,
  ): GrammarRule {
    // Check for enum: ctrl( text ctrl| text ctrl)
    const enumValues = this.tryExtractEnum(tokens);
    if (enumValues) {
      return {
        kind: "property",
        name,
        type: `enum:${enumValues.join(",")}`,
        optional,
        multiple,
        arity: 1,
      };
    }

    // Collect nonterm types
    const types: string[] = [];
    for (const t of tokens) {
      if (t.kind === "nonterm") types.push(t.value);
    }

    // If value contains ctrl groups, treat as expression
    const hasCtrlGroup = tokens.some(
      (t) => t.kind === "ctrl" && (t.value === "(" || t.value === "|"),
    );
    if (hasCtrlGroup && types.length > 0) {
      let totalArity = 0;
      let hasMultiple = multiple;
      for (const t of tokens) {
        if (t.kind === "nonterm") totalArity++;
        if (t.kind === "sup" && (t.value === "*" || t.value.endsWith("+"))) {
          hasMultiple = true;
        }
      }
      const uniqueTypes = [...new Set(types)];
      const type = uniqueTypes.length === 1 ? uniqueTypes[0] : "expression";
      return {
        kind: "property",
        name,
        type,
        optional,
        multiple: hasMultiple,
        arity: totalArity > 0 ? totalArity : 1,
      };
    }

    if (types.length === 0) {
      return {
        kind: "property",
        name,
        type: "unknown",
        optional,
        multiple,
        arity: 1,
      };
    }

    const uniqueTypes = [...new Set(types)];
    const type = uniqueTypes.length === 1 ? uniqueTypes[0] : "expression";
    return { kind: "property", name, type, optional, multiple, arity: types.length };
  }

  /**
   * Try to extract enum values from tokens: ctrl( text ctrl| text ctrl)
   */
  private tryExtractEnum(tokens: Token[]): string[] | null {
    let start = -1;
    let end = -1;
    let depth = 0;
    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i].kind === "ctrl" && tokens[i].value === "(") {
        if (depth === 0) start = i;
        depth++;
      } else if (tokens[i].kind === "ctrl" && tokens[i].value === ")") {
        depth--;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }
    if (start === -1 || end === -1) return null;

    const inner = tokens.slice(start + 1, end);
    if (inner.some((t) => t.kind === "nonterm")) return null;
    if (!inner.some((t) => t.kind === "ctrl" && t.value === "|")) return null;

    const values: string[] = [];
    for (const t of inner) {
      if (t.kind === "text") {
        const v = t.value.trim();
        if (v) values.push(v);
      }
    }
    return values.length >= 2 ? values : null;
  }

  // ── Grouped (ctrl parens) ────────────────────────────────────

  private parseGrouped(): GrammarRule | null {
    this.advance(); // consume ctrl(

    const inner: Token[] = [];
    let depth = 1;
    while (!this.isEof()) {
      const t = this.peek()!;
      if (t.kind === "ctrl" && t.value === "(") {
        depth++;
        inner.push(this.advance()!);
      } else if (t.kind === "ctrl" && t.value === ")") {
        depth--;
        if (depth === 0) {
          this.advance();
          break;
        }
        inner.push(this.advance()!);
      } else {
        inner.push(this.advance()!);
      }
    }

    const after = this.peek();

    // (...){  → union-block
    if (after && after.kind === "text" && after.value.trim() === "{") {
      return this.parseGroupedBlock(inner);
    }

    // (...)= → union-property
    if (after && after.kind === "text" && after.value.trim().startsWith("=")) {
      return this.parseUnionProperty(inner);
    }

    // (...)opt / (...)cond
    if (after && after.kind === "sub") {
      this.advance();
      return this.parseGroupedOptional(inner);
    }

    // (...)*  (...)1+
    if (after && after.kind === "sup") {
      const q = this.parseQuantifier();
      return this.parseGroupedWithQuantifier(inner, q);
    }

    // Bare group — parse contents
    const subParser = new Parser(inner);
    const rules = subParser.parseRules();
    if (rules.length === 1) return rules[0];
    return rules.length > 0 ? rules[0] : null;
  }

  /**
   * (Name1 | Name2){ body } → union-block
   */
  private parseGroupedBlock(inner: Token[]): GrammarRule {
    const names: string[] = [];
    for (const t of inner) {
      if (t.kind === "text") {
        const v = t.value.trim();
        if (v) names.push(v);
      }
    }

    this.advance(); // consume "{"
    const bodyTokens = this.collectBlockBody();
    const body = new Parser(bodyTokens).parseRules();

    return { kind: "union-block", objectNames: names, body };
  }

  /**
   * (Name1 | Name2) = type (,type)* ; → union-property
   */
  private parseUnionProperty(inner: Token[]): GrammarRule {
    const names: string[] = [];
    for (const t of inner) {
      if (t.kind === "text") {
        const v = t.value.trim();
        if (v) names.push(v);
      }
    }

    // Consume "= ..."
    const eqTok = this.advance()!;
    const afterEq = eqTok.value.trim().replace(/^=\s*/, "");

    const valueTokens: Token[] = [];
    if (afterEq) valueTokens.push({ kind: "text", value: afterEq });
    this.collectUntilSemicolon(valueTokens);

    const types: string[] = [];
    let multiple = false;
    for (const t of valueTokens) {
      if (t.kind === "nonterm") types.push(t.value);
      if (t.kind === "sup" && (t.value === "*" || t.value.endsWith("+"))) multiple = true;
    }

    const uniqueTypes = [...new Set(types)];
    const type = uniqueTypes.length === 1 ? uniqueTypes[0] : "expression";

    return {
      kind: "union-property",
      names,
      type,
      optional: false,
      multiple,
      arity: 1,
    };
  }

  /**
   * (content)opt or (content)cond → mark inner rules as optional.
   */
  private parseGroupedOptional(inner: Token[]): GrammarRule | null {
    const subParser = new Parser(inner);
    const rules = subParser.parseRules();

    if (rules.length === 1) {
      const rule = rules[0];
      if (rule.kind === "property") return { ...rule, optional: true };
      if (rule.kind === "inline-block") return { ...rule, optional: true };
      if (rule.kind === "ref") return rule;
    }

    return rules.length > 0 ? rules[0] : null;
  }

  /**
   * (content)* or (content)1+
   */
  private parseGroupedWithQuantifier(
    inner: Token[],
    q: { min: number; max: number },
  ): GrammarRule | null {
    const hasPipe = inner.some((t) => t.kind === "ctrl" && t.value === "|");

    if (hasPipe) {
      const hasNonterm = inner.some((t) => t.kind === "nonterm");
      if (hasNonterm) {
        const alternatives = this.splitByPipe(inner);
        const result: GrammarRule[][] = [];
        for (const alt of alternatives) {
          const rules = new Parser(alt).parseRules();
          const applied = rules.map((r) =>
            r.kind === "ref" ? { ...r, min: q.min, max: q.max } : r,
          );
          result.push(applied);
        }
        return { kind: "union", alternatives: result };
      }
    }

    const rules = new Parser(inner).parseRules();
    if (rules.length === 1) {
      const rule = rules[0];
      if (rule.kind === "property") return { ...rule, multiple: true };
    }
    return rules.length > 0 ? rules[0] : null;
  }

  // ── Utilities ────────────────────────────────────────────────

  private splitByPipe(tokens: Token[]): Token[][] {
    const alternatives: Token[][] = [];
    let current: Token[] = [];
    let depth = 0;

    for (const t of tokens) {
      if (t.kind === "ctrl" && t.value === "(") {
        depth++;
        current.push(t);
      } else if (t.kind === "ctrl" && t.value === ")") {
        depth--;
        current.push(t);
      } else if (t.kind === "ctrl" && t.value === "|" && depth === 0) {
        if (current.length > 0) alternatives.push(current);
        current = [];
      } else {
        current.push(t);
      }
    }
    if (current.length > 0) alternatives.push(current);
    return alternatives;
  }

  /**
   * Collect tokens for a block body. The opening "{" has been consumed.
   * Reads until the matching "}".
   */
  private collectBlockBody(): Token[] {
    const body: Token[] = [];
    let depth = 1;

    while (!this.isEof()) {
      const t = this.peek()!;
      if (t.kind === "text" && t.value.trim() === "{") {
        depth++;
        body.push(this.advance()!);
      } else if (t.kind === "text" && t.value.trim() === "}") {
        depth--;
        if (depth === 0) {
          this.advance(); // consume "}"
          return body;
        }
        body.push(this.advance()!);
      } else {
        body.push(this.advance()!);
      }
    }
    return body;
  }

  private parseQuantifier(): { min: number; max: number } {
    if (this.match("sup")) {
      const t = this.advance()!;
      const v = t.value;
      if (v === "*") return { min: 0, max: Infinity };
      const plusMatch = v.match(/^(\d+)\+$/);
      if (plusMatch) return { min: Number(plusMatch[1]), max: Infinity };
      const numMatch = v.match(/^(\d+)$/);
      if (numMatch) {
        const n = Number(numMatch[1]);
        return { min: n, max: n };
      }
      return { min: 1, max: 1 };
    }
    return { min: 1, max: 1 };
  }

  private coalescePipeUnions(rules: GrammarRule[]): GrammarRule[] {
    const hasPipe = rules.some((r) => (r as any).kind === "text-pipe");
    if (!hasPipe) return rules;

    const alternatives: GrammarRule[][] = [];
    let current: GrammarRule[] = [];

    for (const r of rules) {
      if ((r as any).kind === "text-pipe") {
        if (current.length > 0) alternatives.push(current);
        current = [];
      } else {
        current.push(r);
      }
    }
    if (current.length > 0) alternatives.push(current);

    if (alternatives.length <= 1) return alternatives[0] ?? [];
    return [{ kind: "union", alternatives }];
  }
}

// ── Public API ──────────────────────────────────────────────────────

export function parseBnfBody(rawHtml: string): GrammarRule[] {
  const tokens = tokenize(rawHtml);
  const parser = new Parser(tokens);
  return parser.parseRules();
}
