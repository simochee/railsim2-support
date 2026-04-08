# Schema Completeness — hoverData 照合による全面修正

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** hoverData.generated.ts（RailSim II 公式ヘルプ由来）を信頼できるリファレンスとして、semantic.ts のスキーマ定義を全面的に修正し、正しい定義ファイルに偽エラーが出ない状態にする。

**Architecture:** semantic.ts のみを変更対象とし、タスクごとにテスト→修正→テスト通過→コミットの TDD サイクルで進める。変更は hoverData + 実ファイルの両方を根拠とする。バリデータロジック (schemaValidator.ts, unknownKeywordValidator.ts) には手を加えない。

**Tech Stack:** TypeScript, Vitest

---

## ファイル

- **修正**: `packages/language-server/src/schema/semantic.ts`
- **テスト**: `packages/language-server/test/semantic.test.ts`（スキーマ構造テスト）
- **テスト**: `packages/language-server/test/schemaValidator.test.ts`（バリデーションテスト）
- **参照**: `packages/language-server/src/server/hoverData.generated.ts`（正解リファレンス）
- **参照**: `/Users/ryoya.tamura/Downloads/Train/mrt_JNR_kh66/Train2.txt`（実ファイル）
- **テスト実行**: `cd packages/language-server && npx vitest run`

---

## Task 1: Train2.txt ルートオブジェクト定義の修正

**Files:**
- Modify: `packages/language-server/src/schema/semantic.ts` (fileSchemas["Train2.txt"])
- Test: `packages/language-server/test/semantic.test.ts`

### 修正内容

`fileSchemas["Train2.txt"]` に `DefineSwitch` と `PrimaryAssembly` を追加:

```ts
"Train2.txt": [
  { name: "PluginHeader", required: true, multiple: false },
  { name: "TrainInfo", required: true, multiple: false },
  { name: "DefineSwitch", required: false, multiple: true },
  { name: "PrimaryAssembly", required: false, multiple: false },
],
```

### テスト追加

```ts
it("Train2.txt のルートオブジェクトに DefineSwitch と PrimaryAssembly が含まれる", () => {
  const train = fileSchemas["Train2.txt"];
  const names = train.map((e) => e.name);
  expect(names).toContain("DefineSwitch");
  expect(names).toContain("PrimaryAssembly");
});
```

---

## Task 2: TrainInfo スキーマ修正

**Files:**
- Modify: `packages/language-server/src/schema/semantic.ts` (TrainInfo)

### 修正内容

1. `Gauge: req("float")` → `Gauge: opt("float")` (実ファイルで省略されている)
2. `Body: child(true, true)` → `Body: child(false, true)` (PrimaryAssembly の子であり TrainInfo 必須ではない)
3. `TiltSpeed: opt("float")` を追加 (hover に記載あり)

---

## Task 3: PrimaryAssembly スキーマ充実

**Files:**
- Modify: `packages/language-server/src/schema/semantic.ts` (PrimaryAssembly)

### 修正内容

```ts
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
```

また、Train2.txt 用 SoundEffect を追加:

```ts
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
```

---

## Task 4: Axle スキーマ修正

**Files:**
- Modify: `packages/language-server/src/schema/semantic.ts` (Axle)
- Test: `packages/language-server/test/semantic.test.ts`

### 修正内容

```ts
Axle: {
  properties: {
    ModelFileName: opt("filename"),
    ModelScale: opt("float"),
    Coord: req("vector-2d"),   // ← vector-3d → vector-2d (hover: ZY座標系)
    Diameter: opt("float"),
    Symmetric: opt("integer"),
    WheelSound: opt("yes-no"), // hover に記載
  },
  children: {},
  nameParameter: "identifier",
},
```

### テスト追加

```ts
it("Axle.Coord は vector-2d", () => {
  expect(semanticSchema["Axle"].properties["Coord"]).toMatchObject({ type: "vector-2d" });
});
```

---

## Task 5: Body スキーマ修正

**Files:**
- Modify: `packages/language-server/src/schema/semantic.ts` (Body)

### 修正内容

