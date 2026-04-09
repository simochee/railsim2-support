/**
 * Auto-generated semantic schema.
 * DO NOT EDIT — regenerate with: pnpm generate
 */
import type { SemanticSchema, FileSchema, RootObjectEntry } from "./schemaTypes.js";

export const semanticSchema: SemanticSchema = {
  EnvInfo: {
    properties: {
      Latitude: {
        type: "float",
        required: true,
        multiple: false
      },
      EnvMapTexFileName: {
        type: "filename",
        required: true,
        multiple: false
      }
    },
    children: {
    },
  },
  Landscape: {
    properties: {
      ModelFileName: {
        type: "filename",
        required: true,
        multiple: false
      },
      ModelScale: {
        type: "float",
        required: false,
        multiple: false
      }
    },
    children: {
    },
  },
  "Circle:LensFlare": {
    properties: {
      Distance: {
        type: "float",
        required: true,
        multiple: false
      },
      Radius: {
        type: "float",
        required: true,
        multiple: false
      },
      InnerColor: {
        type: "color",
        required: true,
        multiple: false
      },
      OuterColor: {
        type: "color",
        required: true,
        multiple: false
      }
    },
    children: {
    },
  },
  "Hexagon:LensFlare": {
    properties: {
      Distance: {
        type: "float",
        required: true,
        multiple: false
      },
      Radius: {
        type: "float",
        required: true,
        multiple: false
      },
      InnerColor: {
        type: "color",
        required: true,
        multiple: false
      },
      OuterColor: {
        type: "color",
        required: true,
        multiple: false
      }
    },
    children: {
    },
  },
  Texture: {
    properties: {
      Distance: {
        type: "float",
        required: true,
        multiple: false
      },
      Radius: {
        type: "float",
        required: true,
        multiple: false
      },
      TexFileName: {
        type: "filename",
        required: true,
        multiple: false
      },
      Color: {
        type: "color",
        required: false,
        multiple: false
      }
    },
    children: {
    },
  },
  LensFlare: {
    properties: {
      StartAngle: {
        type: "float",
        required: true,
        multiple: false
      },
      Twinkle: {
        type: "float",
        required: false,
        multiple: false
      },
      Inclination: {
        type: "float",
        required: false,
        multiple: false
      }
    },
    children: {
      Circle: {
        required: false,
        multiple: false,
        schemaKey: "Circle:LensFlare"
      },
      Hexagon: {
        required: false,
        multiple: false,
        schemaKey: "Hexagon:LensFlare"
      },
      Texture: {
        required: true,
        multiple: false
      }
    },
  },
  Whiteout: {
    properties: {
      StartAngle: {
        type: "float",
        required: true,
        multiple: false
      },
      Color: {
        type: "color",
        required: true,
        multiple: false
      }
    },
    children: {
    },
  },
  Set: {
    properties: {
      SunAlt: {
        type: "float",
        required: true,
        multiple: false
      },
      Directional: {
        type: "color",
        required: true,
        multiple: false
      },
      Ambient: {
        type: "color",
        required: true,
        multiple: false
      },
      SkyColor: {
        type: "color",
        required: true,
        multiple: false
      }
    },
    children: {
    },
  },
  Lighting: {
    properties: {
      NightThreshold: {
        type: "float",
        required: true,
        multiple: false
      },
      ShadowColor: {
        type: "color",
        required: true,
        multiple: false
      }
    },
    children: {
      Set: {
        required: true,
        multiple: false
      }
    },
  },
  Sun: {
    properties: {
      ModelFileName: {
        type: "filename",
        required: true,
        multiple: false
      },
      ModelScale: {
        type: "float",
        required: false,
        multiple: false
      },
      AxialInclination: {
        type: "float",
        required: true,
        multiple: false
      }
    },
    children: {
      LensFlare: {
        required: true,
        multiple: false
      },
      Whiteout: {
        required: true,
        multiple: false
      },
      Lighting: {
        required: true,
        multiple: false
      }
    },
  },
  Moon: {
    properties: {
      ModelFileName: {
        type: "filename",
        required: true,
        multiple: false
      },
      ModelScale: {
        type: "float",
        required: false,
        multiple: false
      },
      AxialInclination: {
        type: "float",
        required: true,
        multiple: false
      },
      RevolutionPeriod: {
        type: "float",
        required: true,
        multiple: false
      },
      InitialPhase: {
        type: "float",
        required: true,
        multiple: false
      }
    },
    children: {
    },
  },
  Material: {
    properties: {
      UseTexture: {
        type: "yes-no",
        required: true,
        multiple: false
      },
      TexFileName: {
        type: "filename",
        required: false,
        multiple: false
      },
      TexVPerMeter: {
        type: "float",
        required: false,
        multiple: false
      }
    },
    children: {
    },
  },
  Vertex: {
    properties: {
      IgnoreCant: {
        type: "yes-no",
        required: false,
        multiple: false
      },
      Coord: {
        type: "vector-3d",
        required: true,
        multiple: false
      },
      Diffuse: {
        type: "color",
        required: false,
        multiple: false
      }
    },
    children: {
    },
  },
  Face: {
    properties: {
    },
    children: {
      Vertex: {
        required: true,
        multiple: false
      }
    },
  },
  Profile: {
    properties: {
    },
    children: {
      Material: {
        required: true,
        multiple: false
      },
      Face: {
        required: true,
        multiple: false
      }
    },
  },
  Line: {
    properties: {
    },
    children: {
      Vertex: {
        required: true,
        multiple: false
      }
    },
  },
  Wireframe: {
    properties: {
      MinInterval: {
        type: "float",
        required: false,
        multiple: false
      },
      MaxInterval: {
        type: "float",
        required: false,
        multiple: false
      }
    },
    children: {
      Line: {
        required: true,
        multiple: false
      }
    },
  },
  Interval: {
    properties: {
      IgnoreCant: {
        type: "yes-no",
        required: false,
        multiple: false
      },
      ModelFileName: {
        type: "filename",
        required: true,
        multiple: false
      },
      ModelScale: {
        type: "float",
        required: false,
        multiple: false
      },
      Interval: {
        type: "float",
        required: true,
        multiple: false
      },
      Offset: {
        type: "float",
        required: false,
        multiple: false
      }
    },
    children: {
    },
  },
  GirderInfo: {
    properties: {
      Height: {
        type: "float",
        required: true,
        multiple: false
      },
      TrackNum: {
        type: "integer",
        required: false,
        multiple: false
      },
      TrackInterval: {
        type: "float",
        required: false,
        multiple: false
      },
      FlattenCant: {
        type: "yes-no",
        required: false,
        multiple: false
      }
    },
    children: {
      Profile: {
        required: true,
        multiple: false
      },
      Wireframe: {
        required: true,
        multiple: false
      },
      Interval: {
        required: true,
        multiple: false
      }
    },
  },
  LineInfo: {
    properties: {
      TrolleyAlt: {
        type: "float",
        required: true,
        multiple: false
      },
      Height: {
        type: "float",
        required: true,
        multiple: false
      },
      MaxInterval: {
        type: "float",
        required: true,
        multiple: false
      },
      Offset: {
        type: "float",
        required: false,
        multiple: false
      },
      MaxDeflection: {
        type: "float",
        required: true,
        multiple: false
      }
    },
    children: {
      Profile: {
        required: true,
        multiple: false
      },
      Wireframe: {
        required: true,
        multiple: false
      },
      Interval: {
        required: true,
        multiple: false
      }
    },
  },
  PierInfo: {
    properties: {
      TrackNum: {
        type: "integer",
        required: false,
        multiple: false
      },
      TrackInterval: {
        type: "float",
        required: false,
        multiple: false
      },
      Direction: {
        type: "enum",
        required: false,
        multiple: false,
        enumValues: ["Up", "Down"]
      },
      Interval: {
        type: "float",
        required: true,
        multiple: false
      },
      Offset: {
        type: "float",
        required: false,
        multiple: false
      },
      BuildMinAlt: {
        type: "float",
        required: true,
        multiple: false
      },
      TaperX: {
        type: "float",
        required: false,
        multiple: false
      },
      TaperY: {
        type: "float",
        required: false,
        multiple: false
      },
      TaperZ: {
        type: "float",
        required: false,
        multiple: false
      }
    },
    children: {
    },
  },
  Joint: {
    properties: {
      ModelFileName: {
        type: "filename",
        required: true,
        multiple: false
      },
      ModelScale: {
        type: "float",
        required: false,
        multiple: false
      },
      JointToHeadLocal: {
        type: "vector-3d",
        required: true,
        multiple: false
      }
    },
    children: {
    },
  },
  Head: {
    properties: {
      ModelFileName: {
        type: "filename",
        required: true,
        multiple: false
      },
      ModelScale: {
        type: "float",
        required: false,
        multiple: false
      },
      HeadToPierLocal: {
        type: "vector-3d",
        required: true,
        multiple: false
      }
    },
    children: {
    },
  },
  Base: {
    properties: {
      ModelFileName: {
        type: "filename",
        required: true,
        multiple: false
      },
      ModelScale: {
        type: "float",
        required: false,
        multiple: false
      },
      BaseToPierLocal: {
        type: "vector-3d",
        required: true,
        multiple: false
      }
    },
    children: {
    },
  },
  PoleInfo: {
    properties: {
      TrackNum: {
        type: "integer",
        required: false,
        multiple: false
      },
      TrackInterval: {
        type: "float",
        required: false,
        multiple: false
      }
    },
    children: {
    },
  },
  Model: {
    properties: {
      ArrowModelFileName: {
        type: "filename",
        required: true,
        multiple: false
      },
      ArrowModelScale: {
        type: "float",
        required: true,
        multiple: false
      },
      LinkModelFileName: {
        type: "filename",
        required: true,
        multiple: false
      },
      LinkModelScale: {
        type: "float",
        required: true,
        multiple: false
      },
      SegmentModelFileName: {
        type: "filename",
        required: true,
        multiple: false
      },
      SegmentModelScale: {
        type: "float",
        required: true,
        multiple: false
      },
      CompassModelFileName: {
        type: "filename",
        required: true,
        multiple: false,
        arity: 2
      },
      CompassModelScale: {
        type: "vector-2d",
        required: true,
        multiple: false
      },
      WindDirModelFileName: {
        type: "filename",
        required: true,
        multiple: false
      },
      WindDirModelScale: {
        type: "float",
        required: true,
        multiple: false
      }
    },
    children: {
    },
  },
  RailInfo: {
    properties: {
      Gauge: {
        type: "float",
        required: true,
        multiple: false
      },
      Height: {
        type: "float",
        required: true,
        multiple: false
      },
      SurfaceAlt: {
        type: "float",
        required: true,
        multiple: false
      },
      CantRatio: {
        type: "float",
        required: true,
        multiple: false
      },
      MaxCant: {
        type: "float",
        required: true,
        multiple: false
      },
      FlattenCant: {
        type: "yes-no",
        required: false,
        multiple: false
      }
    },
    children: {
    },
  },
  SoundInfo: {
    properties: {
      WheelSoundFile: {
        type: "filename",
        required: true,
        multiple: false
      },
      JointInterval: {
        type: "float",
        required: true,
        multiple: false
      }
    },
    children: {
    },
  },
  NormalCursor: {
    properties: {
      TexFileName: {
        type: "filename",
        required: true,
        multiple: false
      },
      ImageSize: {
        type: "integer",
        required: true,
        multiple: false,
        arity: 2
      },
      Cursor2DSize: {
        type: "integer",
        required: false,
        multiple: false,
        arity: 2
      },
      Cursor2DHotSpot: {
        type: "integer",
        required: true,
        multiple: false,
        arity: 2
      },
      Cursor2DAnimNumber: {
        type: "integer",
        required: false,
        multiple: false
      },
      Cursor2DAnimFrame: {
        type: "integer",
        required: false,
        multiple: true,
        arity: 2
      }
    },
    children: {
    },
  },
  ResizeCursor1: {
    properties: {
      TexFileName: {
        type: "filename",
        required: true,
        multiple: false
      },
      ImageSize: {
        type: "integer",
        required: true,
        multiple: false,
        arity: 2
      },
      Cursor2DSize: {
        type: "integer",
        required: false,
        multiple: false,
        arity: 2
      },
      Cursor2DHotSpot: {
        type: "integer",
        required: true,
        multiple: false,
        arity: 2
      },
      Cursor2DAnimNumber: {
        type: "integer",
        required: false,
        multiple: false
      },
      Cursor2DAnimFrame: {
        type: "integer",
        required: false,
        multiple: true,
        arity: 2
      }
    },
    children: {
    },
  },
  ResizeCursor2: {
    properties: {
      TexFileName: {
        type: "filename",
        required: true,
        multiple: false
      },
      ImageSize: {
        type: "integer",
        required: true,
        multiple: false,
        arity: 2
      },
      Cursor2DSize: {
        type: "integer",
        required: false,
        multiple: false,
        arity: 2
      },
      Cursor2DHotSpot: {
        type: "integer",
        required: true,
        multiple: false,
        arity: 2
      },
      Cursor2DAnimNumber: {
        type: "integer",
        required: false,
        multiple: false
      },
      Cursor2DAnimFrame: {
        type: "integer",
        required: false,
        multiple: true,
        arity: 2
      }
    },
    children: {
    },
  },
  ResizeCursor3: {
    properties: {
      TexFileName: {
        type: "filename",
        required: true,
        multiple: false
      },
      ImageSize: {
        type: "integer",
        required: true,
        multiple: false,
        arity: 2
      },
      Cursor2DSize: {
        type: "integer",
        required: false,
        multiple: false,
        arity: 2
      },
      Cursor2DHotSpot: {
        type: "integer",
        required: true,
        multiple: false,
        arity: 2
      },
      Cursor2DAnimNumber: {
        type: "integer",
        required: false,
        multiple: false
      },
      Cursor2DAnimFrame: {
        type: "integer",
        required: false,
        multiple: true,
        arity: 2
      }
    },
    children: {
    },
  },
  ResizeCursor4: {
    properties: {
      TexFileName: {
        type: "filename",
        required: true,
        multiple: false
      },
      ImageSize: {
        type: "integer",
        required: true,
        multiple: false,
        arity: 2
      },
      Cursor2DSize: {
        type: "integer",
        required: false,
        multiple: false,
        arity: 2
      },
      Cursor2DHotSpot: {
        type: "integer",
        required: true,
        multiple: false,
        arity: 2
      },
      Cursor2DAnimNumber: {
        type: "integer",
        required: false,
        multiple: false
      },
      Cursor2DAnimFrame: {
        type: "integer",
        required: false,
        multiple: true,
        arity: 2
      }
    },
    children: {
    },
  },
  Interface: {
    properties: {
      TexFileName: {
        type: "filename",
        required: true,
        multiple: false
      },
      FontName: {
        type: "string",
        required: true,
        multiple: false
      },
      TitleBarFontColor: {
        type: "color",
        required: true,
        multiple: false
      },
      ButtonFontColor: {
        type: "color",
        required: true,
        multiple: false
      },
      StaticFontColor: {
        type: "color",
        required: true,
        multiple: false
      },
      FocusFrameColor: {
        type: "color",
        required: true,
        multiple: false
      }
    },
    children: {
    },
  },
  Background: {
    properties: {
      UseWallpaper: {
        type: "yes-no",
        required: true,
        multiple: false
      },
      TexFileName: {
        type: "filename",
        required: false,
        multiple: false
      },
      ImageSize: {
        type: "integer",
        required: false,
        multiple: false,
        arity: 2
      },
      BackgroundColor: {
        type: "color",
        required: false,
        multiple: false
      }
    },
    children: {
    },
  },
  Frame: {
    properties: {
      FrameTexFileName: {
        type: "filename",
        required: true,
        multiple: false
      },
      IconTexFileName: {
        type: "filename",
        required: true,
        multiple: false,
        arity: 6
      },
      LabelFontColor: {
        type: "color",
        required: true,
        multiple: false
      },
      InfoFontColor: {
        type: "color",
        required: true,
        multiple: false
      },
      FloatFontColor: {
        type: "color",
        required: true,
        multiple: false
      }
    },
    children: {
    },
  },
  EditCtrl: {
    properties: {
      DefaultFontColor: {
        type: "color",
        required: true,
        multiple: false
      },
      EditBaseColor: {
        type: "color",
        required: true,
        multiple: false,
        arity: 4
      },
      EditFontColor: {
        type: "color",
        required: true,
        multiple: false
      },
      ConvertFontColor: {
        type: "color",
        required: true,
        multiple: false
      },
      ConvertClauseColor: {
        type: "color",
        required: true,
        multiple: false,
        arity: 2
      },
      SelectedBaseColor: {
        type: "color",
        required: true,
        multiple: false,
        arity: 4
      }
    },
    children: {
    },
  },
  ListView: {
    properties: {
      DefaultBaseColorOdd: {
        type: "color",
        required: true,
        multiple: false,
        arity: 4
      },
      DefaultBaseColorEven: {
        type: "color",
        required: true,
        multiple: false,
        arity: 4
      },
      DefaultFontColor: {
        type: "color",
        required: true,
        multiple: false
      },
      SelectedBaseColor: {
        type: "color",
        required: true,
        multiple: false,
        arity: 4
      },
      SelectedFontColor: {
        type: "color",
        required: true,
        multiple: false
      },
      FocusFrameColor: {
        type: "color",
        required: true,
        multiple: false
      }
    },
    children: {
    },
  },
  PluginTree: {
    properties: {
      DefaultBaseColor: {
        type: "color",
        required: true,
        multiple: false,
        arity: 4
      },
      DefaultFontColor: {
        type: "color",
        required: true,
        multiple: false
      },
      SelectedBaseColor: {
        type: "color",
        required: true,
        multiple: false,
        arity: 4
      },
      SelectedFontColor: {
        type: "color",
        required: true,
        multiple: false
      },
      FocusFrameColor: {
        type: "color",
        required: true,
        multiple: false
      }
    },
    children: {
    },
  },
  PopupMenu: {
    properties: {
      DefaultFontColor: {
        type: "color",
        required: true,
        multiple: false
      },
      DisabledFontColor: {
        type: "color",
        required: true,
        multiple: false
      },
      DisabledShadowColor: {
        type: "color",
        required: true,
        multiple: false
      },
      SelectedBaseColor: {
        type: "color",
        required: true,
        multiple: false,
        arity: 4
      },
      SelectedFontColor: {
        type: "color",
        required: true,
        multiple: false
      }
    },
    children: {
    },
  },
  Sound: {
    properties: {
      MouseDownWaveFileName: {
        type: "filename",
        required: true,
        multiple: false
      },
      MouseUpWaveFileName: {
        type: "filename",
        required: true,
        multiple: false
      },
      ErrorWaveFileName: {
        type: "filename",
        required: true,
        multiple: false
      },
      ScreenShotWaveFileName: {
        type: "filename",
        required: true,
        multiple: false
      },
      VideoStartWaveFileName: {
        type: "filename",
        required: true,
        multiple: false
      },
      VideoStopWaveFileName: {
        type: "filename",
        required: true,
        multiple: false
      }
    },
    children: {
    },
  },
  StationInfo: {
    properties: {
    },
    children: {
    },
  },
  Platform: {
    properties: {
      TrackNum: {
        type: "integer",
        required: false,
        multiple: false
      },
      TrackInterval: {
        type: "float",
        required: false,
        multiple: false
      },
      Stoppable: {
        type: "yes-no",
        required: false,
        multiple: false
      },
      OpenDoor: {
        type: "yes-no",
        required: false,
        multiple: false,
        arity: 2
      },
      RailPlugin: {
        type: "string",
        required: false,
        multiple: false
      },
      TiePlugin: {
        type: "string",
        required: false,
        multiple: false
      },
      GirderPlugin: {
        type: "string",
        required: false,
        multiple: false
      },
      PierPlugin: {
        type: "string",
        required: false,
        multiple: false
      },
      LinePlugin: {
        type: "string",
        required: false,
        multiple: false
      },
      PolePlugin: {
        type: "string",
        required: false,
        multiple: false
      },
      LiftRailSurface: {
        type: "yes-no",
        required: false,
        multiple: false
      },
      EnableCant: {
        type: "yes-no",
        required: false,
        multiple: false
      },
      ParentObject: {
        type: "string",
        required: false,
        multiple: false
      },
      Coord: {
        type: "vector-3d",
        required: true,
        multiple: true
      }
    },
    children: {
    },
  },
  DefineSwitch: {
    properties: {
      GroupCommon: {
        type: "string",
        required: false,
        multiple: false
      },
      Entry: {
        type: "string",
        required: true,
        multiple: true
      }
    },
    children: {
    },
    nameParameter: "string",
  },
  DefineAnimation: {
    properties: {
      Frame: {
        type: "expression",
        required: true,
        multiple: false,
        arity: 2
      },
      NumberedFrame: {
        type: "expression",
        required: true,
        multiple: false,
        arity: 4
      },
      SlideUVFrame: {
        type: "expression",
        required: true,
        multiple: false,
        arity: 7
      },
      TiledUVFrame: {
        type: "expression",
        required: true,
        multiple: false,
        arity: 7
      },
      RotationUVFrame: {
        type: "expression",
        required: true,
        multiple: false,
        arity: 7
      }
    },
    children: {
    },
    nameParameter: "string",
  },
  StaticRotation: {
    properties: {
      RotationAxis: {
        type: "vector-3d",
        required: false,
        multiple: false
      },
      RotationAngle: {
        type: "float",
        required: true,
        multiple: false
      },
      PreAnimationDelay: {
        type: "float",
        required: false,
        multiple: false
      },
      AnimationTime: {
        type: "float",
        required: false,
        multiple: false
      },
      PostAnimationDelay: {
        type: "float",
        required: false,
        multiple: false
      },
      PreReverseDelay: {
        type: "float",
        required: false,
        multiple: false
      },
      ReverseTime: {
        type: "float",
        required: false,
        multiple: false
      },
      PostReverseDelay: {
        type: "float",
        required: false,
        multiple: false
      }
    },
    children: {
    },
  },
  StaticMove: {
    properties: {
      Displacement: {
        type: "vector-3d",
        required: true,
        multiple: false
      },
      PreAnimationDelay: {
        type: "float",
        required: false,
        multiple: false
      },
      AnimationTime: {
        type: "float",
        required: false,
        multiple: false
      },
      PostAnimationDelay: {
        type: "float",
        required: false,
        multiple: false
      },
      PreReverseDelay: {
        type: "float",
        required: false,
        multiple: false
      },
      ReverseTime: {
        type: "float",
        required: false,
        multiple: false
      },
      PostReverseDelay: {
        type: "float",
        required: false,
        multiple: false
      }
    },
    children: {
    },
  },
  DynamicRotation: {
    properties: {
      RotationAxis: {
        type: "vector-3d",
        required: false,
        multiple: false
      },
      RotationSpeed: {
        type: "float",
        required: true,
        multiple: false
      },
      Acceleration: {
        type: "float",
        required: false,
        multiple: false
      },
      Deceleration: {
        type: "float",
        required: false,
        multiple: false
      }
    },
    children: {
    },
  },
  TrackWind: {
    properties: {
      TrackSpeed: {
        type: "float",
        required: true,
        multiple: false
      },
      FixAxis: {
        type: "vector-3d",
        required: true,
        multiple: false
      }
    },
    children: {
    },
  },
  Windmill: {
    properties: {
      Directional: {
        type: "yes-no",
        required: false,
        multiple: false
      },
      RotationAxis: {
        type: "vector-3d",
        required: false,
        multiple: false
      },
      RotationSpeed: {
        type: "float",
        required: true,
        multiple: false
      },
      Symmetric: {
        type: "integer",
        required: true,
        multiple: false
      }
    },
    children: {
    },
  },
  ChangeMaterial: {
    properties: {
      MaterialID: {
        type: "integer",
        required: true,
        multiple: true,
        arity: 2
      },
      Diffuse: {
        type: "expression",
        required: false,
        multiple: false,
        arity: 4
      },
      Ambient: {
        type: "vector-3d",
        required: false,
        multiple: false
      },
      Specular: {
        type: "vector-3d",
        required: false,
        multiple: false
      },
      Emissive: {
        type: "vector-3d",
        required: false,
        multiple: false
      },
      Power: {
        type: "float",
        required: false,
        multiple: false
      }
    },
    children: {
    },
  },
  ApplySwitch: {
    properties: {
    },
    children: {
    },
    nameParameter: "expression",
  },
  If: {
    properties: {
      ConnectRail: {
        type: "integer",
        required: true,
        multiple: false,
        arity: 2
      },
      BranchRail: {
        type: "integer",
        required: true,
        multiple: false,
        arity: 2
      },
      DisconnectRail: {
        type: "integer",
        required: true,
        multiple: false
      }
    },
    children: {
      Headlight: {
        required: true,
        multiple: false
      },
      Particle: {
        required: true,
        multiple: false
      },
      SoundEffect: {
        required: true,
        multiple: false
      },
      ApplySwitch: {
        required: true,
        multiple: false
      },
      If: {
        required: true,
        multiple: false
      },
      Else: {
        required: false,
        multiple: false
      }
    },
    nameParameter: "expression",
  },
  Else: {
    properties: {
      ConnectRail: {
        type: "integer",
        required: true,
        multiple: false,
        arity: 2
      },
      BranchRail: {
        type: "integer",
        required: true,
        multiple: false,
        arity: 2
      },
      DisconnectRail: {
        type: "integer",
        required: true,
        multiple: false
      }
    },
    children: {
      Headlight: {
        required: true,
        multiple: false
      },
      Particle: {
        required: true,
        multiple: false
      },
      SoundEffect: {
        required: true,
        multiple: false
      },
      ApplySwitch: {
        required: true,
        multiple: false
      },
      If: {
        required: true,
        multiple: false
      },
      Else: {
        required: false,
        multiple: false
      }
    },
  },
  Joint3D: {
    properties: {
      AttachCoord: {
        type: "vector-3d",
        required: true,
        multiple: false
      },
      LocalCoord: {
        type: "vector-3d",
        required: true,
        multiple: false
      },
      DirLink: {
        type: "string",
        required: false,
        multiple: false
      },
      AttachDir: {
        type: "vector-3d",
        required: false,
        multiple: false
      },
      UpLink: {
        type: "string",
        required: false,
        multiple: false
      },
      AttachUp: {
        type: "vector-3d",
        required: false,
        multiple: false
      }
    },
    children: {
    },
    nameParameter: "string",
  },
  Object3D: {
    properties: {
      ModelFileName: {
        type: "filename",
        required: true,
        multiple: false
      },
      ModelScale: {
        type: "float",
        required: false,
        multiple: false
      },
      Turn: {
        type: "yes-no",
        required: false,
        multiple: false
      },
      CastShadow: {
        type: "yes-no",
        required: false,
        multiple: false
      },
      ChangeModel: {
        type: "expression",
        required: true,
        multiple: false,
        arity: 2
      },
      AnalogClock: {
        type: "enum",
        required: true,
        multiple: false,
        enumValues: ["Hour", "Minute", "Second"]
      },
      NoCastShadow: {
        type: "integer",
        required: true,
        multiple: true
      },
      NoReceiveShadow: {
        type: "integer",
        required: true,
        multiple: true
      },
      NoShadow: {
        type: "integer",
        required: true,
        multiple: true
      },
      Transparent: {
        type: "integer",
        required: true,
        multiple: true
      },
      EnvMap: {
        type: "integer",
        required: true,
        multiple: true,
        arity: 2
      },
      AlphaZeroTest: {
        type: "integer",
        required: true,
        multiple: true,
        arity: 2
      },
      ChangeTexture: {
        type: "expression",
        required: true,
        multiple: false,
        arity: 2
      },
      ShiftTexture: {
        type: "expression",
        required: true,
        multiple: false,
        arity: 3
      },
      ScaleTexture: {
        type: "expression",
        required: true,
        multiple: false,
        arity: 5
      },
      RotateTexture: {
        type: "expression",
        required: true,
        multiple: false,
        arity: 4
      },
      TransformTexture: {
        type: "expression",
        required: true,
        multiple: false,
        arity: 7
      },
      SetAnimation: {
        type: "expression",
        required: true,
        multiple: false,
        arity: 2
      },
      ChangeAlpha: {
        type: "expression",
        required: true,
        multiple: false,
        arity: 2
      }
    },
    children: {
      StaticRotation: {
        required: true,
        multiple: false
      },
      StaticMove: {
        required: true,
        multiple: false
      },
      DynamicRotation: {
        required: true,
        multiple: false
      },
      TrackWind: {
        required: true,
        multiple: false
      },
      Windmill: {
        required: true,
        multiple: false
      },
      ChangeMaterial: {
        required: true,
        multiple: false
      },
      ApplySwitch: {
        required: true,
        multiple: false
      },
      If: {
        required: true,
        multiple: false
      },
      Else: {
        required: false,
        multiple: false
      },
      Joint3D: {
        required: true,
        multiple: false
      }
    },
    nameParameter: "string",
  },
  JointZYX: {
    properties: {
      AttachX: {
        type: "float",
        required: true,
        multiple: false
      },
      AttachCoord: {
        type: "vector-2d",
        required: true,
        multiple: false
      },
      LocalCoord: {
        type: "vector-2d",
        required: true,
        multiple: false
      }
    },
    children: {
    },
    nameParameter: "string",
  },
  ObjectZY: {
    properties: {
      ModelFileName: {
        type: "filename",
        required: true,
        multiple: false
      },
      ModelScale: {
        type: "float",
        required: false,
        multiple: false
      },
      Turn: {
        type: "yes-no",
        required: false,
        multiple: false
      },
      CastShadow: {
        type: "yes-no",
        required: false,
        multiple: false
      },
      ChangeModel: {
        type: "expression",
        required: true,
        multiple: false,
        arity: 2
      },
      AnalogClock: {
        type: "enum",
        required: true,
        multiple: false,
        enumValues: ["Hour", "Minute", "Second"]
      },
      NoCastShadow: {
        type: "integer",
        required: true,
        multiple: true
      },
      NoReceiveShadow: {
        type: "integer",
        required: true,
        multiple: true
      },
      NoShadow: {
        type: "integer",
        required: true,
        multiple: true
      },
      Transparent: {
        type: "integer",
        required: true,
        multiple: true
      },
      EnvMap: {
        type: "integer",
        required: true,
        multiple: true,
        arity: 2
      },
      AlphaZeroTest: {
        type: "integer",
        required: true,
        multiple: true,
        arity: 2
      },
      ChangeTexture: {
        type: "expression",
        required: true,
        multiple: false,
        arity: 2
      },
      ShiftTexture: {
        type: "expression",
        required: true,
        multiple: false,
        arity: 3
      },
      ScaleTexture: {
        type: "expression",
        required: true,
        multiple: false,
        arity: 5
      },
      RotateTexture: {
        type: "expression",
        required: true,
        multiple: false,
        arity: 4
      },
      TransformTexture: {
        type: "expression",
        required: true,
        multiple: false,
        arity: 7
      },
      SetAnimation: {
        type: "expression",
        required: true,
        multiple: false,
        arity: 2
      },
      ChangeAlpha: {
        type: "expression",
        required: true,
        multiple: false,
        arity: 2
      },
      FixPosition: {
        type: "float",
        required: false,
        multiple: false
      },
      FixRight: {
        type: "float",
        required: false,
        multiple: false
      }
    },
    children: {
      StaticRotation: {
        required: true,
        multiple: false
      },
      StaticMove: {
        required: true,
        multiple: false
      },
      DynamicRotation: {
        required: true,
        multiple: false
      },
      TrackWind: {
        required: true,
        multiple: false
      },
      Windmill: {
        required: true,
        multiple: false
      },
      ChangeMaterial: {
        required: true,
        multiple: false
      },
      ApplySwitch: {
        required: true,
        multiple: false
      },
      If: {
        required: true,
        multiple: false
      },
      Else: {
        required: false,
        multiple: false
      },
      JointZYX: {
        required: true,
        multiple: false
      }
    },
    nameParameter: "string",
  },
  Link: {
    properties: {
      ModelFileName: {
        type: "filename",
        required: true,
        multiple: false
      },
      ModelScale: {
        type: "float",
        required: false,
        multiple: false
      },
      Turn: {
        type: "yes-no",
        required: false,
        multiple: false
      },
      CastShadow: {
        type: "yes-no",
        required: false,
        multiple: false
      },
      ChangeModel: {
        type: "expression",
        required: true,
        multiple: false,
        arity: 2
      },
      AnalogClock: {
        type: "enum",
        required: true,
        multiple: false,
        enumValues: ["Hour", "Minute", "Second"]
      },
      NoCastShadow: {
        type: "integer",
        required: true,
        multiple: true
      },
      NoReceiveShadow: {
        type: "integer",
        required: true,
        multiple: true
      },
      NoShadow: {
        type: "integer",
        required: true,
        multiple: true
      },
      Transparent: {
        type: "integer",
        required: true,
        multiple: true
      },
      EnvMap: {
        type: "integer",
        required: true,
        multiple: true,
        arity: 2
      },
      AlphaZeroTest: {
        type: "integer",
        required: true,
        multiple: true,
        arity: 2
      },
      ChangeTexture: {
        type: "expression",
        required: true,
        multiple: false,
        arity: 2
      },
      ShiftTexture: {
        type: "expression",
        required: true,
        multiple: false,
        arity: 3
      },
      ScaleTexture: {
        type: "expression",
        required: true,
        multiple: false,
        arity: 5
      },
      RotateTexture: {
        type: "expression",
        required: true,
        multiple: false,
        arity: 4
      },
      TransformTexture: {
        type: "expression",
        required: true,
        multiple: false,
        arity: 7
      },
      SetAnimation: {
        type: "expression",
        required: true,
        multiple: false,
        arity: 2
      },
      ChangeAlpha: {
        type: "expression",
        required: true,
        multiple: false,
        arity: 2
      },
      LinkCoord: {
        type: "vector-2d",
        required: true,
        multiple: false
      }
    },
    children: {
      StaticRotation: {
        required: true,
        multiple: false
      },
      StaticMove: {
        required: true,
        multiple: false
      },
      DynamicRotation: {
        required: true,
        multiple: false
      },
      TrackWind: {
        required: true,
        multiple: false
      },
      Windmill: {
        required: true,
        multiple: false
      },
      ChangeMaterial: {
        required: true,
        multiple: false
      },
      ApplySwitch: {
        required: true,
        multiple: false
      },
      If: {
        required: true,
        multiple: false
      },
      Else: {
        required: false,
        multiple: false
      },
      JointZYX: {
        required: true,
        multiple: false
      }
    },
    nameParameter: "string",
  },
  TriangleZY: {
    properties: {
    },
    children: {
      Link: {
        required: true,
        multiple: false
      }
    },
  },
  Slide: {
    properties: {
      ModelFileName: {
        type: "filename",
        required: true,
        multiple: false
      },
      ModelScale: {
        type: "float",
        required: false,
        multiple: false
      },
      Turn: {
        type: "yes-no",
        required: false,
        multiple: false
      },
      CastShadow: {
        type: "yes-no",
        required: false,
        multiple: false
      },
      ChangeModel: {
        type: "expression",
        required: true,
        multiple: false,
        arity: 2
      },
      AnalogClock: {
        type: "enum",
        required: true,
        multiple: false,
        enumValues: ["Hour", "Minute", "Second"]
      },
      NoCastShadow: {
        type: "integer",
        required: true,
        multiple: true
      },
      NoReceiveShadow: {
        type: "integer",
        required: true,
        multiple: true
      },
      NoShadow: {
        type: "integer",
        required: true,
        multiple: true
      },
      Transparent: {
        type: "integer",
        required: true,
        multiple: true
      },
      EnvMap: {
        type: "integer",
        required: true,
        multiple: true,
        arity: 2
      },
      AlphaZeroTest: {
        type: "integer",
        required: true,
        multiple: true,
        arity: 2
      },
      ChangeTexture: {
        type: "expression",
        required: true,
        multiple: false,
        arity: 2
      },
      ShiftTexture: {
        type: "expression",
        required: true,
        multiple: false,
        arity: 3
      },
      ScaleTexture: {
        type: "expression",
        required: true,
        multiple: false,
        arity: 5
      },
      RotateTexture: {
        type: "expression",
        required: true,
        multiple: false,
        arity: 4
      },
      TransformTexture: {
        type: "expression",
        required: true,
        multiple: false,
        arity: 7
      },
      SetAnimation: {
        type: "expression",
        required: true,
        multiple: false,
        arity: 2
      },
      ChangeAlpha: {
        type: "expression",
        required: true,
        multiple: false,
        arity: 2
      },
      Direction: {
        type: "vector-2d",
        required: true,
        multiple: false
      }
    },
    children: {
      StaticRotation: {
        required: true,
        multiple: false
      },
      StaticMove: {
        required: true,
        multiple: false
      },
      DynamicRotation: {
        required: true,
        multiple: false
      },
      TrackWind: {
        required: true,
        multiple: false
      },
      Windmill: {
        required: true,
        multiple: false
      },
      ChangeMaterial: {
        required: true,
        multiple: false
      },
      ApplySwitch: {
        required: true,
        multiple: false
      },
      If: {
        required: true,
        multiple: false
      },
      Else: {
        required: false,
        multiple: false
      },
      JointZYX: {
        required: true,
        multiple: false
      }
    },
    nameParameter: "string",
  },
  CrankZY: {
    properties: {
    },
    children: {
      Link: {
        required: true,
        multiple: false
      },
      Slide: {
        required: true,
        multiple: false
      }
    },
  },
  PistonZY: {
    properties: {
    },
    children: {
      Link: {
        required: true,
        multiple: false
      }
    },
  },
  Headlight: {
    properties: {
      AttachObject: {
        type: "string",
        required: true,
        multiple: false
      },
      SourceCoord: {
        type: "vector-3d",
        required: true,
        multiple: false
      },
      Direction: {
        type: "vector-3d",
        required: true,
        multiple: false
      },
      MaxDistance: {
        type: "float",
        required: true,
        multiple: false
      }
    },
    children: {
      LensFlare: {
        required: true,
        multiple: false
      }
    },
  },
  Particle: {
    properties: {
      TextureFileName: {
        type: "filename",
        required: true,
        multiple: false
      },
      AttachObject: {
        type: "string",
        required: true,
        multiple: false
      },
      SourceCoord: {
        type: "vector-3d",
        required: true,
        multiple: false
      },
      MinQty: {
        type: "float",
        required: true,
        multiple: false
      },
      MaxQty: {
        type: "float",
        required: false,
        multiple: false
      },
      VelocityRel: {
        type: "float",
        required: false,
        multiple: false
      },
      AccelerationRel: {
        type: "float",
        required: false,
        multiple: false
      },
      DecelerationRel: {
        type: "float",
        required: false,
        multiple: false
      },
      Lifetime: {
        type: "vector-2d",
        required: true,
        multiple: false
      },
      Direction: {
        type: "vector-3d",
        required: true,
        multiple: false
      },
      InitialRadius: {
        type: "vector-2d",
        required: true,
        multiple: false
      },
      FinalRadius: {
        type: "vector-2d",
        required: true,
        multiple: false
      },
      Color: {
        type: "color",
        required: true,
        multiple: false,
        arity: 2
      },
      BlendMode: {
        type: "enum",
        required: true,
        multiple: false,
        enumValues: ["Alpha", "Add"]
      },
      AirResistance: {
        type: "float",
        required: false,
        multiple: false
      },
      Gravity: {
        type: "float",
        required: false,
        multiple: false
      },
      Turbulence: {
        type: "float",
        required: false,
        multiple: false
      }
    },
    children: {
    },
  },
  SoundEffect: {
    properties: {
      WaveFileName: {
        type: "filename",
        required: true,
        multiple: false
      },
      AttachObject: {
        type: "string",
        required: true,
        multiple: false
      },
      SourceCoord: {
        type: "vector-3d",
        required: true,
        multiple: false
      },
      Volume: {
        type: "integer",
        required: false,
        multiple: false
      },
      Loop: {
        type: "yes-no",
        required: false,
        multiple: false
      }
    },
    children: {
    },
  },
  PrimaryAssembly: {
    properties: {
      ConnectRail: {
        type: "integer",
        required: true,
        multiple: false,
        arity: 2
      },
      BranchRail: {
        type: "integer",
        required: true,
        multiple: false,
        arity: 2
      },
      DisconnectRail: {
        type: "integer",
        required: true,
        multiple: false
      }
    },
    children: {
      Axle: {
        required: true,
        multiple: false
      },
      Body: {
        required: true,
        multiple: false
      },
      Object3D: {
        required: true,
        multiple: false
      },
      ObjectZY: {
        required: true,
        multiple: false
      },
      TriangleZY: {
        required: true,
        multiple: false
      },
      CrankZY: {
        required: true,
        multiple: false
      },
      PistonZY: {
        required: true,
        multiple: false
      },
      Headlight: {
        required: true,
        multiple: false
      },
      Particle: {
        required: true,
        multiple: false
      },
      SoundEffect: {
        required: true,
        multiple: false
      },
      ApplySwitch: {
        required: true,
        multiple: false
      },
      If: {
        required: true,
        multiple: false
      },
      Else: {
        required: false,
        multiple: false
      },
      FrontCabin: {
        required: false,
        multiple: false
      },
      TailCabin: {
        required: false,
        multiple: false
      }
    },
  },
  StructInfo: {
    properties: {
    },
    children: {
    },
  },
  SurfaceInfo: {
    properties: {
      SizeX: {
        type: "float",
        required: true,
        multiple: false
      },
      SizeZ: {
        type: "float",
        required: true,
        multiple: false
      }
    },
    children: {
    },
  },
  Axle: {
    properties: {
      ModelFileName: {
        type: "filename",
        required: true,
        multiple: false
      },
      ModelScale: {
        type: "float",
        required: false,
        multiple: false
      },
      Turn: {
        type: "yes-no",
        required: false,
        multiple: false
      },
      CastShadow: {
        type: "yes-no",
        required: false,
        multiple: false
      },
      ChangeModel: {
        type: "expression",
        required: true,
        multiple: false,
        arity: 2
      },
      AnalogClock: {
        type: "enum",
        required: true,
        multiple: false,
        enumValues: ["Hour", "Minute", "Second"]
      },
      NoCastShadow: {
        type: "integer",
        required: true,
        multiple: true
      },
      NoReceiveShadow: {
        type: "integer",
        required: true,
        multiple: true
      },
      NoShadow: {
        type: "integer",
        required: true,
        multiple: true
      },
      Transparent: {
        type: "integer",
        required: true,
        multiple: true
      },
      EnvMap: {
        type: "integer",
        required: true,
        multiple: true,
        arity: 2
      },
      AlphaZeroTest: {
        type: "integer",
        required: true,
        multiple: true,
        arity: 2
      },
      ChangeTexture: {
        type: "expression",
        required: true,
        multiple: false,
        arity: 2
      },
      ShiftTexture: {
        type: "expression",
        required: true,
        multiple: false,
        arity: 3
      },
      ScaleTexture: {
        type: "expression",
        required: true,
        multiple: false,
        arity: 5
      },
      RotateTexture: {
        type: "expression",
        required: true,
        multiple: false,
        arity: 4
      },
      TransformTexture: {
        type: "expression",
        required: true,
        multiple: false,
        arity: 7
      },
      SetAnimation: {
        type: "expression",
        required: true,
        multiple: false,
        arity: 2
      },
      ChangeAlpha: {
        type: "expression",
        required: true,
        multiple: false,
        arity: 2
      },
      Diameter: {
        type: "float",
        required: true,
        multiple: false
      },
      Symmetric: {
        type: "integer",
        required: true,
        multiple: false
      },
      Coord: {
        type: "vector-2d",
        required: true,
        multiple: false
      },
      WheelSound: {
        type: "yes-no",
        required: false,
        multiple: false
      }
    },
    children: {
      StaticRotation: {
        required: true,
        multiple: false
      },
      StaticMove: {
        required: true,
        multiple: false
      },
      DynamicRotation: {
        required: true,
        multiple: false
      },
      TrackWind: {
        required: true,
        multiple: false
      },
      Windmill: {
        required: true,
        multiple: false
      },
      ChangeMaterial: {
        required: true,
        multiple: false
      },
      ApplySwitch: {
        required: true,
        multiple: false
      },
      If: {
        required: true,
        multiple: false
      },
      Else: {
        required: false,
        multiple: false
      }
    },
    nameParameter: "string",
  },
  JointZY: {
    properties: {
      AttachCoord: {
        type: "vector-2d",
        required: true,
        multiple: false
      },
      LocalCoord: {
        type: "vector-2d",
        required: true,
        multiple: false
      }
    },
    children: {
    },
    nameParameter: "string",
  },
  Tilt: {
    properties: {
      TiltRatio: {
        type: "float",
        required: true,
        multiple: false
      },
      MaxAngle: {
        type: "float",
        required: true,
        multiple: false
      },
      BaseAlt: {
        type: "float",
        required: true,
        multiple: false
      }
    },
    children: {
    },
  },
  Body: {
    properties: {
      ModelFileName: {
        type: "filename",
        required: true,
        multiple: false
      },
      ModelScale: {
        type: "float",
        required: false,
        multiple: false
      },
      Turn: {
        type: "yes-no",
        required: false,
        multiple: false
      },
      CastShadow: {
        type: "yes-no",
        required: false,
        multiple: false
      },
      ChangeModel: {
        type: "expression",
        required: true,
        multiple: false,
        arity: 2
      },
      AnalogClock: {
        type: "enum",
        required: true,
        multiple: false,
        enumValues: ["Hour", "Minute", "Second"]
      },
      NoCastShadow: {
        type: "integer",
        required: true,
        multiple: true
      },
      NoReceiveShadow: {
        type: "integer",
        required: true,
        multiple: true
      },
      NoShadow: {
        type: "integer",
        required: true,
        multiple: true
      },
      Transparent: {
        type: "integer",
        required: true,
        multiple: true
      },
      EnvMap: {
        type: "integer",
        required: true,
        multiple: true,
        arity: 2
      },
      AlphaZeroTest: {
        type: "integer",
        required: true,
        multiple: true,
        arity: 2
      },
      ChangeTexture: {
        type: "expression",
        required: true,
        multiple: false,
        arity: 2
      },
      ShiftTexture: {
        type: "expression",
        required: true,
        multiple: false,
        arity: 3
      },
      ScaleTexture: {
        type: "expression",
        required: true,
        multiple: false,
        arity: 5
      },
      RotateTexture: {
        type: "expression",
        required: true,
        multiple: false,
        arity: 4
      },
      TransformTexture: {
        type: "expression",
        required: true,
        multiple: false,
        arity: 7
      },
      SetAnimation: {
        type: "expression",
        required: true,
        multiple: false,
        arity: 2
      },
      ChangeAlpha: {
        type: "expression",
        required: true,
        multiple: false,
        arity: 2
      }
    },
    children: {
      StaticRotation: {
        required: true,
        multiple: false
      },
      StaticMove: {
        required: true,
        multiple: false
      },
      DynamicRotation: {
        required: true,
        multiple: false
      },
      TrackWind: {
        required: true,
        multiple: false
      },
      Windmill: {
        required: true,
        multiple: false
      },
      ChangeMaterial: {
        required: true,
        multiple: false
      },
      ApplySwitch: {
        required: true,
        multiple: false
      },
      If: {
        required: true,
        multiple: false
      },
      Else: {
        required: false,
        multiple: false
      },
      JointZY: {
        required: true,
        multiple: false
      },
      Tilt: {
        required: true,
        multiple: false
      }
    },
    nameParameter: "string",
  },
  Circle: {
    properties: {
      Distance: {
        type: "float",
        required: true,
        multiple: false
      },
      Radius: {
        type: "float",
        required: true,
        multiple: false
      },
      InnerColor: {
        type: "color",
        required: true,
        multiple: false
      },
      OuterColor: {
        type: "color",
        required: true,
        multiple: false
      }
    },
    children: {
    },
  },
  Hexagon: {
    properties: {
      Distance: {
        type: "float",
        required: true,
        multiple: false
      },
      Radius: {
        type: "float",
        required: true,
        multiple: false
      },
      InnerColor: {
        type: "color",
        required: true,
        multiple: false
      },
      OuterColor: {
        type: "color",
        required: true,
        multiple: false
      }
    },
    children: {
    },
  },
  PluginHeader: {
    properties: {
      RailSimVersion: {
        type: "float",
        required: true,
        multiple: false
      },
      PluginType: {
        type: "identifier",
        required: true,
        multiple: false
      },
      PluginName: {
        type: "string",
        required: true,
        multiple: false
      },
      PluginAuthor: {
        type: "string",
        required: true,
        multiple: false
      },
      IconTexture: {
        type: "filename",
        required: false,
        multiple: false
      },
      IconRect: {
        type: "expression",
        required: false,
        multiple: false,
        arity: 4
      },
      Description: {
        type: "float",
        required: true,
        multiple: true
      }
    },
    children: {
    },
  },
  TieInfo: {
    properties: {
      Height: {
        type: "float",
        required: true,
        multiple: false
      },
      FlattenCant: {
        type: "yes-no",
        required: false,
        multiple: false
      }
    },
    children: {
      Profile: {
        required: true,
        multiple: false
      },
      Wireframe: {
        required: true,
        multiple: false
      },
      Interval: {
        required: true,
        multiple: false
      }
    },
  },
  TrainInfo: {
    properties: {
      FrontLimit: {
        type: "float",
        required: true,
        multiple: false
      },
      TailLimit: {
        type: "float",
        required: true,
        multiple: false
      },
      MaxVelocity: {
        type: "float",
        required: true,
        multiple: false
      },
      MaxAcceleration: {
        type: "float",
        required: true,
        multiple: false
      },
      MaxDeceleration: {
        type: "float",
        required: true,
        multiple: false
      },
      TiltSpeed: {
        type: "float",
        required: false,
        multiple: false
      },
      DoorClosingTime: {
        type: "float",
        required: false,
        multiple: false
      }
    },
    children: {
    },
  },
  FrontCabin: {
    properties: {
    },
    children: {
      Joint3D: {
        required: true,
        multiple: false
      }
    },
  },
  TailCabin: {
    properties: {
    },
    children: {
      Joint3D: {
        required: true,
        multiple: false
      }
    },
  }
};

