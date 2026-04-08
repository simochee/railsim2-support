import type {
  SemanticSchema,
  FileSchema,
  RootObjectEntry,
  ObjectSchema,
  PropertyType,
} from "./schemaTypes.js";

// ---------------------------------------------------------------------------
// Helper — 頻出パターンの短縮記法
// ---------------------------------------------------------------------------

const req = (type: PropertyType, opts?: Partial<{ multiple: boolean; arity: number; enumValues: string[] }>) =>
  ({ type, required: true as const, multiple: opts?.multiple ?? false, arity: opts?.arity, enumValues: opts?.enumValues });

const opt = (type: PropertyType, opts?: Partial<{ multiple: boolean; arity: number; enumValues: string[] }>) =>
  ({ type, required: false as const, multiple: opts?.multiple ?? false, arity: opts?.arity, enumValues: opts?.enumValues });

const child = (required: boolean, multiple: boolean, schemaKey?: string) =>
  ({ required, multiple, schemaKey }) as const;

// ---------------------------------------------------------------------------
// Semantic Schema — 全オブジェクト定義
// ---------------------------------------------------------------------------

export const semanticSchema: SemanticSchema = {
  // ===== 共通 =====
  PluginHeader: {
    properties: {
      RailSimVersion: req("string"),
      PluginType: req("enum", { enumValues: ["Rail", "Tie", "Girder", "Pier", "Line", "Pole", "Train", "Station", "Struct", "Surface", "Env", "Skin"] }),
      PluginName: req("string"),
      PluginAuthor: req("string"),
      Description: opt("string"),
      IconTexture: opt("filename"),
      IconRect: opt("integer", { arity: 4 }),
    },
    children: {},
  },

  // ===== Rail2.txt =====
  RailInfo: {
    properties: {
      Gauge: req("float"),
      TrackNum: opt("integer"),
      ModelFileName: opt("filename"),
      ModelScale: opt("float"),
      SegmentModelFileName: opt("filename"),
      SegmentModelScale: opt("float"),
      LinkModelFileName: opt("filename"),
      LinkModelScale: opt("float"),
      ArrowModelFileName: opt("filename"),
      ArrowModelScale: opt("float"),
      RailPlugin: opt("filename"),
      TiePlugin: opt("filename"),
      GirderPlugin: opt("filename"),
      PierPlugin: opt("filename"),
      LinePlugin: opt("filename"),
      PolePlugin: opt("filename"),
      TrackInterval: opt("float"),
      MaxCant: opt("float"),
      EnableCant: opt("yes-no"),
      CantRatio: opt("float"),
      FlattenCant: opt("yes-no"),
      ConnectRail: opt("identifier"),
      DisconnectRail: opt("identifier"),
      BranchRail: opt("identifier"),
    },
    children: {
      DefineSwitch: child(false, true),
      DefineAnimation: child(false, true),
    },
  },

  SoundInfo: {
    properties: {
      WaveFileName: opt("filename"),
      JointInterval: opt("float"),
      WheelSound: opt("yes-no"),
      WheelSoundFile: opt("filename"),
    },
    children: {},
  },

  Profile: {
    properties: {},
    children: {
      Face: child(false, true),
    },
  },

  Face: {
    properties: {
      MaterialID: opt("integer"),
    },
    children: {
      Vertex: child(true, true, "Vertex:Profile"),
    },
  },

  "Vertex:Profile": {
    properties: {
      Coord: req("vector-2d"),
      Normal: opt("vector-2d"),
      TexU: opt("float"),
    },
    children: {},
  },

  Wireframe: {
    properties: {},
    children: {
      Line: child(false, true),
    },
  },

  Line: {
    properties: {
      MaterialID: opt("integer"),
    },
    children: {
      Vertex: child(true, true, "Vertex:Wireframe"),
    },
  },

  "Vertex:Wireframe": {
    properties: {
      Coord: req("vector-3d"),
    },
    children: {},
  },

  Interval: {
    properties: {
      Interval: req("float"),
      Height: opt("float"),
      IgnoreCant: opt("yes-no"),
      Offset: opt("float"),
      ModelFileName: opt("filename"),
      ModelScale: opt("float"),
    },
    children: {},
  },

  // ===== Tie2.txt =====
  TieInfo: {
    properties: {
      ModelFileName: req("filename"),
      ModelScale: opt("float"),
    },
    children: {
      DefineSwitch: child(false, true),
      DefineAnimation: child(false, true),
    },
  },

  // ===== Girder2.txt =====
  GirderInfo: {
    properties: {
      ModelFileName: req("filename"),
      ModelScale: opt("float"),
    },
    children: {
      DefineSwitch: child(false, true),
      DefineAnimation: child(false, true),
    },
  },

  // ===== Pier2.txt =====
  PierInfo: {
    properties: {
      ModelFileName: req("filename"),
      ModelScale: opt("float"),
      Height: opt("float"),
      BaseAlt: opt("float"),
      BaseToPierLocal: opt("vector-3d"),
      HeadToPierLocal: opt("vector-3d"),
      Offset: opt("float"),
      TaperX: opt("float"),
      TaperY: opt("float"),
      TaperZ: opt("float"),
    },
    children: {
      DefineSwitch: child(false, true),
      DefineAnimation: child(false, true),
    },
  },

  // ===== Line2.txt =====
  LineInfo: {
    properties: {
      ModelFileName: req("filename"),
      ModelScale: opt("float"),
      TrolleyAlt: opt("float"),
      Height: opt("float"),
      MaxInterval: opt("float"),
      Offset: opt("float"),
      MaxDeflection: opt("float"),
    },
    children: {
      DefineSwitch: child(false, true),
      DefineAnimation: child(false, true),
    },
  },

  // ===== Pole2.txt =====
  PoleInfo: {
    properties: {
      ModelFileName: req("filename"),
      ModelScale: opt("float"),
    },
    children: {
      DefineSwitch: child(false, true),
      DefineAnimation: child(false, true),
    },
  },

  // ===== Train2.txt =====
  TrainInfo: {
    properties: {
      Gauge: req("float"),
      MaxVelocity: opt("float"),
      Acceleration: opt("float"),
      Deceleration: opt("float"),
      MaxAcceleration: opt("float"),
      MaxDeceleration: opt("float"),
      DoorClosingTime: opt("float"),
      OpenDoor: opt("enum", { enumValues: ["Up", "Down"] }),
      FrontLimit: opt("float"),
      TailLimit: opt("float"),
      TrackSpeed: opt("float"),
      Stoppable: opt("yes-no"),
    },
    children: {
      Body: child(true, true),
      Sound: child(false, true),
      DefineSwitch: child(false, true),
      DefineAnimation: child(false, true),
    },
  },

  Body: {
    properties: {
      ModelFileName: req("filename"),
      ModelScale: opt("float"),
    },
    children: {
      Headlight: child(false, true),
      FrontCabin: child(false, false),
      TailCabin: child(false, false),
      Axle: child(false, true),
      Object3D: child(false, true),
    },
  },

  Headlight: {
    properties: {
      Coord: req("vector-3d"),
      Direction: opt("vector-3d"),
      Color: opt("color"),
      AttachObject: opt("identifier"),
    },
    children: {},
  },

  FrontCabin: {
    properties: {
      ModelFileName: req("filename"),
      ModelScale: opt("float"),
    },
    children: {},
  },

  TailCabin: {
    properties: {
      ModelFileName: req("filename"),
      ModelScale: opt("float"),
    },
    children: {},
  },

  Axle: {
    properties: {
      Coord: req("vector-3d"),
      Diameter: opt("float"),
      Symmetric: opt("integer"),
    },
    children: {},
  },

  Object3D: {
    properties: {
      ModelFileName: req("filename"),
      ModelScale: opt("float"),
      AttachCoord: opt("vector-3d"),
      AttachDir: opt("vector-3d"),
      AttachUp: opt("vector-3d"),
      AnalogClock: opt("enum", { enumValues: ["Hour", "Minute", "Second"] }),
    },
    children: {
      StaticRotation: child(false, false),
      DynamicRotation: child(false, false),
      StaticMove: child(false, false),
    },
    nameParameter: "identifier",
  },

  StaticRotation: {
    properties: {
      RotationAxis: opt("vector-3d"),
      RotationAngle: opt("float"),
    },
    children: {},
  },

  DynamicRotation: {
    properties: {
      RotationAxis: opt("vector-3d"),
      RotationSpeed: opt("float"),
    },
    children: {},
  },

  StaticMove: {
    properties: {
      Direction: opt("vector-3d"),
      Distance: opt("float"),
      Displacement: opt("vector-3d"),
    },
    children: {},
  },

  Sound: {
    properties: {
      WaveFileName: req("filename"),
      Volume: opt("float"),
      Loop: opt("yes-no"),
      VelocityRel: opt("yes-no"),
      AccelerationRel: opt("yes-no"),
      DecelerationRel: opt("yes-no"),
      AttachObject: opt("identifier"),
    },
    children: {},
  },

  // ===== Station2.txt =====
  StationInfo: {
    properties: {
      ModelFileName: req("filename"),
      ModelScale: opt("float"),
      Height: opt("float"),
    },
    children: {
      Platform: child(false, true),
      DefineSwitch: child(false, true),
      DefineAnimation: child(false, true),
    },
  },

  Platform: {
    properties: {
      Coord: req("vector-3d"),
      Direction: opt("vector-3d"),
      ParentObject: opt("identifier"),
      LinePlugin: opt("filename"),
    },
    children: {},
  },

  // ===== Struct2.txt =====
  StructInfo: {
    properties: {
      ModelFileName: req("filename"),
      ModelScale: opt("float"),
      Height: opt("float"),
      BuildMinAlt: opt("float"),
    },
    children: {
      DefineSwitch: child(false, true),
      DefineAnimation: child(false, true),
    },
  },

  // ===== Surface2.txt =====
  SurfaceInfo: {
    properties: {
      SizeX: req("float"),
      SizeZ: req("float"),
      SurfaceAlt: opt("float"),
      LiftRailSurface: opt("yes-no"),
    },
    children: {
      Material: child(false, true),
      Texture: child(false, true),
      DefineSwitch: child(false, true),
      DefineAnimation: child(false, true),
    },
  },

  Material: {
    properties: {
      Ambient: opt("color"),
      Diffuse: opt("color"),
      Specular: opt("color"),
      Emissive: opt("color"),
      Power: opt("float"),
      Transparent: opt("yes-no"),
      AlphaZeroTest: opt("yes-no"),
      BlendMode: opt("enum", { enumValues: ["Add", "Alpha"] }),
      CastShadow: opt("yes-no"),
      NoCastShadow: opt("yes-no"),
      NoReceiveShadow: opt("yes-no"),
      NoShadow: opt("yes-no"),
      UseTexture: opt("yes-no"),
      TexVPerMeter: opt("float"),
    },
    children: {},
  },

  Texture: {
    properties: {
      TexFileName: req("filename"),
      ScaleTexture: opt("vector-2d"),
      ShiftTexture: opt("vector-2d"),
      RotateTexture: opt("float"),
      TransformTexture: opt("float", { arity: 6 }),
    },
    children: {},
  },

  // ===== Env2.txt =====
  EnvInfo: {
    properties: {
      SkyColor: opt("color"),
      BackgroundColor: opt("color"),
      Gravity: opt("float"),
      Latitude: opt("float"),
      AxialInclination: opt("float"),
      EnvMapTexFileName: opt("filename"),
    },
    children: {
      Sun: child(false, false),
      Moon: child(false, false),
      Landscape: child(false, true),
      Whiteout: child(false, false),
      Lighting: child(false, false),
      DefineSwitch: child(false, true),
      DefineAnimation: child(false, true),
    },
  },

  Sun: {
    properties: {
      SunAlt: opt("float"),
      Color: opt("color"),
      Directional: opt("color"),
      Ambient: opt("color"),
      NightThreshold: opt("float"),
      ModelFileName: opt("filename"),
      ModelScale: opt("float"),
      AxialInclination: opt("float"),
    },
    children: {},
  },

  Moon: {
    properties: {
      Color: opt("color"),
      ModelFileName: opt("filename"),
      ModelScale: opt("float"),
      AxialInclination: opt("float"),
      RevolutionPeriod: opt("float"),
      InitialPhase: opt("float"),
    },
    children: {},
  },

  Landscape: {
    properties: {
      ModelFileName: req("filename"),
      ModelScale: opt("float"),
    },
    children: {},
  },

  Whiteout: {
    properties: {
      Color: opt("color"),
      MaxDistance: opt("float"),
      StartAngle: opt("float"),
    },
    children: {},
  },

  Lighting: {
    properties: {
      Ambient: opt("color"),
      Diffuse: opt("color"),
    },
    children: {},
  },

  // ===== Skin2.txt 関連 =====
  NormalCursor: {
    properties: {
      Cursor2DSize: opt("vector-2d"),
      Cursor2DHotSpot: opt("vector-2d"),
      Cursor2DAnimNumber: opt("integer"),
      Cursor2DAnimFrame: opt("integer", { arity: 4, multiple: true }),
      TexFileName: opt("filename"),
    },
    children: {},
  },

  ResizeCursor1: {
    properties: {
      Cursor2DSize: opt("vector-2d"),
      Cursor2DHotSpot: opt("vector-2d"),
      Cursor2DAnimNumber: opt("integer"),
      Cursor2DAnimFrame: opt("integer", { arity: 4, multiple: true }),
      TexFileName: opt("filename"),
    },
    children: {},
  },

  ResizeCursor2: {
    properties: {
      Cursor2DSize: opt("vector-2d"),
      Cursor2DHotSpot: opt("vector-2d"),
      Cursor2DAnimNumber: opt("integer"),
      Cursor2DAnimFrame: opt("integer", { arity: 4, multiple: true }),
      TexFileName: opt("filename"),
    },
    children: {},
  },

  ResizeCursor3: {
    properties: {
      Cursor2DSize: opt("vector-2d"),
      Cursor2DHotSpot: opt("vector-2d"),
      Cursor2DAnimNumber: opt("integer"),
      Cursor2DAnimFrame: opt("integer", { arity: 4, multiple: true }),
      TexFileName: opt("filename"),
    },
    children: {},
  },

  ResizeCursor4: {
    properties: {
      Cursor2DSize: opt("vector-2d"),
      Cursor2DHotSpot: opt("vector-2d"),
      Cursor2DAnimNumber: opt("integer"),
      Cursor2DAnimFrame: opt("integer", { arity: 4, multiple: true }),
      TexFileName: opt("filename"),
    },
    children: {},
  },

  Interface: {
    properties: {
      FontName: opt("string"),
      ImageSize: opt("vector-2d"),
      FrameTexFileName: opt("filename"),
      IconTexFileName: opt("filename"),
      DefaultFontColor: opt("color"),
      DefaultBaseColor: opt("color"),
      DefaultBaseColorEven: opt("color"),
      DefaultBaseColorOdd: opt("color"),
      SelectedFontColor: opt("color"),
      SelectedBaseColor: opt("color"),
      EditFontColor: opt("color"),
      EditBaseColor: opt("color"),
      DisabledFontColor: opt("color"),
      DisabledShadowColor: opt("color"),
      StaticFontColor: opt("color"),
      FloatFontColor: opt("color"),
      InfoFontColor: opt("color"),
      LabelFontColor: opt("color"),
      ButtonFontColor: opt("color"),
      TitleBarFontColor: opt("color"),
      FocusFrameColor: opt("color"),
      ShadowColor: opt("color"),
      ConvertFontColor: opt("color"),
      ConvertClauseColor: opt("color"),
      UseWallpaper: opt("yes-no"),
    },
    children: {},
  },

  Background: {
    properties: {
      TexFileName: opt("filename"),
      UseTexture: opt("yes-no"),
    },
    children: {},
  },

  // ===== 共有 子オブジェクト =====

  DefineSwitch: {
    properties: {
      Entry: opt("string", { multiple: true }),
      GroupCommon: opt("string"),
    },
    children: {},
    nameParameter: "identifier",
  },

  DefineAnimation: {
    properties: {
      AnimationTime: opt("float"),
      PreAnimationDelay: opt("float"),
      PostAnimationDelay: opt("float"),
      ReverseTime: opt("float"),
      PreReverseDelay: opt("float"),
      PostReverseDelay: opt("float"),
      Loop: opt("yes-no"),
      Frame: opt("string", { multiple: true }),
      NumberedFrame: opt("string", { multiple: true }),
      RotationUVFrame: opt("string", { multiple: true }),
      SlideUVFrame: opt("string", { multiple: true }),
      TiledUVFrame: opt("string", { multiple: true }),
    },
    children: {
      Set: child(false, true),
      Frame: child(false, true),
      NumberedFrame: child(false, true),
    },
    nameParameter: "identifier",
  },

  Set: {
    properties: {
      SetAnimation: opt("identifier"),
    },
    children: {},
  },

  Frame: {
    properties: {},
    children: {},
  },

  NumberedFrame: {
    properties: {},
    children: {},
  },

  // ===== 高度なオブジェクト =====

  Vertex: {
    properties: {
      Coord: req("vector-3d"),
      Normal: opt("vector-3d"),
      TexU: opt("float"),
    },
    children: {},
  },

  // Particle, LensFlare, etc.
  Particle: {
    properties: {
      TexFileName: opt("filename"),
      TextureFileName: opt("filename"),
      Color: opt("color"),
      InnerColor: opt("color"),
      OuterColor: opt("color"),
      SourceCoord: opt("vector-3d"),
      Direction: opt("vector-3d"),
      Inclination: opt("float"),
      InitialRadius: opt("float"),
      FinalRadius: opt("float"),
      Lifetime: opt("float"),
      MinQty: opt("integer"),
      MaxQty: opt("integer"),
      MinInterval: opt("float"),
      MaxInterval: opt("float"),
      Gravity: opt("float"),
      Turbulence: opt("float"),
      AirResistance: opt("float"),
      AttachObject: opt("identifier"),
    },
    children: {},
  },

  LensFlare: {
    properties: {
      Coord: req("vector-3d"),
      Color: opt("color"),
      Radius: opt("float"),
      Twinkle: opt("float"),
      StartAngle: opt("float"),
    },
    children: {},
  },

  // Model / ChangeMaterial / etc.
  Model: {
    properties: {
      ModelFileName: req("filename"),
      ModelScale: opt("float"),
      CompassModelFileName: opt("filename"),
      CompassModelScale: opt("float"),
      WindDirModelFileName: opt("filename"),
      WindDirModelScale: opt("float"),
    },
    children: {},
  },

  ChangeMaterial: {
    properties: {
      ChangeTexture: opt("filename"),
      ChangeAlpha: opt("float"),
      ChangeModel: opt("filename"),
    },
    children: {},
    nameParameter: "identifier",
  },

  // ===== Wireframe 系サブオブジェクト =====
  Circle: {
    properties: {
      Coord: req("vector-3d"),
      Radius: req("float"),
      Height: opt("float"),
    },
    children: {},
  },

  Hexagon: {
    properties: {
      Coord: req("vector-3d"),
      Radius: req("float"),
      Height: opt("float"),
    },
    children: {},
  },

  TriangleZY: {
    properties: {
      Coord: req("vector-3d"),
      Radius: req("float"),
      Height: opt("float"),
    },
    children: {},
  },

  ObjectZY: {
    properties: {
      Coord: req("vector-3d"),
      FixRight: opt("float"),
    },
    children: {},
  },

  // ===== Joint 系 =====
  Joint: {
    properties: {
      LinkCoord: opt("vector-3d"),
      LocalCoord: opt("vector-3d"),
      MaxAngle: opt("float"),
      MaxDeflection: opt("float"),
      JointToHeadLocal: opt("vector-3d"),
      ModelFileName: opt("filename"),
      ModelScale: opt("float"),
    },
    children: {},
  },

  Joint3D: {
    properties: {
      LinkCoord: opt("vector-3d"),
      LocalCoord: opt("vector-3d"),
      MaxAngle: opt("float"),
    },
    children: {},
  },

  JointZY: {
    properties: {
      LinkCoord: opt("vector-3d"),
      LocalCoord: opt("vector-3d"),
    },
    children: {},
  },

  JointZYX: {
    properties: {
      LinkCoord: opt("vector-3d"),
      LocalCoord: opt("vector-3d"),
      AttachX: opt("float"),
    },
    children: {},
  },

  // ===== Crank / Piston =====
  CrankZY: {
    properties: {
      Coord: req("vector-3d"),
      RotationAxis: opt("vector-3d"),
      Radius: opt("float"),
      InitialPhase: opt("float"),
    },
    children: {},
  },

  PistonZY: {
    properties: {
      Coord: req("vector-3d"),
      FixAxis: opt("vector-3d"),
      FixPosition: opt("vector-3d"),
    },
    children: {},
  },

  // ===== Animation / Motion =====
  Slide: {
    properties: {
      Direction: opt("vector-3d"),
      Distance: opt("float"),
    },
    children: {},
  },

  Tilt: {
    properties: {
      TiltRatio: opt("float"),
      TiltSpeed: opt("float"),
    },
    children: {},
  },

  Windmill: {
    properties: {
      RotationAxis: opt("vector-3d"),
      RotationSpeed: opt("float"),
      RevolutionPeriod: opt("float"),
      Symmetric: opt("integer"),
    },
    children: {},
  },

  TrackWind: {
    properties: {
      RotationAxis: opt("vector-3d"),
    },
    children: {},
  },

  // ===== Skin2.txt 追加 =====
  PopupMenu: {
    properties: {
      MouseDownWaveFileName: opt("filename"),
      MouseUpWaveFileName: opt("filename"),
    },
    children: {},
  },

  ListView: {
    properties: {},
    children: {},
  },

  EditCtrl: {
    properties: {
      ErrorWaveFileName: opt("filename"),
    },
    children: {},
  },

  PluginTree: {
    properties: {},
    children: {},
  },

  SoundEffect: {
    properties: {
      ScreenShotWaveFileName: opt("filename"),
      VideoStartWaveFileName: opt("filename"),
      VideoStopWaveFileName: opt("filename"),
    },
    children: {},
  },

  // ===== Pier2.txt 追加 =====
  Base: {
    properties: {
      ModelFileName: opt("filename"),
      ModelScale: opt("float"),
    },
    children: {},
  },

  Head: {
    properties: {
      ModelFileName: opt("filename"),
      ModelScale: opt("float"),
    },
    children: {},
  },

  // ===== Link / PrimaryAssembly =====
  Link: {
    properties: {
      DirLink: opt("vector-3d"),
      UpLink: opt("vector-3d"),
    },
    children: {},
  },

  PrimaryAssembly: {
    properties: {},
    children: {},
  },
};

