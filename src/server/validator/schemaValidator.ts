import type {
  FileNode,
  ObjectNode,
  PropertyNode,
  BodyNode,
  ExprNode,
  TopLevelNode,
} from "../../shared/ast.js";
import type { Diagnostic } from "../../shared/diagnostics.js";
import type { ObjectSchema, PropertySchema } from "../../schema/schemaTypes.js";
import { semanticSchema, getFileSchema } from "../../schema/semantic.js";
import { resolveSchemaKey } from "../../schema/schemaUtils.js";

/**
 * AST + スキーマ + ファイル名から意味レベルのエラーを検出する。
 * fileName を省略するとルート検証をスキップする（後方互換）。
 */
export function validateSchema(
  file: FileNode,
  fileName?: string,
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  // ── ルート検証 ──
  if (fileName) {
    validateRoot(file, fileName, diagnostics);
  }

  // ── ボディ走査 ──
  for (const node of file.body) {
    visitTopLevel(node, undefined, diagnostics);
  }

  return diagnostics;
}

// ---------------------------------------------------------------------------
// ルート検証
// ---------------------------------------------------------------------------

function validateRoot(
  file: FileNode,
  fileName: string,
  diagnostics: Diagnostic[],
): void {
  const rootEntries = getFileSchema(fileName);
  if (!rootEntries) return;

  const allowedNames = new Set(rootEntries.map((e) => e.name));
  const rootCounts = new Map<string, number>();

  for (const node of file.body) {
    if (node.type !== "object") continue; // If / ApplySwitch はスキップ
    if (!allowedNames.has(node.name)) {
      diagnostics.push({
        message: `'${node.name}' is not allowed as root object in '${fileName}'`,
        range: node.nameRange,
        severity: "error",
      });
    }
    rootCounts.set(node.name, (rootCounts.get(node.name) ?? 0) + 1);
  }

  for (const entry of rootEntries) {
    const count = rootCounts.get(entry.name) ?? 0;
    if (entry.required && count === 0) {
      diagnostics.push({
        message: `Required root object '${entry.name}' is missing in '${fileName}'`,
        range: file.range,
        severity: "warning",
      });
    }
    if (!entry.multiple && count > 1) {
      diagnostics.push({
        message: `Duplicate root object '${entry.name}' in '${fileName}'`,
        range: file.range,
        severity: "error",
      });
    }
  }
}

// ---------------------------------------------------------------------------
// 再帰走査
// ---------------------------------------------------------------------------

function visitTopLevel(
  node: TopLevelNode | BodyNode,
  parentSchemaKey: string | undefined,
  diagnostics: Diagnostic[],
): void {
  switch (node.type) {
    case "object":
      visitObject(node, parentSchemaKey, diagnostics);
      break;
    case "if":
      for (const child of node.then) {
        visitTopLevel(child, parentSchemaKey, diagnostics);
      }
      if (node.else_) {
        for (const child of node.else_) {
          visitTopLevel(child, parentSchemaKey, diagnostics);
        }
      }
      break;
    case "applySwitch":
      for (const c of node.cases) {
        for (const child of c.body) {
          visitTopLevel(child, parentSchemaKey, diagnostics);
        }
      }
      if (node.default_) {
        for (const child of node.default_) {
          visitTopLevel(child, parentSchemaKey, diagnostics);
        }
      }
      break;
    case "property":
    case "comment":
      break;
  }
}

function visitObject(
  node: ObjectNode,
  parentSchemaKey: string | undefined,
  diagnostics: Diagnostic[],
): void {
  // スキーマ解決: 親の children に schemaKey があればそれを使う
  const schemaKey = resolveSchemaKey(node.name, parentSchemaKey);
  const schema = semanticSchema[schemaKey];

  // schema が見つからなければスキップ（unknownKeywordValidator の責務）
  if (!schema) return;

  validateProperties(node, schema, diagnostics);
  validateChildren(node, schema, schemaKey, diagnostics);
}

// ---------------------------------------------------------------------------
// BodyNode のフラット化 — If/ApplySwitch を再帰的に展開
// ---------------------------------------------------------------------------

