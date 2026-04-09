/**
 * Schema overrides — vendor 由来の補正情報。
 * ドキュメント BNF だけでは判別できない型やフラグを上書きする。
 */

export interface PropertyOverride {
  type?: string;
  required?: boolean;
  multiple?: boolean;
  arity?: number | null; // null = arity を削除（expression の可変長化）
  enumValues?: string[];
}

export interface ChildOverride {
  required?: boolean;
  multiple?: boolean;
  schemaKey?: string;
}

export interface SchemaOverride {
  properties?: Record<string, PropertyOverride>;
  children?: Record<string, ChildOverride>;
  nameParameter?: string;
}

/**
 * 追加スキーマ — BNF には出現しないがコンテキスト分岐で必要なオブジェクト定義。
 */
export interface AdditionalSchema {
  properties: Record<
    string,
    {
      type: string;
      required: boolean;
      multiple: boolean;
      arity?: number;
      enumValues?: string[];
    }
  >;
  children: Record<
    string,
    {
      required: boolean;
      multiple: boolean;
      schemaKey?: string;
    }
  >;
  nameParameter?: string;
}

export interface FileSchemaEntry {
  name: string;
  required: boolean;
  multiple: boolean;
  schemaKey?: string;
}

// ---------------------------------------------------------------------------
// Object schema overrides
// ---------------------------------------------------------------------------

