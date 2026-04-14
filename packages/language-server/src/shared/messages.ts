// ---------------------------------------------------------------------------
// Diagnostic メッセージ定義
//
// すべての diagnostic メッセージをこのファイルに集約する。
// 各関数はテンプレートパラメータを受け取り、ローカライズ済みの文字列を返す。
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

export const parser = {
  expectedToken: (token: string) => `'${token}' が必要です`,
  expectedTernaryColon: () => `三項演算子に ':' が必要です`,
  expectedExpression: () => `'=' の後に式が必要です`,
  expectedCaseOrDefault: () => `ApplySwitch 内に 'Case' または 'Default' が必要です`,
  unexpectedTokenInExpr: (token: string) => `式の中に予期しないトークン '${token}' があります`,
  unexpectedIdentifierTopLevel: (name: string) => `トップレベルに予期しない識別子 '${name}' があります`,
  unexpectedTokenTopLevel: (token: string) => `トップレベルに予期しないトークン '${token}' があります`,
  unexpectedIdentifier: (name: string) => `予期しない識別子 '${name}'`,
  unexpectedToken: (token: string) => `予期しないトークン '${token}'`,
};

// ---------------------------------------------------------------------------
// Schema Validator
// ---------------------------------------------------------------------------

export const schema = {
  rootNotAllowed: (name: string, pluginType: string) =>
    `'${name}' は PluginType '${pluginType}' のルートオブジェクトとして使用できません`,
  rootRequired: (name: string, pluginType: string) =>
    `PluginType '${pluginType}' に必須のルートオブジェクト '${name}' がありません`,
  rootDuplicate: (name: string, pluginType: string) =>
    `PluginType '${pluginType}' のルートオブジェクト '${name}' が重複しています`,

  invalidProperty: (propName: string, objectName: string) =>
    `'${objectName}' に無効なプロパティ '${propName}' があります`,
  requiredProperty: (propName: string, objectName: string) =>
    `'${objectName}' に必須のプロパティ '${propName}' がありません`,
  duplicateProperty: (propName: string, objectName: string) =>
    `'${objectName}' のプロパティ '${propName}' が重複しています`,

  arityMismatch: (propName: string, objectName: string, expected: number, actual: number) =>
    `'${objectName}' のプロパティ '${propName}' は ${expected} 個の値が必要ですが、${actual} 個指定されています`,
  typeMismatch: (propName: string, objectName: string, expected: string, actual: string) =>
    `型の不一致: '${objectName}' の '${propName}' は ${expected} 型が必要ですが、${actual} が指定されています`,
  enumMismatch: (propName: string, objectName: string, validValues: string[], actual: string) =>
    `型の不一致: '${objectName}' の '${propName}' は enum 値 (${validValues.join(", ")}) が必要ですが、'${actual}' が指定されています`,

  belowMinimum: (propName: string, objectName: string, value: number, min: number) =>
    `'${objectName}' の '${propName}' の値 ${value} は最小値 ${min} を下回っています`,
  aboveMaximum: (propName: string, objectName: string, value: number, max: number) =>
    `'${objectName}' の '${propName}' の値 ${value} は最大値 ${max} を超えています`,

  invalidChild: (childName: string, objectName: string) =>
    `'${objectName}' に無効な子オブジェクト '${childName}' があります`,
  requiredChild: (childName: string, objectName: string) =>
    `'${objectName}' に必須の子オブジェクト '${childName}' がありません`,
  duplicateChild: (childName: string, objectName: string) =>
    `'${objectName}' の子オブジェクト '${childName}' が重複しています`,
};

// ---------------------------------------------------------------------------
// Switch Validator
// ---------------------------------------------------------------------------

export const switchMsg = {
  duplicateDefinition: (name: string) =>
    `スイッチ定義 '${name}' が重複しています`,
  undefinedReference: (name: string) =>
    `未定義のスイッチ '${name}' が参照されています`,
  invalidIntegerIndex: (value: number, switchName: string) =>
    `スイッチ '${switchName}' の値 ${value} は有効な整数インデックスではありません`,
  noEntries: (switchName: string) =>
    `スイッチ '${switchName}' にエントリーがありません`,
  valueNotDefined: (value: number, switchName: string, labels: string) =>
    `スイッチ '${switchName}' に値 ${value} は定義されていません (有効: ${labels})`,
  valueOutOfRange: (value: number, switchName: string, maxIndex: number) =>
    `スイッチ '${switchName}' に値 ${value} は定義されていません (有効範囲: 0..${maxIndex})`,
};

// ---------------------------------------------------------------------------
// Unknown Keyword Validator
// ---------------------------------------------------------------------------

export const unknown = {
  objectName: (name: string) => `不明なオブジェクト名 '${name}'`,
  propertyName: (name: string) => `不明なプロパティ名 '${name}'`,
};
