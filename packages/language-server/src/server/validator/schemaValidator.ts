import type {
  FileNode,
  ObjectNode,
  PropertyNode,
  BodyNode,
  ExprNode,
  TopLevelNode,
} from "../../shared/ast.js";
import type { Diagnostic } from "../../shared/diagnostics.js";
import type { ObjectSchema, PropertySchema, PropertyType } from "../../schema/schemaTypes.js";
import { semanticSchema, getPluginTypeSchema } from "../../schema/semantic.generated.js";
import { resolveSchemaKey } from "../../schema/schemaUtils.js";
import { extractPluginType } from "../../schema/pluginType.js";

/**
 * AST + スキーマから意味レベルのエラーを検出する。
 * PluginHeader > PluginType の値を元にルート検証を行う。
 * PluginType が取得できない場合はルート検証をスキップする。
 */
export function validateSchema(file: FileNode): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  const pluginType = extractPluginType(file);

  // ルート schemaKey マップを構築 (PluginType コンテキスト依存の解決用)
  const rootSchemaKeyMap = new Map<string, string>();
  if (pluginType) {
    const rootEntries = getPluginTypeSchema(pluginType);
    if (rootEntries) {
      validateRoot(file, pluginType, rootEntries, diagnostics);
      for (const entry of rootEntries) {
        if (entry.schemaKey) {
          rootSchemaKeyMap.set(entry.name, entry.schemaKey);
        }
      }
    }
  }

  // ── ボディ走査 ──
  for (const node of file.body) {
    if (node.type === "object" && rootSchemaKeyMap.has(node.name)) {
      // PluginType コンテキスト依存の schemaKey で走査
      const schemaKey = rootSchemaKeyMap.get(node.name)!;
      const schema = semanticSchema[schemaKey];
      if (schema) {
        validateProperties(node, schema, diagnostics);
        validateChildren(node, schema, schemaKey, diagnostics);
      }
    } else {
      visitTopLevel(node, undefined, diagnostics);
    }
  }

  return diagnostics;
}

// ---------------------------------------------------------------------------
// ルート検証
// ---------------------------------------------------------------------------

function validateRoot(
  file: FileNode,
  pluginType: string,
  rootEntries: import("../../schema/schemaTypes.js").RootObjectEntry[],
  diagnostics: Diagnostic[],
): void {
  const allowedNames = new Set(rootEntries.map((e) => e.name));
  const rootCounts = new Map<string, number>();

  for (const node of file.body) {
    if (node.type !== "object") continue; // If / ApplySwitch はスキップ
    if (!allowedNames.has(node.name)) {
      diagnostics.push({
        message: `'${node.name}' is not allowed as root object for PluginType '${pluginType}'`,
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
        message: `Required root object '${entry.name}' is missing for PluginType '${pluginType}'`,
        range: file.range,
        severity: "warning",
      });
    }
    if (!entry.multiple && count > 1) {
      diagnostics.push({
        message: `Duplicate root object '${entry.name}' for PluginType '${pluginType}'`,
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
  const seen = new Map<string, PropertyNode>();
  for (const child of body) {
    if (child.type === "property") {
      const propSchema = schema.properties[child.name];
      if (propSchema && !propSchema.multiple) {
        if (seen.has(child.name)) {
          diagnostics.push({
            message: `Duplicate property '${child.name}' in '${objectName}'`,
            range: child.nameRange,
            severity: "error",
          });
        } else {
          seen.set(child.name, child);
        }
      }
    } else if (child.type === "if") {
      checkDuplicateProps(child.then, schema, objectName, diagnostics);
      if (child.else_) checkDuplicateProps(child.else_, schema, objectName, diagnostics);
    } else if (child.type === "applySwitch") {
      for (const c of child.cases) {
        checkDuplicateProps(c.body, schema, objectName, diagnostics);
      }
      if (child.default_) checkDuplicateProps(child.default_, schema, objectName, diagnostics);
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

  // arity チェック (expression 型で arity 未指定の場合はスキップ)
  if (expectedArity != null && values.length !== expectedArity) {
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

function getExpectedArity(schema: PropertySchema): number | null {
  if (schema.arity != null) return schema.arity;
  switch (schema.type) {
    case "vector-2d":
      return 2;
    case "vector-3d":
      return 3;
    case "expression":
      return null; // expression 型は可変長 — arity チェックをスキップ
    default:
      return 1;
  }
}

function checkValueType(
  value: ExprNode,
  type: PropertyType,
  propName: string,
  objectName: string,
  schema: PropertySchema,
  diagnostics: Diagnostic[],
): void {
  // group → 内側を再帰チェック
  if (value.type === "group") {
    checkValueType(value.inner, type, propName, objectName, schema, diagnostics);
    return;
  }

  // ternary / binary → expression 型のみ許可
  if (value.type === "ternary" || value.type === "binary") {
    if (type !== "expression") {
      pushTypeMismatch(propName, objectName, type, value, diagnostics);
    }
    return;
  }

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
      // RailSim II ではオブジェクト名を文字列でも指定可能 (例: AttachObject = "MainBody")
      if (value.type !== "identifier" && value.type !== "string") {
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

    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}

function isFloatCompatible(value: ExprNode): boolean {
  if (value.type === "number") return true;
  if (value.type === "unary" && value.op === "-") {
    return isFloatCompatible(value.operand);
  }
  if (value.type === "group") return isFloatCompatible(value.inner);
  return false;
}

function isIntegerCompatible(value: ExprNode): boolean {
  if (value.type === "number" && Number.isInteger(value.value)) return true;
  if (value.type === "unary" && value.op === "-") {
    return isIntegerCompatible(value.operand);
  }
  if (value.type === "group") return isIntegerCompatible(value.inner);
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
  const seen = new Map<string, ObjectNode>();
  for (const child of body) {
    if (child.type === "object") {
      const childDef = schema.children[child.name];
      if (childDef && !childDef.multiple) {
        if (seen.has(child.name)) {
          diagnostics.push({
            message: `Duplicate child object '${child.name}' in '${objectName}'`,
            range: child.nameRange,
            severity: "error",
          });
        } else {
          seen.set(child.name, child);
        }
      }
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
}