```ts
Body: {
  properties: {
    ModelFileName: opt("filename"),   // req → opt (空文字列で使われることがある)
    ModelScale: opt("float"),
    Turn: opt("yes-no"),             // hover Object3D + 実ファイルで使用
  },
  children: {
    Headlight: child(false, true),
    FrontCabin: child(false, false),
    TailCabin: child(false, false),
    Axle: child(false, true),
    Object3D: child(false, true),
    JointZY: child(false, true),     // 実ファイルで使用
    Tilt: child(false, false),       // hover に記載
  },
  nameParameter: "identifier",
},
```

---

## Task 6: Object3D スキーマ大幅拡充

**Files:**
- Modify: `packages/language-server/src/schema/semantic.ts` (Object3D)

### 修正内容

```ts
Object3D: {
  properties: {
    ModelFileName: opt("filename"),    // req → opt (空文字列も有効)
    ModelScale: opt("float"),
    AttachCoord: opt("vector-3d"),
    AttachDir: opt("vector-3d"),
    AttachUp: opt("vector-3d"),
    AnalogClock: opt("enum", { enumValues: ["Hour", "Minute", "Second"] }),
    Turn: opt("yes-no"),
    CastShadow: opt("yes-no"),
    // 材質カスタマイザ系 — 材質番号 + 値の形式 (expression で受ける)
    NoCastShadow: opt("expression", { multiple: true }),
    AlphaZeroTest: opt("expression", { multiple: true }),
    NoReceiveShadow: opt("expression", { multiple: true }),
    NoShadow: opt("expression", { multiple: true }),
    Transparent: opt("expression", { multiple: true }),
    ChangeTexture: opt("expression", { multiple: true }),
    ChangeAlpha: opt("expression", { multiple: true }),
    ChangeModel: opt("expression", { multiple: true }),
  },
  children: {
    StaticRotation: child(false, true),   // false→true (multiple)
    DynamicRotation: child(false, true),  // false→true
    StaticMove: child(false, true),       // false→true
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
```

---

## Task 7: StaticMove アニメーションプロパティ追加

**Files:**
- Modify: `packages/language-server/src/schema/semantic.ts` (StaticMove)

### 修正内容

```ts
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
```

同様に StaticRotation, DynamicRotation にもアニメーションタイミングプロパティを追加。

---

## Task 8: Joint3D / JointZY / JointZYX スキーマ修正

**Files:**
- Modify: `packages/language-server/src/schema/semantic.ts`

### 修正内容

```ts
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
```

---

## Task 9: ChangeMaterial スキーマ修正

**Files:**
- Modify: `packages/language-server/src/schema/semantic.ts` (ChangeMaterial)

### 修正内容 (hover 準拠)

```ts
ChangeMaterial: {
  properties: {
    MaterialID: opt("integer"),
    Diffuse: opt("color"),
    Ambient: opt("color"),
    Specular: opt("color"),
    Emissive: opt("color"),
    Power: opt("float"),
  },
  children: {},
},
```

---

## Task 10: Sound スキーマ修正 + SoundEffect (Skin2.txt) 修正

**Files:**
- Modify: `packages/language-server/src/schema/semantic.ts`

### Sound

```ts
Sound: {
  properties: {
    WaveFileName: req("filename"),
    Volume: opt("float"),
    Loop: opt("yes-no"),
    VelocityRel: opt("yes-no"),
    AccelerationRel: opt("yes-no"),
    DecelerationRel: opt("yes-no"),
    AttachObject: opt("identifier"),
    SourceCoord: opt("vector-3d"),   // 追加 (hover に記載)
  },
  children: {},
},
```

### SoundEffect (Skin2.txt)

```ts
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
```

---

## Task 11: FrontCabin / TailCabin スキーマ修正

**Files:**
- Modify: `packages/language-server/src/schema/semantic.ts`

### 修正内容

```ts
FrontCabin: {
  properties: {
    ModelFileName: opt("filename"),  // req → opt
    ModelScale: opt("float"),
  },
  children: {
    Joint3D: child(false, false),    // 追加
  },
},

TailCabin: {
  properties: {
    ModelFileName: opt("filename"),  // req → opt
    ModelScale: opt("float"),
  },
  children: {
    Joint3D: child(false, false),    // 追加
  },
},
```

---

## Task 12: Headlight スキーマ修正

**Files:**
- Modify: `packages/language-server/src/schema/semantic.ts`

### 修正内容

