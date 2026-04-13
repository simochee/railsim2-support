/**
 * Schema overrides — vendor 由来の補正情報。
 * ドキュメント BNF だけでは判別できない型やフラグを上書きする。
 */

export interface PropertyOverride {
  type?: string;
  required?: boolean;
  multiple?: boolean;
  arity?: number | null; // null = arity を削除（expression の可変長化）
  fillable?: boolean; // true = 値不足時に最後の値で埋められる (RailSim2 fill flag)
  enumValues?: string[];
  min?: number; // 値の下限 (warning)
  max?: number; // 値の上限 (warning)
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
      Face: { required: false, multiple: true },
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
      Line: { required: false, multiple: true },
    },
  },

  // ── Lighting: Set multiple ──
  Lighting: {
    children: {
      Set: { required: false, multiple: true },
    },
  },

  // ── Sun: LensFlare / Whiteout は vendor で if-guard パターン（省略可能）──
  // vendor/CEnvPlugin.cpp: if(tmp = m_SunLensFlare.Read(str)) str = tmp;
  Sun: {
    children: {
      LensFlare: { required: false },
      Whiteout: { required: false },
    },
  },

  // ── LensFlare: children multiple + Twinkle range ──
  // vendor/CLensFlare.cpp: Twinkle は 0.0〜1.0 の点滅度合い
  LensFlare: {
    properties: {
      Twinkle: { min: 0, max: 1 },
    },
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
      // vendor/CNamedObject.cpp: Tilt は if-guard パターン（デフォルト m_TiltMaxAngle = 0.0f）
      Tilt: { required: false },
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

  // ── Joint3D: LocalCoord は BNF 上必須だが実装では省略可能 ──
  // vendor/CNamedObject.cpp:258-259 で確認: if-else パターン（デフォルト V3ZERO）
  // ※ JointZY/JointZYX の LocalCoord は throw パターン（必須）なので override しない
  Joint3D: {
    properties: {
      LocalCoord: { required: false },
    },
  },

  // ── JointZYX: AttachX は BNF 上必須だが実装では省略可能 ──
  // vendor/CTrainPlugin.cpp:50-51: if-else パターン（デフォルト 0.0f）
  JointZYX: {
    properties: {
      AttachX: { required: false },
    },
  },

  // ── TrackWind: FixAxis は BNF 上必須だが実装では省略可能 ──
  // vendor/CCustomizerMover.cpp:273-278: if-else パターン（デフォルト m_FixAxisFlag = false）
  TrackWind: {
    properties: {
      FixAxis: { required: false },
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
    // vendor/CTrainPlugin.cpp: Axle は while-loop パターン（0個でもOK）
    children: {
      Axle: { required: false },
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
      LensFlare: { required: false, multiple: true },
    },
  },

  // ── Particle: fill flag 対応 (vendor/CParticle.cpp:181-186) ──
  // AsgnFloat/AsgnVector3D/AsgnColor の最終引数 fill=true により値不足時に最後の値で埋められる
  // Lifetime/InitialRadius/FinalRadius は AsgnFloat(..., 2, true) で float×2。
  // BNF 由来の vector-2d は座標ベクトルを意味するため float + arity:2 に修正。
  Particle: {
    properties: {
      Lifetime: { type: "float", arity: 2, fillable: true },
      Direction: { fillable: true },
      InitialRadius: { type: "float", arity: 2, fillable: true },
      FinalRadius: { type: "float", arity: 2, fillable: true },
      Color: { fillable: true },
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
  // ── Model:Pole — Pole2.txt の Model は ModelFileName + ModelScale のみ ──
  // vendor/CPolePlugin.cpp:29-31: 両方とも throw パターン（必須）
  // ※ Skin の Model（Arrow/Link/Segment/Compass/WindDir）とは別定義
  "Model:Pole": {
    properties: {
      ModelFileName: { type: "filename", required: true, multiple: false },
      ModelScale: { type: "float", required: true, multiple: false },
    },
    children: {},
  },
};

// ---------------------------------------------------------------------------
// File schema overrides — ファイルごとのルートオブジェクト定義を上書き
// ---------------------------------------------------------------------------

export const pluginTypeSchemaOverrides: Record<string, FileSchemaEntry[]> = {
  Rail: [
    { name: "PluginHeader", required: true, multiple: false },
    { name: "RailInfo", required: true, multiple: false },
    { name: "SoundInfo", required: false, multiple: false },
    { name: "Profile", required: false, multiple: true },
    { name: "Wireframe", required: false, multiple: true },
    { name: "Interval", required: false, multiple: true },
  ],
  Tie: [
    { name: "PluginHeader", required: true, multiple: false },
    { name: "TieInfo", required: true, multiple: false },
    { name: "Profile", required: false, multiple: true },
  ],
  Girder: [
    { name: "PluginHeader", required: true, multiple: false },
    { name: "GirderInfo", required: true, multiple: false },
    { name: "Profile", required: false, multiple: true },
  ],
  Pier: [
    { name: "PluginHeader", required: true, multiple: false },
    { name: "PierInfo", required: true, multiple: false },
    { name: "Base", required: false, multiple: false },
    { name: "Head", required: false, multiple: false },
    { name: "Joint", required: false, multiple: true },
    { name: "Profile", required: false, multiple: true },
    { name: "Interval", required: false, multiple: true },
  ],
  Line: [
    { name: "PluginHeader", required: true, multiple: false },
    { name: "LineInfo", required: true, multiple: false },
    { name: "Wireframe", required: false, multiple: true },
    { name: "Interval", required: false, multiple: true },
  ],
  Pole: [
    { name: "PluginHeader", required: true, multiple: false },
    { name: "PoleInfo", required: true, multiple: false },
    { name: "Model", required: false, multiple: true, schemaKey: "Model:Pole" },
  ],
  Train: [
    { name: "PluginHeader", required: true, multiple: false },
    { name: "TrainInfo", required: true, multiple: false },
    { name: "DefineSwitch", required: false, multiple: true },
    { name: "DefineAnimation", required: false, multiple: true },
    { name: "PrimaryAssembly", required: false, multiple: false },
  ],
  Station: [
    { name: "PluginHeader", required: true, multiple: false },
    { name: "StationInfo", required: true, multiple: false },
    { name: "Platform", required: false, multiple: true },
    { name: "DefineSwitch", required: false, multiple: true },
    { name: "DefineAnimation", required: false, multiple: true },
    { name: "PrimaryAssembly", required: false, multiple: false },
  ],
  Struct: [
    { name: "PluginHeader", required: true, multiple: false },
    { name: "StructInfo", required: true, multiple: false },
    { name: "DefineSwitch", required: false, multiple: true },
    { name: "DefineAnimation", required: false, multiple: true },
    { name: "PrimaryAssembly", required: false, multiple: false },
  ],
  Surface: [
    { name: "PluginHeader", required: true, multiple: false },
    { name: "SurfaceInfo", required: true, multiple: false },
    { name: "PrimaryAssembly", required: false, multiple: false },
  ],
  Env: [
    { name: "PluginHeader", required: true, multiple: false },
    { name: "EnvInfo", required: true, multiple: false },
    { name: "Landscape", required: false, multiple: true },
    { name: "Sun", required: false, multiple: false },
    { name: "Moon", required: false, multiple: false },
  ],
  Skin: [
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