export const schemaOverrides: Record<string, SchemaOverride> = {
  // ── PluginHeader ──
  PluginHeader: {
    properties: {
      Description: { type: "string", required: false, multiple: true },
      PluginType: {
        type: "enum",
        enumValues: [
          "Rail",
          "Tie",
          "Girder",
          "Pier",
          "Line",
          "Pole",
          "Train",
          "Station",
          "Struct",
          "Surface",
          "Env",
          "Skin",
        ],
      },
    },
  },

  // ── Profile / Face / Line / Wireframe: children multiple ──
  Profile: {
    children: {
      Face: { multiple: true },
      Material: { multiple: true },
    },
  },
  Face: {
    properties: {
      MaterialID: { type: "integer", required: false },
    },
    children: {
      Vertex: { multiple: true, schemaKey: "Vertex:Profile" },
    },
  },
  Line: {
    properties: {
      MaterialID: { type: "integer", required: false },
    },
    children: {
      Vertex: { multiple: true, schemaKey: "Vertex:Wireframe" },
    },
  },
  Wireframe: {
    children: {
      Line: { multiple: true },
    },
  },

  // ── Lighting: Set multiple ──
  Lighting: {
    children: {
      Set: { multiple: true },
    },
  },

  // ── LensFlare: children multiple ──
  LensFlare: {
    children: {
      Circle: { multiple: true, schemaKey: "Circle:LensFlare" },
      Hexagon: { multiple: true, schemaKey: "Hexagon:LensFlare" },
      Texture: { multiple: true },
    },
  },

  // ── Object3D / ObjectZY / Body / Axle / Link / Slide: customizer property type overrides ──
  // required/multiple are now auto-derived from BNF quantifiers (customizer *).
  // Only type and arity overrides remain here.
  Object3D: {
    properties: {
      NoCastShadow: { type: "expression", arity: null },
      NoReceiveShadow: { type: "expression", arity: null },
      NoShadow: { type: "expression", arity: null },
      Transparent: { type: "expression", arity: null },
      EnvMap: { type: "expression", arity: null },
      AlphaZeroTest: { type: "expression", arity: null },
      ChangeTexture: { type: "expression", arity: 2 },
      ChangeAlpha: { type: "expression", arity: 2 },
      ChangeModel: { type: "expression", arity: 2 },
      ShiftTexture: { type: "expression", arity: 3 },
      SetAnimation: { type: "expression", arity: 2 },
      ScaleTexture: { type: "expression", arity: 5 },
      RotateTexture: { type: "expression", arity: 4 },
      TransformTexture: { type: "expression", arity: 7 },
    },
    children: {
      // Joint3D multiple is not derivable from BNF (BNF says exactly 1)
      Joint3D: { multiple: true },
      // CrankZY / PistonZY / Link / Slide are not in BNF for Object3D directly
      CrankZY: { required: false, multiple: true },
      PistonZY: { required: false, multiple: true },
      Link: { required: false, multiple: true },
      Slide: { required: false, multiple: false },
    },
  },

  ObjectZY: {
    properties: {
      NoCastShadow: { type: "expression", arity: null },
      NoReceiveShadow: { type: "expression", arity: null },
      NoShadow: { type: "expression", arity: null },
      Transparent: { type: "expression", arity: null },
      EnvMap: { type: "expression", arity: null },
      AlphaZeroTest: { type: "expression", arity: null },
      ChangeTexture: { type: "expression", arity: 2 },
      ChangeAlpha: { type: "expression", arity: 2 },
      ChangeModel: { type: "expression", arity: 2 },
      ShiftTexture: { type: "expression", arity: 3 },
      SetAnimation: { type: "expression", arity: 2 },
      ScaleTexture: { type: "expression", arity: 5 },
      RotateTexture: { type: "expression", arity: 4 },
      TransformTexture: { type: "expression", arity: 7 },
    },
    children: {
      // JointZYX multiple is not derivable from BNF (BNF says exactly 2)
      JointZYX: { multiple: true },
      CrankZY: { required: false, multiple: true },
      PistonZY: { required: false, multiple: true },
      Link: { required: false, multiple: true },
    },
  },

  Body: {
    properties: {
      NoCastShadow: { type: "expression", arity: null },
      NoReceiveShadow: { type: "expression", arity: null },
      NoShadow: { type: "expression", arity: null },
      Transparent: { type: "expression", arity: null },
      EnvMap: { type: "expression", arity: null },
      AlphaZeroTest: { type: "expression", arity: null },
      ChangeTexture: { type: "expression", arity: 2 },
      ChangeAlpha: { type: "expression", arity: 2 },
      ChangeModel: { type: "expression", arity: 2 },
      ShiftTexture: { type: "expression", arity: 3 },
      SetAnimation: { type: "expression", arity: 2 },
      ScaleTexture: { type: "expression", arity: 5 },
      RotateTexture: { type: "expression", arity: 4 },
      TransformTexture: { type: "expression", arity: 7 },
    },
    children: {
      // JointZY multiple is not derivable from BNF (BNF says exactly 2)
      JointZY: { multiple: true },
    },
  },

  Axle: {
    properties: {
      NoCastShadow: { type: "expression", arity: null },
      NoReceiveShadow: { type: "expression", arity: null },
      NoShadow: { type: "expression", arity: null },
      Transparent: { type: "expression", arity: null },
      EnvMap: { type: "expression", arity: null },
      AlphaZeroTest: { type: "expression", arity: null },
      ChangeTexture: { type: "expression", arity: 2 },
      ChangeAlpha: { type: "expression", arity: 2 },
      ChangeModel: { type: "expression", arity: 2 },
      ShiftTexture: { type: "expression", arity: 3 },
      SetAnimation: { type: "expression", arity: 2 },
      ScaleTexture: { type: "expression", arity: 5 },
      RotateTexture: { type: "expression", arity: 4 },
      TransformTexture: { type: "expression", arity: 7 },
    },
  },

  Link: {
    properties: {
      NoCastShadow: { type: "expression", arity: null },
      NoReceiveShadow: { type: "expression", arity: null },
      NoShadow: { type: "expression", arity: null },
      Transparent: { type: "expression", arity: null },
      EnvMap: { type: "expression", arity: null },
      AlphaZeroTest: { type: "expression", arity: null },
      ChangeTexture: { type: "expression", arity: 2 },
      ChangeAlpha: { type: "expression", arity: 2 },
      ChangeModel: { type: "expression", arity: 2 },
      ShiftTexture: { type: "expression", arity: 3 },
      SetAnimation: { type: "expression", arity: 2 },
      ScaleTexture: { type: "expression", arity: 5 },
      RotateTexture: { type: "expression", arity: 4 },
      TransformTexture: { type: "expression", arity: 7 },
    },
  },

  Slide: {
    properties: {
      NoCastShadow: { type: "expression", arity: null },
      NoReceiveShadow: { type: "expression", arity: null },
      NoShadow: { type: "expression", arity: null },
      Transparent: { type: "expression", arity: null },
      EnvMap: { type: "expression", arity: null },
      AlphaZeroTest: { type: "expression", arity: null },
      ChangeTexture: { type: "expression", arity: 2 },
      ChangeAlpha: { type: "expression", arity: 2 },
      ChangeModel: { type: "expression", arity: 2 },
      ShiftTexture: { type: "expression", arity: 3 },
      SetAnimation: { type: "expression", arity: 2 },
      ScaleTexture: { type: "expression", arity: 5 },
      RotateTexture: { type: "expression", arity: 4 },
      TransformTexture: { type: "expression", arity: 7 },
    },
  },

  // ── ChangeMaterial: MaterialID is expression (variable arity) ──
  ChangeMaterial: {
    properties: {
      MaterialID: { type: "expression", arity: null },
    },
  },

  // ── PrimaryAssembly: type/arity overrides only (required/multiple from BNF) ──
  PrimaryAssembly: {
    properties: {
      ConnectRail: { type: "expression", arity: null },
      DisconnectRail: { type: "expression", arity: null },
      BranchRail: { type: "expression", arity: null },
    },
  },

  // ── DefineAnimation: type/arity overrides ──
  DefineAnimation: {
    properties: {
      ShiftTexture: { type: "expression", arity: 2 },
    },
  },

  // ── PistonZY / TriangleZY: Link multiple ──
  PistonZY: {
    children: {
      Link: { multiple: true },
    },
  },
  TriangleZY: {
    children: {
      Link: { multiple: true },
    },
  },
  CrankZY: {
    children: {
      Link: { multiple: true },
      Slide: { multiple: true },
    },
  },

  // ── NormalCursor: Cursor2DAnimFrame expression ──
  NormalCursor: {
    properties: {
      Cursor2DAnimFrame: { type: "expression", arity: null },
    },
  },

  // ── ListView: DefaultBaseColor* as expression ──
  ListView: {
    properties: {
      DefaultBaseColorOdd: { type: "expression", arity: null },
      DefaultBaseColorEven: { type: "expression", arity: null },
      SelectedBaseColor: { type: "expression", arity: null },
    },
  },

  // ── PluginTree: DefaultBaseColor as expression ──
  PluginTree: {
    properties: {
      DefaultBaseColor: { type: "expression", arity: null },
      SelectedBaseColor: { type: "expression", arity: null },
    },
  },

  // ── EditCtrl ──
  EditCtrl: {
    properties: {
      EditBaseColor: { type: "expression", arity: null },
      ConvertClauseColor: { type: "expression", arity: null },
      SelectedBaseColor: { type: "expression", arity: null },
    },
  },

  // ── PopupMenu ──
  PopupMenu: {
    properties: {
      SelectedBaseColor: { type: "expression", arity: null },
    },
  },

  // ── Headlight: LensFlare multiple (BNF says opt but multiple in practice) ──
  Headlight: {
    children: {
      LensFlare: { multiple: true },
    },
  },

  // ── Model (Pole): needs ModelFileName, ModelScale ──
  Model: {
    properties: {
      ModelFileName: { type: "filename", required: false, multiple: false },
      ModelScale: { type: "float", required: false, multiple: false },
    },
  },
};