function collectFlatBody(body: BodyNode[]): BodyNode[] {
  const result: BodyNode[] = [];
  for (const node of body) {
    switch (node.type) {
      case "if":
        result.push(...collectFlatBody(node.then));
        if (node.else_) result.push(...collectFlatBody(node.else_));
        break;
      case "applySwitch":
        for (const c of node.cases) {
          result.push(...collectFlatBody(c.body));
        }
        if (node.default_) result.push(...collectFlatBody(node.default_));
        break;
      default:
        result.push(node);
        break;
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// プロパティ検証
// ---------------------------------------------------------------------------

function validateProperties(
  node: ObjectNode,
  schema: ObjectSchema,
  diagnostics: Diagnostic[],
): void {
  const flatBody = collectFlatBody(node.body);

  // 型チェック・無効チェック: フラット化した全プロパティを検証
  const seenAll = new Set<string>();
  for (const child of flatBody) {
    if (child.type !== "property") continue;

    const propSchema = schema.properties[child.name];
    if (!propSchema) {
      diagnostics.push({
        message: `Invalid property '${child.name}' in '${node.name}'`,
        range: child.nameRange,
        severity: "error",
      });
      continue;
    }

    seenAll.add(child.name);
    validatePropertyType(child, propSchema, node.name, diagnostics);
  }

  // 必須プロパティ欠落チェック: フラット化全体で判定
  for (const [name, propSchema] of Object.entries(schema.properties)) {
    if (propSchema.required && !seenAll.has(name)) {
      diagnostics.push({
        message: `Required property '${name}' is missing in '${node.name}'`,
        range: node.nameRange,
        severity: "warning",
      });
    }
  }

  // 重複チェック: スコープ単位（直接の子 + 各分岐枝ごと）
  checkDuplicateProps(node.body, schema, node.name, diagnostics);
}

function checkDuplicateProps(
  body: BodyNode[],
  schema: ObjectSchema,
  objectName: string,
  diagnostics: Diagnostic[],
): void {
  const counts = new Map<string, number>();
  for (const child of body) {
    if (child.type === "property") {
      counts.set(child.name, (counts.get(child.name) ?? 0) + 1);
    } else if (child.type === "if") {
      // 各枝を独立スコープとして再帰チェック
      checkDuplicateProps(child.then, schema, objectName, diagnostics);
      if (child.else_) checkDuplicateProps(child.else_, schema, objectName, diagnostics);
    } else if (child.type === "applySwitch") {
      for (const c of child.cases) {
        checkDuplicateProps(c.body, schema, objectName, diagnostics);
      }
      if (child.default_) checkDuplicateProps(child.default_, schema, objectName, diagnostics);
    }
  }
  for (const [name, count] of counts) {
    const propSchema = schema.properties[name];
    if (propSchema && !propSchema.multiple && count > 1) {
      diagnostics.push({
        message: `Duplicate property '${name}' in '${objectName}'`,
        range: body[0]?.type === "property" ? body[0].nameRange : { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
        severity: "error",
      });
    }
  }
}

// ---------------------------------------------------------------------------
// 型チェック
// ---------------------------------------------------------------------------

function validatePropertyType(
  prop: PropertyNode,
  schema: PropertySchema,
  objectName: string,
  diagnostics: Diagnostic[],
): void {
  const expectedArity = getExpectedArity(schema);
  const values = prop.values;

  // arity チェック
  if (values.length !== expectedArity) {
    diagnostics.push({
      message: `Property '${prop.name}' in '${objectName}' expects ${expectedArity} value(s), got ${values.length}`,
      range: prop.range,
      severity: "error",
    });
    return;
  }

  // 各値の型チェック
  for (const value of values) {
    checkValueType(value, schema.type, prop.name, objectName, schema, diagnostics);
  }
}

function getExpectedArity(schema: PropertySchema): number {
  if (schema.arity != null) return schema.arity;
  switch (schema.type) {
    case "vector-2d": return 2;
    case "vector-3d": return 3;
    default: return 1;
  }
}

function checkValueType(
  value: ExprNode,
  type: string,
  propName: string,
  objectName: string,
  schema: PropertySchema,
  diagnostics: Diagnostic[],
): void {
  // binary 式 → expression 扱い（スキップ）
  if (value.type === "binary") return;

  switch (type) {
    case "float":
    case "vector-2d":
    case "vector-3d":
      if (!isFloatCompatible(value)) {
        pushTypeMismatch(propName, objectName, "float", value, diagnostics);
      }
      break;

    case "integer":
      if (!isIntegerCompatible(value)) {
        pushTypeMismatch(propName, objectName, "integer", value, diagnostics);
      }
      break;

    case "string":
    case "filename":
      if (value.type !== "string") {
        pushTypeMismatch(propName, objectName, type, value, diagnostics);
      }
      break;

    case "yes-no":
      if (value.type !== "boolean") {
        pushTypeMismatch(propName, objectName, "yes-no", value, diagnostics);
      }
      break;

    case "color":
      if (value.type !== "color") {
        pushTypeMismatch(propName, objectName, "color", value, diagnostics);
      }
      break;

    case "identifier":
      if (value.type !== "identifier") {
        pushTypeMismatch(propName, objectName, "identifier", value, diagnostics);
      }
      break;

    case "enum":
      if (value.type !== "identifier") {
        pushTypeMismatch(propName, objectName, "enum", value, diagnostics);
      } else if (schema.enumValues && !schema.enumValues.includes(value.value)) {
        diagnostics.push({
          message: `Type mismatch: '${propName}' in '${objectName}' expects enum value (${schema.enumValues.join(", ")}), got '${value.value}'`,
          range: value.range,
          severity: "error",
        });
      }
      break;

    case "expression":
      // 任意 — チェックなし
      break;
  }
}

function isFloatCompatible(value: ExprNode): boolean {
  if (value.type === "number") return true;
  if (value.type === "unary" && value.op === "-" && value.operand.type === "number") return true;
  if (value.type === "binary") return true; // expression 扱い
  return false;
}

function isIntegerCompatible(value: ExprNode): boolean {
  if (value.type === "number" && Number.isInteger(value.value)) return true;
  if (
    value.type === "unary" &&
    value.op === "-" &&
    value.operand.type === "number" &&
    Number.isInteger(value.operand.value)
  ) return true;
  if (value.type === "binary") return true; // expression 扱い
  return false;
}

function pushTypeMismatch(
  propName: string,
  objectName: string,
  expected: string,
  actual: ExprNode,
  diagnostics: Diagnostic[],
): void {
  diagnostics.push({
    message: `Type mismatch: '${propName}' in '${objectName}' expects ${expected}, got ${actual.type}`,
    range: actual.range,
    severity: "error",
  });
}

// ---------------------------------------------------------------------------
// 子オブジェクト検証
// ---------------------------------------------------------------------------

function validateChildren(
  node: ObjectNode,
  schema: ObjectSchema,
  schemaKey: string,
  diagnostics: Diagnostic[],
): void {
  const flatBody = collectFlatBody(node.body);

  // 無効チェック + 再帰走査 + 必須カウント: フラット化した全子オブジェクト
  const seenAll = new Set<string>();
  for (const child of flatBody) {
    if (child.type === "object") {
      if (!schema.children[child.name]) {
        diagnostics.push({
          message: `Invalid child object '${child.name}' in '${node.name}'`,
          range: child.nameRange,
          severity: "error",
        });
      }
      seenAll.add(child.name);

      // 再帰走査
      visitObject(child, schemaKey, diagnostics);
    }
  }

  // 必須子オブジェクト欠落チェック: フラット化全体で判定
  for (const [name, childSchema] of Object.entries(schema.children)) {
    if (childSchema.required && !seenAll.has(name)) {
      diagnostics.push({
        message: `Required child object '${name}' is missing in '${node.name}'`,
        range: node.nameRange,
        severity: "warning",
      });
    }
  }

  // 重複チェック: スコープ単位（直接の子 + 各分岐枝ごと）
  checkDuplicateChildren(node.body, schema, node.name, diagnostics);
}

function checkDuplicateChildren(
  body: BodyNode[],
  schema: ObjectSchema,
  objectName: string,
  diagnostics: Diagnostic[],
): void {
  const counts = new Map<string, number>();
  for (const child of body) {
    if (child.type === "object") {
      counts.set(child.name, (counts.get(child.name) ?? 0) + 1);
    } else if (child.type === "if") {
      checkDuplicateChildren(child.then, schema, objectName, diagnostics);
      if (child.else_) checkDuplicateChildren(child.else_, schema, objectName, diagnostics);
    } else if (child.type === "applySwitch") {
      for (const c of child.cases) {
        checkDuplicateChildren(c.body, schema, objectName, diagnostics);
      }
      if (child.default_) checkDuplicateChildren(child.default_, schema, objectName, diagnostics);
    }
  }
  for (const [name, count] of counts) {
    const childDef = schema.children[name];
    if (childDef && !childDef.multiple && count > 1) {
      diagnostics.push({
        message: `Duplicate child object '${name}' in '${objectName}'`,
        range: body[0]?.type === "object" ? body[0].nameRange : { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
        severity: "error",
      });
    }
  }
}