// ---------------------------------------------------------------------------
// File schemas — ファイルごとのルートオブジェクト定義
// ---------------------------------------------------------------------------

export const fileSchemas: FileSchema = {
  "Rail2.txt": [
    { name: "PluginHeader", required: true, multiple: false },
    { name: "RailInfo", required: true, multiple: false },
    { name: "SoundInfo", required: true, multiple: false },
    { name: "Profile", required: false, multiple: true },
    { name: "Wireframe", required: false, multiple: true },
    { name: "Interval", required: false, multiple: true },
  ],
  "Tie2.txt": [
    { name: "PluginHeader", required: true, multiple: false },
    { name: "TieInfo", required: true, multiple: false },
  ],
  "Girder2.txt": [
    { name: "PluginHeader", required: true, multiple: false },
    { name: "GirderInfo", required: true, multiple: false },
  ],
  "Pier2.txt": [
    { name: "PluginHeader", required: true, multiple: false },
    { name: "PierInfo", required: true, multiple: false },
    { name: "Base", required: false, multiple: false },
    { name: "Head", required: false, multiple: false },
  ],
  "Line2.txt": [
    { name: "PluginHeader", required: true, multiple: false },
    { name: "LineInfo", required: true, multiple: false },
  ],
  "Pole2.txt": [
    { name: "PluginHeader", required: true, multiple: false },
    { name: "PoleInfo", required: true, multiple: false },
  ],
  "Train2.txt": [
    { name: "PluginHeader", required: true, multiple: false },
    { name: "TrainInfo", required: true, multiple: false },
  ],
  "Station2.txt": [
    { name: "PluginHeader", required: true, multiple: false },
    { name: "StationInfo", required: true, multiple: false },
  ],
  "Struct2.txt": [
    { name: "PluginHeader", required: true, multiple: false },
    { name: "StructInfo", required: true, multiple: false },
  ],
  "Surface2.txt": [
    { name: "PluginHeader", required: true, multiple: false },
    { name: "SurfaceInfo", required: true, multiple: false },
  ],
  "Env2.txt": [
    { name: "PluginHeader", required: true, multiple: false },
    { name: "EnvInfo", required: true, multiple: false },
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
    { name: "SoundEffect", required: false, multiple: false },
  ],
};

// ---------------------------------------------------------------------------
// Root dispatch
// ---------------------------------------------------------------------------

export function getFileSchema(fileName: string): RootObjectEntry[] | undefined {
  return fileSchemas[fileName];
}