// ---------------------------------------------------------------------------
// Additional schema objects (context-dependent variants)
// ---------------------------------------------------------------------------

export const additionalSchemas: Record<string, AdditionalSchema> = {
  "Vertex:Profile": {
    properties: {
      Coord: { type: "vector-2d", required: true, multiple: false },
      Normal: { type: "vector-2d", required: false, multiple: false },
      TexU: { type: "float", required: false, multiple: false },
      IgnoreCant: { type: "yes-no", required: false, multiple: false },
      Diffuse: { type: "color", required: false, multiple: false },
    },
    children: {},
  },
  "Vertex:Wireframe": {
    properties: {
      Coord: { type: "vector-3d", required: true, multiple: false },
      IgnoreCant: { type: "yes-no", required: false, multiple: false },
      Diffuse: { type: "color", required: false, multiple: false },
    },
    children: {},
  },
};

// ---------------------------------------------------------------------------
// File schema overrides — ファイルごとのルートオブジェクト定義を上書き
// ---------------------------------------------------------------------------

export const fileSchemaOverrides: Record<string, FileSchemaEntry[]> = {
  "Rail2.txt": [
    { name: "PluginHeader", required: true, multiple: false },
    { name: "RailInfo", required: true, multiple: false },
    { name: "SoundInfo", required: false, multiple: false },
    { name: "Profile", required: false, multiple: true },
    { name: "Wireframe", required: false, multiple: true },
    { name: "Interval", required: false, multiple: true },
  ],
  "Tie2.txt": [
    { name: "PluginHeader", required: true, multiple: false },
    { name: "TieInfo", required: true, multiple: false },
    { name: "Profile", required: false, multiple: true },
  ],
  "Girder2.txt": [
    { name: "PluginHeader", required: true, multiple: false },
    { name: "GirderInfo", required: true, multiple: false },
    { name: "Profile", required: false, multiple: true },
  ],
  "Pier2.txt": [
    { name: "PluginHeader", required: true, multiple: false },
    { name: "PierInfo", required: true, multiple: false },
    { name: "Base", required: false, multiple: false },
    { name: "Head", required: false, multiple: false },
    { name: "Joint", required: false, multiple: true },
    { name: "Profile", required: false, multiple: true },
    { name: "Interval", required: false, multiple: true },
  ],
  "Line2.txt": [
    { name: "PluginHeader", required: true, multiple: false },
    { name: "LineInfo", required: true, multiple: false },
    { name: "Wireframe", required: false, multiple: true },
    { name: "Interval", required: false, multiple: true },
  ],
  "Pole2.txt": [
    { name: "PluginHeader", required: true, multiple: false },
    { name: "PoleInfo", required: true, multiple: false },
    { name: "Model", required: false, multiple: true },
  ],
  "Train2.txt": [
    { name: "PluginHeader", required: true, multiple: false },
    { name: "TrainInfo", required: true, multiple: false },
    { name: "DefineSwitch", required: false, multiple: true },
    { name: "DefineAnimation", required: false, multiple: true },
    { name: "PrimaryAssembly", required: false, multiple: false },
  ],
  "Station2.txt": [
    { name: "PluginHeader", required: true, multiple: false },
    { name: "StationInfo", required: true, multiple: false },
    { name: "Platform", required: false, multiple: true },
    { name: "DefineSwitch", required: false, multiple: true },
    { name: "DefineAnimation", required: false, multiple: true },
    { name: "PrimaryAssembly", required: false, multiple: false },
  ],
  "Struct2.txt": [
    { name: "PluginHeader", required: true, multiple: false },
    { name: "StructInfo", required: true, multiple: false },
    { name: "DefineSwitch", required: false, multiple: true },
    { name: "DefineAnimation", required: false, multiple: true },
    { name: "PrimaryAssembly", required: false, multiple: false },
  ],
  "Surface2.txt": [
    { name: "PluginHeader", required: true, multiple: false },
    { name: "SurfaceInfo", required: true, multiple: false },
    { name: "PrimaryAssembly", required: false, multiple: false },
  ],
  "Env2.txt": [
    { name: "PluginHeader", required: true, multiple: false },
    { name: "EnvInfo", required: true, multiple: false },
    { name: "Landscape", required: false, multiple: true },
    { name: "Sun", required: false, multiple: false },
    { name: "Moon", required: false, multiple: false },
  ],
  "Skin2.txt": [
    { name: "PluginHeader", required: true, multiple: false },
    { name: "NormalCursor", required: false, multiple: false },
    { name: "ResizeCursor1", required: false, multiple: false },
    { name: "ResizeCursor2", required: false, multiple: false },
    { name: "ResizeCursor3", required: false, multiple: false },
    { name: "ResizeCursor4", required: false, multiple: false },
    { name: "Interface", required: false, multiple: false },
    { name: "Background", required: false, multiple: false },
    { name: "PopupMenu", required: false, multiple: false },
    { name: "ListView", required: false, multiple: false },
    { name: "EditCtrl", required: false, multiple: false },
    { name: "PluginTree", required: false, multiple: false },
    { name: "Frame", required: false, multiple: false },
    { name: "Model", required: false, multiple: false },
    { name: "Sound", required: false, multiple: false },
  ],
};