```ts
Headlight: {
  properties: {
    Coord: opt("vector-3d"),        // req → opt
    SourceCoord: opt("vector-3d"),  // 追加 (hover)
    Direction: opt("vector-3d"),
    Color: opt("color"),
    AttachObject: opt("identifier"),
    MaxDistance: opt("float"),       // 追加 (hover)
  },
  children: {},
},
```

---

## Task 13: DynamicRotation プロパティ追加

```ts
DynamicRotation: {
  properties: {
    RotationAxis: opt("vector-3d"),
    RotationSpeed: opt("float"),
    Acceleration: opt("float"),    // 追加
    Deceleration: opt("float"),    // 追加
    PreAnimationDelay: opt("float"),
    AnimationTime: opt("float"),
    PreReverseDelay: opt("float"),
    ReverseTime: opt("float"),
    PostAnimationDelay: opt("float"),
    PostReverseDelay: opt("float"),
  },
  children: {},
},
```

---

## Task 14: Rail2.txt 関連 — RailInfo, Profile, Vertex, Wireframe

### RailInfo に追加:
- `Height: opt("float")`
- `SurfaceAlt: opt("float")`

### Profile に追加:
- `UseTexture: opt("yes-no")`
- `TexFileName: opt("filename")`
- `TexVPerMeter: opt("float")`

### Vertex:Profile に追加:
- `IgnoreCant: opt("yes-no")`
- `Diffuse: opt("color")`

### Vertex:Wireframe に追加:
- `IgnoreCant: opt("yes-no")`
- `Diffuse: opt("color")`

### Wireframe に追加:
- `MinInterval: opt("float")`
- `MaxInterval: opt("float")`

---

## Task 15: TieInfo / GirderInfo / PierInfo / PoleInfo 修正

### TieInfo に追加:
- `Height: opt("float")`
- `FlattenCant: opt("yes-no")`

### GirderInfo に追加:
- `Height: opt("float")`
- `TrackNum: opt("integer")`
- `TrackInterval: opt("float")`
- `FlattenCant: opt("yes-no")`

### PierInfo に追加:
- `TrackNum: opt("integer")`
- `TrackInterval: opt("float")`
- `Direction: opt("enum", { enumValues: ["up", "down"] })`
- `Interval: opt("float")`
- `BuildMinAlt: opt("float")`

PierInfo から `BaseToPierLocal`, `HeadToPierLocal` を削除し、それぞれ Base, Head に移動。

### Base に追加:
- `BaseToPierLocal: opt("vector-3d")`

### Head に追加:
- `HeadToPierLocal: opt("vector-3d")`

### PoleInfo に追加:
- `TrackNum: opt("integer")`
- `TrackInterval: opt("float")`

---

## Task 16: Platform (Station2.txt) 大幅拡充

```ts
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
```

---

## Task 17: Env2.txt — EnvInfo 修正

### EnvInfo に追加:
- `EnvMap: opt("integer")`

---

## Task 18: Skin2.txt 関連修正

### EditCtrl:
`ErrorWaveFileName` を削除し、色系プロパティを追加:

```ts
EditCtrl: {
  properties: {
    DefaultFontColor: opt("color"),
    EditBaseColor: opt("color"),
    EditFontColor: opt("color"),
    ConvertFontColor: opt("color"),
    ConvertClauseColor: opt("color"),
    SelectedBaseColor: opt("color"),
  },
  children: {},
},
```

### PopupMenu:
`MouseDownWaveFileName`, `MouseUpWaveFileName` を削除し、色系プロパティを追加:

```ts
PopupMenu: {
  properties: {
    DefaultFontColor: opt("color"),
    DisabledFontColor: opt("color"),
    DisabledShadowColor: opt("color"),
    SelectedBaseColor: opt("color"),
    SelectedFontColor: opt("color"),
  },
  children: {},
},
```

### ListView:

```ts
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
```

### PluginTree:

```ts
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
```

### Background に追加:
- `ImageSize: opt("vector-2d")`
- `BackgroundColor: opt("color")`
- `UseWallpaper: opt("yes-no")`

### Interface に追加:
- `TexFileName: opt("filename")`

Interface から他オブジェクト所属プロパティの削除は、実ファイルで本当にそうなっているか確認が必要なため保留。

---

## Task 19: その他オブジェクト修正

### Particle に追加:
- `VelocityRel: opt("float")`
- `AccelerationRel: opt("float")`
- `DecelerationRel: opt("float")`
- `BlendMode: opt("enum", { enumValues: ["Alpha", "Add"] })`