export const fileSchemas: FileSchema = {
  "Env2.txt": [
    { name: "PluginHeader", required: true, multiple: false },
    { name: "EnvInfo", required: true, multiple: false },
    { name: "Landscape", required: true, multiple: false },
    { name: "Sun", required: true, multiple: false },
    { name: "Moon", required: true, multiple: false }
  ],
  "Girder2.txt": [
    { name: "PluginHeader", required: true, multiple: false },
    { name: "GirderInfo", required: true, multiple: false }
  ],
  "Line2.txt": [
    { name: "PluginHeader", required: true, multiple: false },
    { name: "LineInfo", required: true, multiple: false }
  ],
  "Pier2.txt": [
    { name: "PluginHeader", required: true, multiple: false },
    { name: "PierInfo", required: true, multiple: false },
    { name: "Joint", required: true, multiple: false },
    { name: "Head", required: true, multiple: false },
    { name: "Base", required: true, multiple: false }
  ],
  "Pole2.txt": [
    { name: "PluginHeader", required: true, multiple: false },
    { name: "PoleInfo", required: true, multiple: false },
    { name: "Model", required: true, multiple: false }
  ],
  "Rail2.txt": [
    { name: "PluginHeader", required: true, multiple: false },
    { name: "RailInfo", required: true, multiple: false },
    { name: "SoundInfo", required: true, multiple: false }
  ],
  "Skin2.txt": [
    { name: "PluginHeader", required: true, multiple: false },
    { name: "NormalCursor", required: true, multiple: false },
    { name: "ResizeCursor1", required: true, multiple: false },
    { name: "ResizeCursor2", required: true, multiple: false },
    { name: "ResizeCursor3", required: true, multiple: false },
    { name: "ResizeCursor4", required: true, multiple: false },
    { name: "Interface", required: true, multiple: false },
    { name: "Background", required: true, multiple: false },
    { name: "Frame", required: true, multiple: false },
    { name: "EditCtrl", required: true, multiple: false },
    { name: "ListView", required: true, multiple: false },
    { name: "PluginTree", required: true, multiple: false },
    { name: "PopupMenu", required: true, multiple: false },
    { name: "Model", required: true, multiple: false },
    { name: "Sound", required: true, multiple: false }
  ],
  "Station2.txt": [
    { name: "PluginHeader", required: true, multiple: false },
    { name: "StationInfo", required: true, multiple: false },
    { name: "Platform", required: true, multiple: false },
    { name: "PrimaryAssembly", required: true, multiple: false }
  ],
  "Struct2.txt": [
    { name: "PluginHeader", required: true, multiple: false },
    { name: "StructInfo", required: true, multiple: false },
    { name: "PrimaryAssembly", required: true, multiple: false }
  ],
  "Surface2.txt": [
    { name: "PluginHeader", required: true, multiple: false },
    { name: "SurfaceInfo", required: true, multiple: false },
    { name: "PrimaryAssembly", required: true, multiple: false }
  ],
  "Tie2.txt": [
    { name: "PluginHeader", required: true, multiple: false },
    { name: "TieInfo", required: true, multiple: false }
  ],
  "Train2.txt": [
    { name: "PluginHeader", required: true, multiple: false },
    { name: "TrainInfo", required: true, multiple: false },
    { name: "PrimaryAssembly", required: true, multiple: false }
  ]
};

export function getFileSchema(fileName: string): RootObjectEntry[] | undefined {
  return fileSchemas[fileName];
}
