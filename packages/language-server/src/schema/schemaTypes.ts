export type PropertyType =
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

export interface PropertySchema {
  type: PropertyType;
  required: boolean;
  multiple: boolean; // true = 同名プロパティ複数回許可
  arity?: number; // 値の個数。省略時は1。Coord = 1.0, 2.0; なら arity: 2
  enumValues?: string[]; // type === "enum" の場合
}

export interface ChildSchema {
  required: boolean;
  multiple: boolean; // true = 複数配置可
  schemaKey?: string; // 親コンテキスト依存の場合の lookup key（例: "Vertex:Profile"）
}

export interface ObjectSchema {
  properties: Record<string, PropertySchema>;
  children: Record<string, ChildSchema>;
  nameParameter?: PropertyType; // Object3D "name" の引数型（Phase 2 では型のみ定義、検証は将来対応）
}

export type SemanticSchema = Record<string, ObjectSchema>;

/** ファイルレベルのルートオブジェクト定義 */
export interface RootObjectEntry {
  name: string;
  required: boolean;
  multiple: boolean;
  schemaKey?: string; // ファイルコンテキスト依存の場合の lookup key
}

/** PluginType ごとのトップレベル構造 */
export type PluginTypeSchema = Record<string, RootObjectEntry[]>;

/** @deprecated FileSchema は PluginTypeSchema に置き換え */
export type FileSchema = PluginTypeSchema;