### LensFlare に追加:
- `Inclination: opt("float")`

### Tilt:

```ts
Tilt: {
  properties: {
    TiltRatio: opt("float"),
    TiltSpeed: opt("float"),
    MaxAngle: opt("float"),
    BaseAlt: opt("float"),
  },
  children: {},
},
```

### TrackWind:

```ts
TrackWind: {
  properties: {
    TrackSpeed: opt("float"),
    FixAxis: opt("vector-3d"),
    RotationAxis: opt("vector-3d"),
  },
  children: {},
},
```

### Windmill に追加:
- `Directional: opt("yes-no")`

### ObjectZY に追加:
- `FixPosition: opt("float")`

### Link に追加:
- `LinkCoord: opt("vector-3d")`

---

## Task 20: LEGACY_PROPERTIES クリーンアップ

`Turn` がスキーマに追加されたため、`LEGACY_PROPERTIES` から削除:

```ts
const LEGACY_PROPERTIES = ["EnvMap"];  // Turn 削除
```

※ `EnvMap` も EnvInfo に追加済みなら空配列にできるが、EnvMap は EnvInfo のプロパティとして追加するため、ここからも削除可能。

---

## Task 21: 統合テスト — 実ファイル Train2.txt のバリデーション

**Files:**
- Test: `packages/language-server/test/schemaValidator.test.ts`

### テスト追加

実ファイルの構造を元にした統合テストを追加:

```ts
it("Train2.txt の基本構造にスキーマエラーが出ない", () => {
  const src = `
PluginHeader {
  RailSimVersion = "2.00";
  PluginType = Train;
  PluginName = "test";
  PluginAuthor = "author";
}
TrainInfo {
  FrontLimit = 10.65;
  TailLimit = -10.65;
  MaxVelocity = 100.0;
  MaxAcceleration = 2.1;
  MaxDeceleration = 3.3;
  DoorClosingTime = 4.0;
}
DefineSwitch "switch1" {
  Entry = "a";
  Entry = "b";
}
PrimaryAssembly {
  Axle "Wheel1" {
    ModelFileName = "wheel.x";
    ModelScale = 1.0;
    Diameter = 0.8;
    Symmetric = 8;
    Coord = (8.25, 0.43);
  }
  Body "Bogie1" {
    ModelFileName = "bogie.x";
    ModelScale = 1.0;
    JointZY "Wheel1" {
      AttachCoord = (0.0, 0.0);
      LocalCoord = (0.9, 0.0);
    }
  }
  Object3D "MainBody" {
    ModelFileName = "body.x";
    ModelScale = 1.0;
    NoCastShadow = 24;
    AlphaZeroTest = 24;
    Joint3D "Bogie1" {
      AttachCoord = (0.0, 0.57, 0.0);
      AttachDir = (0.0, 0.0, 1.0);
    }
    ChangeMaterial {
      MaterialID = 0;
      Emissive = 1.0, 1.0, 1.0;
    }
  }
  FrontCabin {
    Joint3D "MainBody" {
      AttachCoord = (-0.9, 2.5, 10.0);
      DirLink = MainBody;
      AttachDir = (0.0, 0.0, 1.0);
    }
  }
}
`;
  const diags = validate(src, "Train2.txt");
  const errors = diags.filter((d) => d.severity === "error");
  expect(errors).toEqual([]);
});
```

---

## Task 22: 既存テスト修正

既存テストで TrainInfo.Gauge を required として検証しているテストがあれば修正する。
`Body { ModelFileName = "a.x"; }` のようなテストで ModelFileName が required の前提のテストも確認。

---

## コミット戦略

- Task 1-3: Train2.txt ルート + TrainInfo + PrimaryAssembly → コミット1
- Task 4-8: Axle, Body, Object3D, StaticMove, Joint系 → コミット2
- Task 9-13: ChangeMaterial, Sound, Cabin, Headlight, DynamicRotation → コミット3
- Task 14-15: Rail/Tie/Girder/Pier/Pole 修正 → コミット4
- Task 16-17: Platform, EnvInfo → コミット5
- Task 18: Skin2.txt 関連 → コミット6
- Task 19-20: その他 + LEGACY cleanup → コミット7
- Task 21-22: 統合テスト + 既存テスト修正 → コミット8
