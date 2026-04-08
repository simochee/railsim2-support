import type { SemanticSchema, FileSchema, RootObjectEntry, PropertyType } from "./schemaTypes.js";

// ---------------------------------------------------------------------------
// Helper — 頻出パターンの短縮記法
// ---------------------------------------------------------------------------

const req = (
  type: PropertyType,
  opts?: Partial<{ multiple: boolean; arity: number; enumValues: string[] }>,
) => ({
  type,
  required: true as const,
  multiple: opts?.multiple ?? false,
  arity: opts?.arity,
  enumValues: opts?.enumValues,
});

const opt = (
  type: PropertyType,
  opts?: Partial<{ multiple: boolean; arity: number; enumValues: string[] }>,
) => ({
  type,
  required: false as const,
  multiple: opts?.multiple ?? false,
  arity: opts?.arity,
  enumValues: opts?.enumValues,
});

const child = (required: boolean, multiple: boolean, schemaKey?: string) =>
  ({ required, multiple, schemaKey }) as const;

// ---------------------------------------------------------------------------
// Semantic Schema — 全オブジェクト定義
// ---------------------------------------------------------------------------

export const semanticSchema: SemanticSchema = {
  // ===== 共通 =====
  PluginHeader: {
    properties: {
      RailSimVersion: req("expression"),
      PluginType: req("enum", {
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
      }),
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
      Height: opt("float"),
      SurfaceAlt: opt("float"),
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
    properties: {
      UseTexture: opt("yes-no"),
      TexFileName: opt("filename"),
      TexVPerMeter: opt("float"),
    },
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
      IgnoreCant: opt("yes-no"),
      Diffuse: opt("color"),
    },
    children: {},
  },

  Wireframe: {
    properties: {
      MinInterval: opt("float"),
      MaxInterval: opt("float"),
    },
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
      IgnoreCant: opt("yes-no"),
      Diffuse: opt("color"),
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
      Height: opt("float"),
      FlattenCant: opt("yes-no"),
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
      Height: opt("float"),
      TrackNum: opt("integer"),
      TrackInterval: opt("float"),
      FlattenCant: opt("yes-no"),
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
      Offset: opt("float"),
      TaperX: opt("float"),
      TaperY: opt("float"),
      TaperZ: opt("float"),
      TrackNum: opt("integer"),
      TrackInterval: opt("float"),
      Direction: opt("enum", { enumValues: ["up", "down"] }),
      Interval: opt("float"),
      BuildMinAlt: opt("float"),
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
      TrackNum: opt("integer"),
      TrackInterval: opt("float"),
    },
    children: {
      DefineSwitch: child(false, true),
      DefineAnimation: child(false, true),
    },
  },

  // ===== Train2.txt =====
  TrainInfo: {
    properties: {
      Gauge: opt("float"),
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
      TiltSpeed: opt("float"),
    },
    children: {
      Body: child(false, true),
      Sound: child(false, true),
      DefineSwitch: child(false, true),
      DefineAnimation: child(false, true),
    },
  },

  Body: {
    properties: {
      ModelFileName: opt("filename"),
      ModelScale: opt("float"),
      Turn: opt("yes-no"),
    },
    children: {
      Headlight: child(false, true),
      FrontCabin: child(false, false),
      TailCabin: child(false, false),
      Axle: child(false, true),
      Object3D: child(false, true),
      JointZY: child(false, true),
      Tilt: child(false, false),
    },
    nameParameter: "identifier",
  },

  Headlight: {
    properties: {
      Coord: opt("vector-3d"),
      SourceCoord: opt("vector-3d"),
      Direction: opt("vector-3d"),
      Color: opt("color"),
      AttachObject: opt("identifier"),
      MaxDistance: opt("float"),
    },
    children: {},
  },

  FrontCabin: {
    properties: {
      ModelFileName: opt("filename"),
      ModelScale: opt("float"),
    },
    children: {
      Joint3D: child(false, false),
    },
  },

  TailCabin: {
    properties: {
      ModelFileName: opt("filename"),
      ModelScale: opt("float"),
    },
    children: {
      Joint3D: child(false, false),
    },
  },

  Axle: {
    properties: {
      ModelFileName: opt("filename"),
      ModelScale: opt("float"),
      Coord: req("vector-2d"),
      Diameter: opt("float"),
      Symmetric: opt("integer"),
      WheelSound: opt("yes-no"),
    },
    children: {},
    nameParameter: "identifier",
  },

  Object3D: {
    properties: {
      ModelFileName: opt("filename"),
      ModelScale: opt("float"),
      AttachCoord: opt("vector-3d"),
      AttachDir: opt("vector-3d"),
      AttachUp: opt("vector-3d"),
      AnalogClock: opt("enum", { enumValues: ["Hour", "Minute", "Second"] }),
      Turn: opt("yes-no"),
      CastShadow: opt("yes-no"),
      // 材質カスタマイザ — 材質番号のみ
      NoCastShadow: opt("integer", { multiple: true }),
      AlphaZeroTest: opt("integer", { multiple: true }),
      NoReceiveShadow: opt("integer", { multiple: true }),
      NoShadow: opt("integer", { multiple: true }),
      Transparent: opt("integer", { multiple: true }),
      // 材質カスタマイザ — 材質番号 + 値 (混合型のため expression)
      ChangeTexture: opt("expression", { arity: 2, multiple: true }),
      ChangeAlpha: opt("expression", { arity: 2, multiple: true }),
      ChangeModel: opt("expression", { arity: 2, multiple: true }),
    },
    children: {
      StaticRotation: child(false, true),
      DynamicRotation: child(false, true),
      StaticMove: child(false, true),
      Joint3D: child(false, true),
      JointZY: child(false, true),
      ChangeMaterial: child(false, true),
      Slide: child(false, false),
      CrankZY: child(false, true),
      PistonZY: child(false, true),
      Windmill: child(false, false),
      TrackWind: child(false, false),
      Link: child(false, true),
    },
    nameParameter: "identifier",
  },

  StaticRotation: {
    properties: {
      RotationAxis: opt("vector-3d"),
      RotationAngle: opt("float"),
      PreAnimationDelay: opt("float"),
      AnimationTime: opt("float"),
      PreReverseDelay: opt("float"),
      ReverseTime: opt("float"),
      PostAnimationDelay: opt("float"),
      PostReverseDelay: opt("float"),
    },
    children: {},
  },

  DynamicRotation: {
    properties: {
      RotationAxis: opt("vector-3d"),
      RotationSpeed: opt("float"),
      Acceleration: opt("float"),
      Deceleration: opt("float"),
      PreAnimationDelay: opt("float"),
      AnimationTime: opt("float"),
      PreReverseDelay: opt("float"),
      ReverseTime: opt("float"),
      PostAnimationDelay: opt("float"),
      PostReverseDelay: opt("float"),
    },
    children: {},
  },

  StaticMove: {
    properties: {
      Direction: opt("vector-3d"),
      Distance: opt("float"),
      Displacement: opt("vector-3d"),
      PreAnimationDelay: opt("float"),
      AnimationTime: opt("float"),
      PreReverseDelay: opt("float"),
      ReverseTime: opt("float"),
      PostAnimationDelay: opt("float"),
      PostReverseDelay: opt("float"),
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
      SourceCoord: opt("vector-3d"),
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
      TrackNum: opt("integer"),
      TrackInterval: opt("float"),
      Stoppable: opt("yes-no"),
      OpenDoor: opt("yes-no", { arity: 2 }),
      RailPlugin: opt("filename"),
      TiePlugin: opt("filename"),
      GirderPlugin: opt("filename"),
      PierPlugin: opt("filename"),
      LinePlugin: opt("filename"),
      PolePlugin: opt("filename"),
      LiftRailSurface: opt("yes-no"),
      EnableCant: opt("yes-no"),
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
      EnvMap: opt("integer"),
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
      SkyColor: opt("color"),
      ShadowColor: opt("color"),
      SunAlt: opt("float"),
      Directional: opt("color"),
      NightThreshold: opt("float"),
    },
    children: {},
  },

  // ===== Skin2.txt 関連 =====
  ...Object.fromEntries(
    ["NormalCursor", "ResizeCursor1", "ResizeCursor2", "ResizeCursor3", "ResizeCursor4"].map(
      (name) => [
        name,
        {
          properties: {
            Cursor2DSize: opt("vector-2d"),
            Cursor2DHotSpot: opt("vector-2d"),
            Cursor2DAnimNumber: opt("integer"),
            Cursor2DAnimFrame: opt("integer", { arity: 4, multiple: true }),
            TexFileName: opt("filename"),
          },
          children: {},
        },
      ],
    ),
  ),

  Interface: {
    properties: {
      FontName: opt("string"),
      ImageSize: opt("vector-2d"),
      TexFileName: opt("filename"),
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
      UseWallpaper: opt("yes-no"),
      ImageSize: opt("vector-2d"),
      BackgroundColor: opt("color"),
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
      IgnoreCant: opt("yes-no"),
      Diffuse: opt("color"),
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
      VelocityRel: opt("float"),
      AccelerationRel: opt("float"),
      DecelerationRel: opt("float"),
      BlendMode: opt("enum", { enumValues: ["Alpha", "Add"] }),
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
      Inclination: opt("float"),
    },
    children: {},
  },

  // Model / ChangeMaterial / etc.
  Model: {
    properties: {
      ModelFileName: opt("filename"),
      ModelScale: opt("float"),
      ChangeModel: opt("expression", { arity: 2 }),
      ArrowModelFileName: opt("filename"),
      ArrowModelScale: opt("float"),
      LinkModelFileName: opt("filename"),
      LinkModelScale: opt("float"),
      SegmentModelFileName: opt("filename"),
      SegmentModelScale: opt("float"),
      CompassModelFileName: opt("filename"),
      CompassModelScale: opt("float"),
      WindDirModelFileName: opt("filename"),
      WindDirModelScale: opt("float"),
    },
    children: {},
  },

  ChangeMaterial: {
    properties: {
      MaterialID: opt("integer"),
      Diffuse: opt("float", { arity: 4 }),
      Ambient: opt("float", { arity: 3 }),
      Specular: opt("float", { arity: 3 }),
      Emissive: opt("float", { arity: 3 }),
      Power: opt("float"),
    },
    children: {},
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
      FixPosition: opt("float"),
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
      AttachCoord: opt("vector-3d"),
      LocalCoord: opt("vector-3d"),
      AttachDir: opt("vector-3d"),
      DirLink: opt("identifier"),
      AttachUp: opt("vector-3d"),
      UpLink: opt("identifier"),
      LinkCoord: opt("vector-3d"),
      MaxAngle: opt("float"),
    },
    children: {},
    nameParameter: "identifier",
  },

  JointZY: {
    properties: {
      AttachCoord: opt("vector-2d"),
      LocalCoord: opt("vector-2d"),
      LinkCoord: opt("vector-2d"),
    },
    children: {},
    nameParameter: "identifier",
  },

  JointZYX: {
    properties: {
      AttachCoord: opt("vector-2d"),
      LocalCoord: opt("vector-2d"),
      LinkCoord: opt("vector-2d"),
      AttachX: opt("float"),
    },
    children: {},
    nameParameter: "identifier",
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
      Direction: opt("vector-3d"),
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
      MaxAngle: opt("float"),
      BaseAlt: opt("float"),
    },
    children: {},
  },

  Windmill: {
    properties: {
      RotationAxis: opt("vector-3d"),
      RotationSpeed: opt("float"),
      RevolutionPeriod: opt("float"),
      Symmetric: opt("integer"),
      Directional: opt("yes-no"),
    },
    children: {},
  },

  TrackWind: {
    properties: {
      TrackSpeed: opt("float"),
      FixAxis: opt("vector-3d"),
      RotationAxis: opt("vector-3d"),
    },
    children: {},
  },

  // ===== Skin2.txt 追加 =====
  PopupMenu: {
    properties: {
      DefaultFontColor: opt("color"),
      DisabledFontColor: opt("color"),
      DisabledShadowColor: opt("color"),
      SelectedBaseColor: opt("color"),
      SelectedFontColor: opt("color"),
      MouseDownWaveFileName: opt("filename"),
      MouseUpWaveFileName: opt("filename"),
    },
    children: {},
  },

  ListView: {
    properties: {
      DefaultBaseColorOdd: opt("color"),
      DefaultBaseColorEven: opt("color"),
      DefaultFontColor: opt("color"),
      SelectedBaseColor: opt("color"),
      SelectedFontColor: opt("color"),
      FocusFrameColor: opt("color"),
    },
    children: {},
  },

  EditCtrl: {
    properties: {
      DefaultFontColor: opt("color"),
      EditBaseColor: opt("color"),
      EditFontColor: opt("color"),
      ConvertFontColor: opt("color"),
      ConvertClauseColor: opt("color"),
      SelectedBaseColor: opt("color"),
      ErrorWaveFileName: opt("filename"),
    },
    children: {},
  },

  PluginTree: {
    properties: {
      DefaultBaseColor: opt("color"),
      DefaultFontColor: opt("color"),
      SelectedBaseColor: opt("color"),
      SelectedFontColor: opt("color"),
      FocusFrameColor: opt("color"),
    },
    children: {},
  },

  SoundEffect: {
    properties: {
      MouseDownWaveFileName: opt("filename"),
      MouseUpWaveFileName: opt("filename"),
      ErrorWaveFileName: opt("filename"),
      ScreenShotWaveFileName: opt("filename"),
      VideoStartWaveFileName: opt("filename"),
      VideoStopWaveFileName: opt("filename"),
    },
    children: {},
  },

  // Train2.txt 用 SoundEffect (Sound と同等プロパティ)
  "SoundEffect:Train": {
    properties: {
      WaveFileName: req("filename"),
      Volume: opt("float"),
      Loop: opt("yes-no"),
      VelocityRel: opt("yes-no"),
      AccelerationRel: opt("yes-no"),
      DecelerationRel: opt("yes-no"),
      AttachObject: opt("identifier"),
      SourceCoord: opt("vector-3d"),
    },
    children: {},
  },

  // ===== Pier2.txt 追加 =====
  Base: {
    properties: {
      ModelFileName: opt("filename"),
      ModelScale: opt("float"),
      BaseToPierLocal: opt("vector-3d"),
    },
    children: {},
  },

  Head: {
    properties: {
      ModelFileName: opt("filename"),
      ModelScale: opt("float"),
      HeadToPierLocal: opt("vector-3d"),
    },
    children: {},
  },

  // ===== Link / PrimaryAssembly =====
  Link: {
    properties: {
      DirLink: opt("vector-3d"),
      UpLink: opt("vector-3d"),
      LinkCoord: opt("vector-3d"),
    },
    children: {},
    nameParameter: "identifier",
  },

  PrimaryAssembly: {
    properties: {},
    children: {
      Axle: child(false, true),
      Body: child(false, true),
      Object3D: child(false, true),
      ObjectZY: child(false, true),
      FrontCabin: child(false, false),
      TailCabin: child(false, false),
      Headlight: child(false, true),
      Sound: child(false, true),
      SoundEffect: child(false, true, "SoundEffect:Train"),
      Particle: child(false, true),
      LensFlare: child(false, true),
      DefineSwitch: child(false, true),
      DefineAnimation: child(false, true),
    },
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
    { name: "DefineSwitch", required: false, multiple: true },
    { name: "PrimaryAssembly", required: false, multiple: false },
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
