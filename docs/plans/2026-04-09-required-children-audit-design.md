# Required Children 網羅精査 設計

## 目的

生成スキーマ (`semantic.generated.ts`) で `required: true` とマークされている全 children について、vendor C++ ソースコードと突き合わせて正当性を検証する。誤りがあれば `schema-overrides.ts` で補正し、判断不能なものはレポートする。

## 対象

### Children (23件)

| # | Parent | Child | multiple | 検証対象ファイル(想定) |
|---|--------|-------|----------|----------------------|
| 1 | Lighting | Set | yes | CEnvPlugin.cpp / CScene.cpp |
| 2 | Sun | LensFlare | no | CEnvPlugin.cpp / CLensFlare.cpp |
| 3 | Sun | Whiteout | no | CEnvPlugin.cpp |
| 4 | Sun | Lighting | no | CEnvPlugin.cpp |
| 5 | Face | Vertex | yes | CProfilePlugin.cpp |
| 6 | Profile | Material | yes | CProfilePlugin.cpp |
| 7 | Profile | Face | yes | CProfilePlugin.cpp |
| 8 | Line | Vertex | yes | CLine.cpp |
| 9 | Wireframe | Line | yes | CLine.cpp |
| 10 | Object3D | Joint3D | yes | CNamedObject.cpp |
| 11 | ObjectZY | JointZYX | yes | CNamedObject.cpp |
| 12 | Link | JointZYX | no | CNamedObject.cpp |
| 13 | TriangleZY | Link | yes | CNamedObject.cpp |
| 14 | Slide | JointZYX | no | CNamedObject.cpp |
| 15 | CrankZY | Link | yes | CNamedObject.cpp |
| 16 | CrankZY | Slide | yes | CNamedObject.cpp |
| 17 | PistonZY | Link | yes | CNamedObject.cpp |
| 18 | Headlight | LensFlare | yes | CNamedObject.cpp / CLensFlare.cpp |
| 19 | PrimaryAssembly | Axle | yes | CPartsInst.cpp |
| 20 | Body | JointZY | yes | CNamedObject.cpp / CPartsInst.cpp |
| 21 | Body | Tilt | no | CNamedObject.cpp / CPartsInst.cpp |
| 22 | FrontCabin | Joint3D | no | CNamedObject.cpp |
| 23 | TailCabin | Joint3D | no | CNamedObject.cpp |

### File-level (各ファイルの PluginHeader + XxxInfo)

既存の fileSchemaOverrides で定義済み。vendor での検証は低優先。

## 判定基準

vendor コードで以下のいずれかが確認できたら **optional** と判定:
- 子オブジェクトの読み込みが `if` 分岐内にあり、なくてもデフォルト値が設定される
- `FindChild` / `FindObject` の戻り値が NULL チェックされてスキップされる
- コメントで「optional」「省略可」的な記述がある

## 修正方法

- `schema-overrides.ts` の該当オブジェクトの `children` に `{ required: false }` を追加
- `npm run gen:schema` でスキーマ再生成
- 既存テスト実行で回帰確認

## 成果物

1. `schema-overrides.ts` の修正（判断できたもの）
2. 判断不能レポート（判断できなかったもの）
