/**
 * Auto-generated hover documentation data.
 * Extracted from RailSim II help documents.
 *
 * Original: Copyright (C) 2003-2009 インターネット停留所
 * License: LGPL v2.1
 *
 * DO NOT EDIT — regenerate with: npx tsx scripts/extract-hover-data.ts
 */

export interface PropertyDoc {
  /** Japanese description of the property */
  description: string;
}

export interface ObjectDoc {
  /** Japanese description of the object/block */
  description: string;
  /** URL to the help page on GitHub Pages */
  helpUrl: string;
  /** Property documentation keyed by property name */
  properties: Record<string, PropertyDoc>;
}

/** Documentation for object blocks (RailInfo, TieInfo, etc.) */
export const objectDocs: Record<string, ObjectDoc> = {
  "RailInfo": {
    "description": "レールプラグインは、線路のレールを表現するために使用されます。",
    "helpUrl": "https://railsim2-support.simochee.net/help/pi_rail.html",
    "properties": {
      "Gauge": {
        "description": "レールのゲージ幅を設定します。狭軌の場合は 1067 [mm] ですので、メートルに直して Gauge = 1.067; と指定します。この値は、カントに対してカーブの内側にあるレールの高さを一定に保つために参照されます。"
      },
      "Height": {
        "description": "レールの高さを指定します。この値は、枕木の y 座標 0.0 を基準とする高度に対して橋脚をどの程度下げて接続するかを決定するために使用されます。"
      },
      "SurfaceAlt": {
        "description": "レールの表面が、線路を敷設する場所の地表からどれだけの高度にあるかを指定します。これにより、枕木の高さによらずレール面の高さが一定になります。"
      },
      "CantRatio": {
        "description": "カントの角度はカーブの曲率半径に反比例し、その比例定数を指定します。単位は [deg・m] です。実際には、次の MaxCant に近付くにつれ指数関数的に収束します。"
      },
      "MaxCant": {
        "description": "カントを付ける場合の最大角度を指定します。"
      },
      "FlattenCant": {
        "description": "レールより下のレイヤにカントの影響を伝えないかどうかを設定します。yes を指定するとカントの影響は除去され、枕木以下橋桁、橋脚には勾配のみが影響するようになります。デフォルト値は no です。"
      },
      "WheelSoundFile": {
        "description": "レールの継ぎ目を車輪が通過した際に鳴らす効果音の .wav ファイルを指定します。この .wav ファイルは、タイミング調整のために先頭に 100 [ms] の無音領域を設けてください。"
      },
      "JointInterval": {
        "description": "上記で指定した音を鳴らすためのレールの継ぎ目の感覚をメートル単位で指定します。"
      },
      "BranchRail": {
        "description": "接続するプラットフォーム端点の番号を 2 個指定します。1 個目の端点にすでに他のレールが接続されている場合、2 個目に指定したプラットフォームが分岐に追加されます。2 個目の端点については、既存の接続は解除されます。端点の番号は rail-connector の場合と同様に指定します。"
      },
      "ConnectRail": {
        "description": "接続するプラットフォーム端点の番号を 2 個指定します。指定した端点にすでに他のレールが接続されている場合、既存の接続は解除されます。端点同士が離れている場合も、実際にレールが作られるわけではありません。転車台などにおいて、レールを動かして端点同士を近づけた際に、その間を列車が通過できるように設定します。いずれかの端点を列車が通過中の場合、その列車が通り過ぎるまで接続は行われません。"
      },
      "DisconnectRail": {
        "description": "接続を解除するプラットフォーム端点の番号を 1 個指定します。端点の番号は rail-connector の場合と同様に指定します。"
      }
    }
  },
  "SoundInfo": {
    "description": "",
    "helpUrl": "https://railsim2-support.simochee.net/help/pi_rail.html",
    "properties": {}
  },
  "TieInfo": {
    "description": "枕木プラグインは、線路の枕木やバラストなどの連続構成物を表現するために使用されます。",
    "helpUrl": "https://railsim2-support.simochee.net/help/pi_tie.html",
    "properties": {
      "Height": {
        "description": "枕木の高さを指定します。"
      },
      "FlattenCant": {
        "description": "枕木より下のレイヤにカントの影響を伝えないかどうかを設定します。yes を指定するとカントの影響は除去され、橋桁、橋脚には勾配のみが影響するようになります。デフォルト値は no です。"
      }
    }
  },
  "GirderInfo": {
    "description": "橋桁プラグインは、高架線路の土台や壁面などの連続構成物を表現するために使用されます。",
    "helpUrl": "https://railsim2-support.simochee.net/help/pi_girder.html",
    "properties": {
      "Height": {
        "description": "橋桁の土台部分の厚さを指定します。"
      },
      "TrackNum": {
        "description": "ひとつの橋桁で何本の線路をカバーするか指定します。デフォルト値は 1 です。"
      },
      "TrackInterval": {
        "description": "TrackNum で 2 以上の値を指定した場合に記述します。2 線以上をカバーする橋桁において、線路の間隔を指定します。"
      },
      "FlattenCant": {
        "description": "橋桁より下のレイヤにカントの影響を伝えないかどうかを設定します。yes を指定するとカントの影響は除去され、橋脚には勾配のみが影響するようになります。デフォルト値は no です。"
      }
    }
  },
  "PierInfo": {
    "description": "橋脚プラグインは、高架線路の橋脚を表現するために使用されます。",
    "helpUrl": "https://railsim2-support.simochee.net/help/pi_pier.html",
    "properties": {
      "TrackNum": {
        "description": "ひとつの橋脚で何本の線路をカバーするか指定します。デフォルト値は 1 です。"
      },
      "TrackInterval": {
        "description": "TrackNum で 2 以上の値を指定した場合に記述します。2 線以上をカバーする橋脚において、線路の間隔を指定します。"
      },
      "Direction": {
        "description": "橋脚の設置方向を指定します。橋脚を地面から線路に向けて設置する場合は up、線路から地面に向けて設置する場合は down を指定します。これは、複数本の橋脚に対し interval を使用して梁を等間隔で配置する場合に、梁の位置を線路と地面どちらを基準に決定するか、などの制御に有効です。デフォルト値は down です。"
      },
      "Interval": {
        "description": "レールの延長方向に対する橋脚の設置間隔を指定します。"
      },
      "Offset": {
        "description": "レールの端点に対し橋脚の設置開始位置をずらしたい場合に、その距離を指定します。デフォルト値は 0.0 です。"
      },
      "BuildMinAlt": {
        "description": "地表に対し線路がどの程度高く設置された場合に橋脚を設置するか指"
      },
      "TaperX, TaperY": {
        "description": "橋脚連続部に、延長方向に対するテーパを設定したい場合に指定します。テーパの値は正値でなければなりません。"
      },
      "TaperZ": {
        "description": "Z 方向のテーパは XY 方向のテーパと若干異なり、interval による等間隔配置オブジェクトを延長方向に伸縮して配置したい場合に指定します。"
      }
    }
  },
  "LineInfo": {
    "description": "架線プラグインは、電化路線の架線を表現するために使用されます。",
    "helpUrl": "https://railsim2-support.simochee.net/help/pi_line.html",
    "properties": {
      "TrolleyAlt": {
        "description": "レール表面に対するトロリ線の高さを指定します。"
      },
      "Height": {
        "description": "トロリ線に対する架線柱支持部の高さを指定します。"
      },
      "MaxInterval": {
        "description": "架線柱の最大間隔を指定します。"
      },
      "Offset": {
        "description": "レールの端点に対し架線の設置開始位置をずらしたい場合に、その距離を指定します。デフォルト値は 0.0 です。"
      },
      "MaxDeflection": {
        "description": "線路の中心に対する架線のずれの最大距離を指定します。この値とカーブの曲率半径等に応じて架線柱による支持間隔を自動的に調節しますが、実際のずれの範囲は必ずしも正確でない可能性があります。"
      }
    }
  },
  "PoleInfo": {
    "description": "架線柱プラグインは、架線を支持する架線柱を表現するために使用されます。",
    "helpUrl": "https://railsim2-support.simochee.net/help/pi_pole.html",
    "properties": {
      "TrackNum": {
        "description": "ひとつの架線柱オブジェクトで何本の線路をカバーするか指定します。デフォルト値は 1 です。"
      },
      "TrackInterval": {
        "description": "TrackNum で 2 以上の値を指定した場合に記述します。2 線以上をカバーする架線柱において、線路の間隔を指定します。"
      },
      "ModelFileName": {
        "description": "使用する *.x ファイルを指定します。"
      },
      "ModelScale": {
        "description": "*.x ファイルのスケールを指定します。デフォルト値は 1.0 です。"
      }
    }
  },
  "TrainInfo": {
    "description": "車輌プラグインは、レール上を走る鉄道車輌を表現するために使用されます。",
    "helpUrl": "https://railsim2-support.simochee.net/help/pi_train.html",
    "properties": {
      "FrontLimit": {
        "description": "車輌の前方連結位置を指定します。車輌の前方がローカル座標系 Z 軸正方向に対応します。"
      },
      "TailLimit": {
        "description": "車輌の後部連結位置を指定します。この値は FrontLimit で指定した値より小さくなければなりません。"
      },
      "MaxVelocity": {
        "description": "車輌の最高速度を [km/h] で指定します。ここで指定する速度や加速度等の物理値は、いずれも規定値の 30FPS でゲームが動作した場合に、ゲーム内のメートル座標系とゲーム外の実時間軸に関して見かけ上そのスペックが得られるようになっているもので、ゲーム内のいわゆるシミュレーション時間軸に関しての加速度等を指示するものではありませんので注意してください。"
      },
      "MaxAcceleration": {
        "description": "車輌の最大加速度を [(km/h)/s] で指定します。(参考) RS1 用車両プラグインについては、3.0 としています。"
      },
      "MaxDeceleration": {
        "description": "車輌の最大減速度を [(km/h)/s] で指定します。(参考) RS1 用車両プラグインについては、4.0 としています。"
      },
      "TiltSpeed": {
        "description": "車輌が振り子機能を使用する場合、振り子の反応速度を指定します。この値は 0.0～1.0 間で指定し、大きい値を指定するほど高速"
      },
      "DoorClosingTime": {
        "description": "車両のドアを閉めるのに要する時間を秒単位で指定します。_DOOR1、_DOOR2 等のスイッチと、static-mover 等のカスタマイザを使用してドア開閉のアニメーションを実装した場合に指定します。"
      },
      "FrontCabin": {
        "description": "前方の運転席の視点位置を指定します。運転席モードで使用されます。省略した場合は車輌前方の適当な位置が指定されます。"
      },
      "TailCabin": {
        "description": "後方の運転席の視点位置を指定します。"
      }
    }
  },
  "StationInfo": {
    "description": "駅舎プラグインは、列車が停車するためのホームを持った駅舎として使用されます。",
    "helpUrl": "https://railsim2-support.simochee.net/help/pi_station.html",
    "properties": {}
  },
  "StructInfo": {
    "description": "施設プラグインは、その他の建物、構造物などを表現するために使用されます。",
    "helpUrl": "https://railsim2-support.simochee.net/help/pi_struct.html",
    "properties": {}
  },
  "SurfaceInfo": {
    "description": "地形プラグインは、レイアウトの土台となる地形を表現するために使用されます。",
    "helpUrl": "https://railsim2-support.simochee.net/help/pi_surface.html",
    "properties": {
      "SizeX": {
        "description": "地形の X 軸 (東西方向) のサイズを指定します。"
      },
      "SizeZ": {
        "description": "地形の Z 軸 (南北方向) のサイズを指定します。"
      }
    }
  },
  "EnvInfo": {
    "description": "環境プラグインは、シーンの背景や天体の動きなどを表現するために使用されます。",
    "helpUrl": "https://railsim2-support.simochee.net/help/pi_env.html",
    "properties": {
      "Latitude": {
        "description": "環境の緯度を指定します。"
      },
      "EnvMapTexFileName": {
        "description": "env-mapper で使用する環境マッピングのテクスチャを指定します。"
      },
      "EnvMap": {
        "description": "環境マップを設定する材質番号を指定します。環境マップは周囲の反射を擬似的に表現するもので、ステンレスなど光沢のある材質を表現するのに使います。環境マップのテクスチャは環境プラグインで指定されたものになります。"
      }
    }
  },
  "Profile": {
    "description": "レール・枕木・橋桁・橋脚・架線の 5 種類を含む。プロファイルプラグインは、連続な断面構造を持ったプラグインを統括する抽象プラグインクラスです。",
    "helpUrl": "https://railsim2-support.simochee.net/help/pi_profile.html",
    "properties": {
      "UseTexture": {
        "description": "テクスチャを使用するかどうか指定します。以下のフィールドはこのオプションを yes に指定した場合のみ記述します。"
      },
      "TexFileName": {
        "description": "テクスチャファイル名を指定します。"
      },
      "TexVPerMeter": {
        "description": "レールなどの延長に対して、メートル当たりテクスチャマッピングの V 座標の変化値を指定します。"
      }
    }
  },
  "Material": {
    "description": "指定された材質番号のアルファ値を変更します。",
    "helpUrl": "https://railsim2-support.simochee.net/help/pi_sym_alpha_changer.html",
    "properties": {
      "ChangeAlpha": {
        "description": "アルファ値を変更する材質番号と、変更後のアルファ値を指定します。変更後のアルファ値には定数のほか、昼間 1.0 となり夕方から夜にかけて徐々に 0.0 となる DayAlpha、その逆で夜間 1.0 となり昼にかけて徐々に 0.0 となる NightAlpha という変数を使用することもできます。なお、DayAlpha + NightAlpha = 1.0 という関係があります。"
      },
      "AlphaZeroTest": {
        "description": "αテストを設定する材質番号を指定します。指定された材質は、テクスチャのα値が 0 であると描画されません。"
      },
      "NoCastShadow": {
        "description": "指定された材質番号のポリゴンは、影を受けますが影を落としません。複雑な形状で小さなポリゴンなど、影を描画するには負荷が高く、影を受けることには問題がないものに対して指定します。"
      },
      "NoReceiveShadow": {
        "description": "指定された材質番号のポリゴンは、影を落としますが影を受けません。自己照明属性を持ったポリゴンなどに対して指定します。"
      },
      "NoShadow": {
        "description": "指定された材質番号のポリゴンは、影を受けず、影を落としません。夜間発光などのために重複して張られたポリゴンなどに対して指定します。"
      },
      "Transparent": {
        "description": "影の投影に関する条件は NoShadow と同じですが、Transparent に指定されたポリゴンは他の全てのポリゴンの後にレンダリングされるという点が異なります。これは、透過属性を持つポリゴンを描画するために使用するためのもので、描画順により透過ポリゴンが他の不透明ポリゴンを見えなくしてしまうことを防止します。また、NoShadow 指定のポリゴンはシステムの影の設定が OFF であれば描画順に影響を与えませんが、Transparent 指定のポリゴンは影の設定に関わらず描画順を後に回します。"
      }
    }
  },
  "DefineAnimation": {
    "description": "texture-animation で作成したアニメーションを指定した材質番号に貼り付けます。",
    "helpUrl": "https://railsim2-support.simochee.net/help/pi_sym_animation_applier.html",
    "properties": {
      "SetAnimation": {
        "description": "アニメーションを適用する材質番号と、texture-animation で定義したアニメーション名を指定します。"
      },
      "Frame": {
        "description": "テクスチャファイル名、初期回転角、フレーム当たりの回転角、回転中心 u, v 座標、フレーム数、フレーム表示時間の順序で指定します。"
      },
      "PreAnimationDelay": {
        "description": "スイッチによりこのカスタマイザが有効になってから、実際に動作を始めるまでの遅延時間を秒単位で指定します。デフォルト値は 0.0 です。"
      },
      "AnimationTime": {
        "description": "実際の動作に要する時間を秒単位で指定します。0.0 を指定すると一瞬で適用されます。デフォルト値は 0.0 です。"
      },
      "PostAnimationDelay": {
        "description": "PreReverseDelay に対応する遅延時間です。他のアニメーションと同期を取るために使用します。デフォルト値は 0.0 です。"
      },
      "PreReverseDelay": {
        "description": "カスタマイザが無効になり、元の状態に戻るための逆動作を始めるまでの遅延時間を秒単位で指定します。デフォルト値は PostAnimationDelay の値です。"
      },
      "ReverseTime": {
        "description": "カスタマイザが無効になり、元の状態に戻るまでに要する時間を秒単位で指定します。デフォルト値は AnimationTime の値です。"
      },
      "PostReverseDelay": {
        "description": "PreAnimationDelay に対応する遅延時間です。他のアニメーションと同期を取るために使用します。デフォルト値は PreAnimationDelay の値です。"
      }
    }
  },
  "Frame": {
    "description": "1 枚の画像からなるアニメーションの単一フレームを定義します。",
    "helpUrl": "https://railsim2-support.simochee.net/help/pi_sym_animation_frame.html",
    "properties": {
      "Frame": {
        "description": "テクスチャファイル名と、このフレームを表示する時間をゲーム内フレーム時間 (1/30 秒単位) で指定します。"
      }
    }
  },
  "NumberedFrame": {
    "description": "複数の連番画像ファイルからなるアニメーションのフレームを定義します。",
    "helpUrl": "https://railsim2-support.simochee.net/help/pi_sym_animation_numbered_frame.html",
    "properties": {
      "Frame": {
        "description": "連番テクスチャファイル名の書式、開始番号、終了番号、フレーム表示時間の順序で指定します。ファイル名の書式については下記を参照してください。"
      },
      "\"img%d.png\"": {
        "description": "\"img0.png\", \"img1.png\", \"img2.png\", ..."
      },
      "\"img%3d.png\"": {
        "description": "\"img  0.png\", \"img  1.png\", \"img  2.png\", ..."
      },
      "\"img%03d.png\"": {
        "description": "\"img000.png\", \"img001.png\", \"img002.png\", ..."
      }
    }
  },
  "Texture": {
    "description": "アニメーションフレームの UV マッピングに座標変換を施します。",
    "helpUrl": "https://railsim2-support.simochee.net/help/pi_sym_animation_texture_transformer.html",
    "properties": {
      "ChangeTexture": {
        "description": "UV 座標を平行移動します。移動する u, v 値の順に指定します。"
      },
      "ScaleTexture": {
        "description": "UV 座標をスケーリングした後で平行移動します。u, v 方向の倍率、移動する u, v 値の順に指定します。"
      },
      "RotateTexture": {
        "description": "UV 座標を指定座標を中心に回転します。反時計回りの回転角度 [deg]、中心 u, v 座標の順に指定します。"
      },
      "TransformTexture": {
        "description": "UV 座標に対する一般の 2D アフィン変換です。パラメータ a11, a12, a13, a21, a22, a23 の順に指定します。変換式を以下に示します。"
      }
    }
  },
  "Axle": {
    "description": "車輌プラグインの車軸を定義します。",
    "helpUrl": "https://railsim2-support.simochee.net/help/pi_sym_axle_object.html",
    "properties": {
      "Axle": {
        "description": "直後にオブジェクト名を書きます。このオブジェクト名は、車軸に車輌本体などを乗せるために参照されます。"
      },
      "Diameter": {
        "description": "この軸の車輪の直径を指定します。ここで指定した直径と車輌の速度に応じて、車輪が回転します。直径を 0.0 に設定した場合、車輪は回転しなくなります。"
      },
      "Symmetric": {
        "description": "車輪オブジェクトの対称性を指定します。例えば、車輪が対称な 8 角形で表現されている場合は Symmetric = 8; と指定します。この指定により、車輪が高速回転した場合にも逆回転して見えることがないように見かけ上の臨界速度が調整されます。対称性がない場合は 1 を指定します。"
      },
      "Coord": {
        "description": "軸の位置を車輌のローカル ZY 座標系で指定します。Z 軸は車輌の前方向、Y 軸は車輌の上方向になります。y 座標値はレールとの接触面を 0.0 とし、通常は車輪の半径を考慮して直径の 1/2 の値を指定します。"
      },
      "WheelSound": {
        "description": "車輪がレールの継ぎ目を通過する際に、レールプラグインで指定された効果音を鳴らすかどうかを設定します。デフォルト値は yes です。"
      }
    }
  },
  "Body": {
    "description": "車輌の台車や本体を構成する基本的なオブジェクトです。",
    "helpUrl": "https://railsim2-support.simochee.net/help/pi_sym_body_object.html",
    "properties": {
      "Body": {
        "description": "直後にオブジェクト名を書きます。このオブジェクト名は、台車に斜体を乗せたり、車体にパンタグラフ等を固定するために参照されます。"
      }
    }
  },
  "Tilt": {
    "description": "body-object において振り子式の車体を設定します。",
    "helpUrl": "https://railsim2-support.simochee.net/help/pi_sym_body_tilt_info.html",
    "properties": {
      "TiltRatio": {
        "description": "カーブのきつさと車輌の速度に対して、どの程度振り子が振れるかを指定します。大体 0.1～10.0 程度のオーダーで指定します。"
      },
      "MaxAngle": {
        "description": "振り子が最大どの程度の角度振れるかを指定します。"
      },
      "BaseAlt": {
        "description": "振り子の回転軸は Z 軸に平行な軸です。この軸の y 座標値を指定します。"
      }
    }
  },
  "PistonZY": {
    "description": "crank-zy のピストン部分を定義します。",
    "helpUrl": "https://railsim2-support.simochee.net/help/pi_sym_crank_slide_zy.html",
    "properties": {
      "Slide": {
        "description": "直後にオブジェクト名を書きます。このオブジェクト名は、他のオブジェクトがこのオブジェクトを親として参照する場合に使用されます。"
      },
      "Direction": {
        "description": "ピストンが動く直線の方向ベクトルを object-joint-zyx で指定したオブジェクトのローカル ZY 座標で指定します。"
      }
    }
  },
  "NormalCursor": {
    "description": "スキンのカーソルに関する情報を定義します。",
    "helpUrl": "https://railsim2-support.simochee.net/help/pi_sym_cursor_info.html",
    "properties": {
      "TexFileName": {
        "description": "カーソルに使用するテクスチャファイル名を指定します。"
      },
      "ImageSize": {
        "description": "画像のサイズをピクセル単位で指定します。"
      },
      "Cursor2DSize": {
        "description": "カーソルのサイズを指定します。デフォルト値は ImageSize です。"
      },
      "Cursor2DHotSpot": {
        "description": "カーソル内のホットスポット (クリック位置) の座標を指定します。"
      },
      "Cursor2DAnimNumber": {
        "description": "アニメーションカーソルのコマ数を指定します。画像には、左上から右方向へ順番にアニメーションのコマが並べられている必要があります。右端へ到達すると下の段へ折り返して並べることができます。デフォルト値は 1 です。"
      },
      "Cursor2DAnimFrame": {
        "description": "アニメーションの各コマを表示するフレーム数を指定します。1 フレームは標準で 1/30 秒になります。Cursor2DAnimNumber の数だけ指定することもできますが、省略すると最後の値で残りを補完します。デフォルト値は各 1 です。"
      },
      "NormalCursor": {
        "description": "通常のカーソルを定義します。"
      },
      "ResizeCursor1": {
        "description": "上下のリサイズ時のカーソルを定義します。"
      },
      "ResizeCursor2": {
        "description": "左下-右上のリサイズ時のカーソルを定義します。"
      },
      "ResizeCursor3": {
        "description": "左右のリサイズ時のカーソルを定義します。"
      },
      "ResizeCursor4": {
        "description": "左上-右下のリサイズ時のカーソルを定義します。"
      }
    }
  },
  "DefineSwitch": {
    "description": "カスタマイザを条件付で適用します。",
    "helpUrl": "https://railsim2-support.simochee.net/help/pi_sym_customizer_switch_applier.html",
    "properties": {
      "ApplySwitch": {
        "description": "直後に条件評価のための式を指定します。式の値が Case に続いて指定された 1 個以上の値のうちのいずれかに一致する場合、: に続いて指定されたカスタマイザを適用します。最後に Default で始まる文を記述すると、他の Case に一致しなかった場合にこの部分が処理されます。C 言語の switch～case ステートメントに類似していますが、break 文のようなものを指定しなくても連続した Case の内容が続けて適用されることはありません。スイッチ番号は線形にスキャンされ、番号の対応する Case が複数あればすべて処理されます。"
      },
      "If": {
        "description": "直後に条件評価のための式を指定します。式の値が 0 以外ならば、続く { } に囲まれたブロックのカスタマイザを適用します。式の値が 0 ならば、Else 以下を指定した場合のみ、Else に続くブロックのカスタマイザを適用します。ApplySwitch は主に直接スイッチの値を参照して評価を行うために使用しますが、If は主に数値の比較結果等を評価するために使用します。If、Else 等のキーワードは大文字で始まることと、中括弧 { } は必須であることに注意します。"
      },
      "DefineSwitch": {
        "description": "直後にスイッチ名を指定します。スイッチ名は、ひとつのプラグイン内で固有のものでなければなりません。スイッチ名には予約されているものもあります。詳しくは下記をご覧ください。"
      },
      "GroupCommon": {
        "description": "車輌プラグインでのみ有効です。ここで指定した識別子が一致するスイッチは、同じ編成の中で共通の値を持ちます。例えば方向幕など、編成の各車輌で共通になるオプションを一括して設定できるようにするために指定します。識別子が同じであれば、異なる車輌プラグインの間でもスイッチの値が共通になります。このとき、スイッチの選択肢の数や意味は、複数の車輌プラグインの間で統一されていなければならないので気をつけてください。"
      },
      "Entry": {
        "description": "スイッチの選択肢を列挙します。初期選択肢は最初に定義されたものになります。"
      },
      "\"_FRONT\"": {
        "description": "車輌プラグインでのみ有効です。車輌の前方 (Z 軸正方向) が進行方向と一致していれば 0、それ以外は 1 となります。"
      },
      "\"_CONNECT1\"": {
        "description": "車輌プラグインでのみ有効です。車輌の前方に別の車輌が連結されていれば 1、それ以外は 0 となります。"
      },
      "\"_CONNECT2\"": {
        "description": "同じく、車輌の後方に別の車輌が連結されていれば 1、それ以外は 0 となります。"
      },
      "\"_DOOR1\"": {
        "description": "車輌プラグインでのみ有効です。車輌の Z 軸正方向を前方とし、列車がホームに停車して左側のドアを開くことを示します。そのとき左側のドアを開くべきなら 1、そうでなければ 0 となります。このスイッチと static-mover 等のカスタマイザを使用してドア開閉のアニメーションを作ることができます。"
      },
      "\"_DOOR2\"": {
        "description": "同じく、右側のドアを開くべきなら 1、そうでなければ 0 となります。"
      },
      "\"_SERIAL\"": {
        "description": "車輌プラグインと地形プラグインでのみ有効です。車輌プラグインの場合はその車輌が属する編成の番号、地形プラグインの場合はその地形が使われているシーンの番号がセットされます。番号は 1 からではなく 0 から数えられます。"
      },
      "\"_CAMDIST\"": {
        "description": "視野角 45°における、視点からユニットまでの距離に相当する値がメートル単位でセットされます。小数点以下は四捨五入されます。この値は、オブジェクトがある程度視点から離れた場合に、簡単なモデルに切り替えることで軽量化を図るために使用できます。視野角が x = 45°の場合は視点からの距離そのものになりますが、視野角が狭くなるほど tan(x/2) に比例して値は小さくなり、画面上の見かけの大きさにほぼ比例する値となります。距離の基準となる座標はプラグイン内の個々のオブジェクトではなく、例えば施設の場合は施設を設置した座標というように、ユニットごとに共通の値となります。"
      },
      "\"_VELOCITY\"": {
        "description": "車輌プラグインでのみ有効です。そのときの車輌の速度がセットされます。単位は [km/h] です。値は進行方向に関わらず正となります。小数点以下は四捨五入されます。"
      },
      "\"_ACCEL\"": {
        "description": "車輌プラグインでのみ有効です。そのときの車輌の加減速度がセットされます。単位は [m/h/s] です。値は加速時は正、減速時は負となります。小数点以下は四捨五入されます。"
      },
      "\"_CABINVIEW\"": {
        "description": "車輌プラグインでのみ有効です。その車輌で運転席視点モードが有効になっているとき 1 がセットされます。それ以外は 0 になります。運転台を表現する場合等に使用します。"
      },
      "\"_APPROACH1\"": {
        "description": "駅舎プラグインでのみ有効です。プラットフォームに、プラットフォームが定義された方向と同じ方向に列車が停車・通過・接近している場合に、プラットフォーム番号に対応するビットが 1 になります。Stoppable で停車できないように設定されたプラットフォームにも対応します。スイッチは 32 ビットなので、32 本のプラットフォームまでしか調べられません。例えば、5 番目のプラットフォームに定義と同じ方向に列車が接近しているかどうかを調べるには、(\"_APPROACH1\">>4)&1 とします。列車が「接近している」の定義は、その列車の減速度でその位置・速度から停車できる最小範囲にプラットフォームが入っていること、になります。このスイッチは、停車できないプラットフォームを使って踏切を作る場合などに利用できます。"
      },
      "\"_APPROACH2\"": {
        "description": "上と同様に、プラットフォームが定義された方向と逆の方向に列車が停車・通過・接近している場合に、プラットフォーム番号に対応するビットが 1 になります。例えば、7 番目のプラットフォームにいずれかの方向から列車が接近しているかどうかを調べるには、((\"_APPROACH1\"|\"_APPROACH2\")>>6)&1 とします。"
      },
      "\"_STOPPING\"": {
        "description": "上と同じく、プラットフォームに列車が停車しているかどうかが設定されます。停車と見なされるのはドアを開き始めるタイミングからドアを閉じ始めるタイミングまでですので、プラットフォーム側にもドアを設けたい場合に使用できます。ただし、この場合編成の車輌数やドア間隔などの調整が重要です。このスイッチのビットが 1 ならば、\"_APPROACH1\", \"_APPROACH2\" のいずれかのうち対応するビットも必ず 1 になります。"
      },
      "\"_NIGHT\"": {
        "description": "現在の時刻が昼なら 0、夜なら 1 になります。"
      },
      "\"_WEATHER\"": {
        "description": "現在の天気を示すスイッチとなる予定です (未実装)。"
      },
      "\"_SEASON\"": {
        "description": "現在の季節が春 (3～5 月) なら 0、夏 (6～8 月) なら 1、秋 (9～11 月) なら 2、冬 (12～2 月) なら 3 になります。なお、環境プラグインの設定により緯度が負に設定されている場合、つまり南半球では季節が逆転します。"
      },
      "\"_SHADOW\"": {
        "description": "システムのオプション設定で影が ON になっていれば 1、それ以外は 0 となります。プラグイン側のテクスチャの影の表現を、システムによる影が OFF の場合のみ有効にしたい場合などに使用します。"
      },
      "\"_ENVMAP\"": {
        "description": "システムのオプション設定で環境マッピングが ON になっていれば 1、それ以外は 0 となります。プラグイン側のテクスチャの反射の表現を、システムによる環境マッピングが OFF の場合のみ有効にしたい場合などに使用します。"
      },
      "\"_YEAR\"": {
        "description": "ゲーム内の年がセットされます。"
      },
      "\"_MONTH\"": {
        "description": "ゲーム内の月がセットされます。"
      },
      "\"_DAY\"": {
        "description": "ゲーム内の日がセットされます。"
      },
      "\"_DAYOFWEEK\"": {
        "description": "ゲーム内の曜日がセットされます。日、月、火…が 0、1、2…に対応します。"
      },
      "\"_HOUR\"": {
        "description": "ゲーム内の時がセットされます。"
      },
      "\"_MINUTE\"": {
        "description": "ゲーム内の分がセットされます。"
      },
      "\"_SECOND\"": {
        "description": "ゲーム内の秒がセットされます。"
      }
    }
  },
  "DynamicRotation": {
    "description": "対象オブジェクトを動的に回転します。",
    "helpUrl": "https://railsim2-support.simochee.net/help/pi_sym_dynamic_rotator.html",
    "properties": {
      "RotationAxis": {
        "description": "回転軸をオブジェクトのローカル座標系で指定します。デフォルト値は Z 軸になります。"
      },
      "RotationSpeed": {
        "description": "回転速度を [rps] で指定します。負値を指定すると逆回転になります。"
      },
      "Acceleration": {
        "description": "回転速度の加速度を [rps/s] で指定します。RotationSpeed の正負に関わらず正値で指定します。省略すると一瞬で最高速度になります。"
      },
      "Deceleration": {
        "description": "回転速度の減速度を [rps/s] で指定します。RotationSpeed の正負に関わらず正値で指定します。省略すると一瞬で停止します。"
      }
    }
  },
  "Landscape": {
    "description": "環境プラグインの背景地形に関する定義を行います。",
    "helpUrl": "https://railsim2-support.simochee.net/help/pi_sym_env_landscape_info.html",
    "properties": {
      "ModelFileName": {
        "description": "オブジェクトの *.x ファイルを指定します。"
      },
      "ModelScale": {
        "description": "*.x ファイルを使用する際のスケールを設定します。デフォルト値は 1.0 です。"
      }
    }
  },
  "Lighting": {
    "description": "環境プラグインのシーン全体のライティングに関する設定を行います。",
    "helpUrl": "https://railsim2-support.simochee.net/help/pi_sym_env_lighting.html",
    "properties": {
      "NightThreshold": {
        "description": "夜と昼を切り替える太陽の高さを指定します。太陽の高さは、地面となす角のコサインの値で表されます。つまり、-1.0～1.0 の間で指定します。"
      },
      "ShadowColor": {
        "description": "影の色を指定します。夕方や早朝は影が自動的に薄くなります。"
      },
      "SunAlt": {
        "description": "対応する太陽の高さを指定します。太陽の高さは、地面となす角のコサインの値で表されます。つまり、-1.0～1.0 の間で指定します。"
      },
      "Directional": {
        "description": "平行光源の色を指定します。"
      },
      "Ambient": {
        "description": "環境光の色を指定します。"
      },
      "SkyColor": {
        "description": "空の色を指定します。"
      }
    }
  },
  "Moon": {
    "description": "環境プラグインの月に関する定義を行います。",
    "helpUrl": "https://railsim2-support.simochee.net/help/pi_sym_env_moon_info.html",
    "properties": {
      "ModelFileName": {
        "description": "オブジェクトの *.x ファイルを指定します。"
      },
      "ModelScale": {
        "description": "*.x ファイルを使用する際のスケールを設定します。デフォルト値は 1.0 です。"
      },
      "AxialInclination": {
        "description": "地軸の傾きの角度を指定します。"
      },
      "RevolutionPeriod": {
        "description": "公転周期を日単位で設定します。"
      },
      "InitialPhase": {
        "description": "初期位相を日単位で設定します。複数の月を作って位相を変えたい場合などに指定します。"
      }
    }
  },
  "Sun": {
    "description": "環境プラグインの太陽に関する定義を行います。",
    "helpUrl": "https://railsim2-support.simochee.net/help/pi_sym_env_sun_info.html",
    "properties": {
      "ModelFileName": {
        "description": "オブジェクトの *.x ファイルを指定します。"
      },
      "ModelScale": {
        "description": "*.x ファイルを使用する際のスケールを設定します。デフォルト値は 1.0 です。"
      },
      "AxialInclination": {
        "description": "地軸の傾きの角度を指定します。"
      }
    }
  },
  "Headlight": {
    "description": "ヘッドライトのレンズフレア・エフェクトを定義します。",
    "helpUrl": "https://railsim2-support.simochee.net/help/pi_sym_headlight_applier.html",
    "properties": {
      "AttachObject": {
        "description": "固定先のオブジェクト名を指定します。オブジェクト名は object-3d や body-object で定義されたものです。"
      },
      "SourceCoord": {
        "description": "固定先オブジェクトのローカル座標で、固定位置を指定します。"
      },
      "Direction": {
        "description": "固定先オブジェクトのローカル座標で、ライトの方向を指定します。"
      },
      "MaxDistance": {
        "description": "フレアが表示される最大距離を指定します。"
      }
    }
  },
  "Interval": {
    "description": "プロファイルプラグインの等間隔配置オブジェクト定義です。",
    "helpUrl": "https://railsim2-support.simochee.net/help/pi_sym_interval.html",
    "properties": {
      "IgnoreCant": {
        "description": "配置するオブジェクトの姿勢が線路のカントによる影響を無視するかどうか設定します。デフォルト値は no です。"
      },
      "ModelFileName": {
        "description": "等間隔で配置するオブジェクトの *.x ファイルを指定します。"
      },
      "ModelScale": {
        "description": "*.x ファイルを使用する際のスケールを設定します。デフォルト値は 1.0 です。"
      },
      "Interval": {
        "description": "オブジェクトの配置間隔を設定します。"
      },
      "Offset": {
        "description": "別々のオブジェクトを交互に配置する場合などに、配置位置の相対的なずれを設定します。デフォルト値は 0.0 です。"
      }
    }
  },
  "LensFlare": {
    "description": "レンズフレアのパターンを定義します。",
    "helpUrl": "https://railsim2-support.simochee.net/help/pi_sym_lens_flare.html",
    "properties": {
      "StartAngle": {
        "description": "光源方向に対し、フレアの描画を始める視線方向の角度を指定します。"
      },
      "Twinkle": {
        "description": "フレアの点滅の度合いを 0.0～1.0 で指定します。デフォルト値は 0.0 です。"
      },
      "Inclination": {
        "description": "環境プラグインで使用します。太陽の方向と視線方向のずれに対し、フレアの並びをどの程度ずらすかを指定します。0.0～1.0 程度の値が適切です。環境プラグイン以外では指定する必要はありません。デフォルト値は 0.0 です。"
      }
    }
  },
  "ChangeMaterial": {
    "description": "特定の材質に対して環境マッピングを設定します。",
    "helpUrl": "https://railsim2-support.simochee.net/help/pi_sym_material_changer.html",
    "properties": {
      "MaterialID": {
        "description": "材質を変更する材質番号を指定します。"
      },
      "Diffuse": {
        "description": "拡散光の色を RGBA の順に実数値で指定します。16 進指定の際は ARGB の順番ですが、ここではα値が最後になっているので気をつけてください。α値だけを変更するには alpha-changer が便利です。なお、各オプションを省略した場合は *.x ファイルで定義されている値が使用されます。"
      },
      "Ambient": {
        "description": "環境光の色を RGB の順に実数値で指定します。Diffuse 以外はα値は指定しません。*.x ファイルから材質が読み込まれた時点では、自動的に環境光を拡散光と同じに設定しています。環境光と拡散光を別の色に設定したい場合は、この機能により明示的に変更する必要があります。逆に、この機能で拡散光を変更した場合、ほとんどの場合は環境光も同じ色に変更する必要があるので注意してください。"
      },
      "Specular": {
        "description": "鏡面反射光の色を RGB の順に実数値で指定します。"
      },
      "Emissive": {
        "description": "自己発光の色を RGB の順に実数値で指定します。"
      },
      "Power": {
        "description": "鏡面反射光の強さを実数値で指定します。"
      }
    }
  },
  "Model": {
    "description": "オブジェクトに使用する *.x ファイルを差し替えます。",
    "helpUrl": "https://railsim2-support.simochee.net/help/pi_sym_model_changer.html",
    "properties": {
      "ChangeModel": {
        "description": "差し替える *.x ファイル、差し替え後のスケールを設定します。"
      },
      "ArrowModelFileName": {
        "description": "線路設置時の 3D 矢印モデルを指定します。"
      },
      "ArrowModelScale": {
        "description": "その読込スケール。"
      },
      "LinkModelFileName": {
        "description": "線路接続字のインディケータの 3D 矢印モデルを指定します。"
      },
      "LinkModelScale": {
        "description": "その読込スケール。"
      },
      "SegmentModelFileName": {
        "description": "線路の分割範囲を示すインディケータのモデルを指定します。"
      },
      "SegmentModelScale": {
        "description": "その読込スケール。"
      },
      "CompassModelFileName": {
        "description": "コンパスに使用するモデルを目盛りと磁針の 2 個指定します。"
      },
      "CompassModelScale": {
        "description": "その読込スケール。"
      },
      "WindDirModelFileName": {
        "description": "風速計に使用する 3D 矢印のモデルを指定します。"
      },
      "WindDirModelScale": {
        "description": "その読込スケール。"
      }
    }
  },
  "Object3D": {
    "description": "モデルプラグインで使用される *.x ファイル単位のオブジェクトを定義します。",
    "helpUrl": "https://railsim2-support.simochee.net/help/pi_sym_named_object_info.html",
    "properties": {
      "ModelFileName": {
        "description": "オブジェクトの *.x ファイルを指定します。"
      },
      "ModelScale": {
        "description": "*.x ファイルを使用する際のスケールを設定します。デフォルト値は 1.0 です。"
      },
      "Turn": {
        "description": "車輌プラグイン内の object-3d 以外のフィールドでのみ有効です。車輌プラグインでは、車輌の側面にあたるローカル座標系の ZY 平面を基準として各種オブジェクトの配置を行います。このため、オブジェクトの 2 点指定では上下 (*.x ファイルの Y 軸) が確定しません。オブジェクトの配置において上下が逆転してしまった場合はこの指定を切り替えてください。デフォルト値は no です。"
      },
      "CastShadow": {
        "description": "オブジェクトが影を落とすかどうかを指定します。デフォルト値は地形プラグインでは no、他のプラグインでは yes となります。材質単位で影の制御を行ったり、陰の影響を受けないようにするためには shadow-inhibitor カスタマイザを使用してください。"
      },
      "Object3D": {
        "description": "直後にオブジェクト名を書きます。このオブジェクト名は、他のオブジェクトがこのオブジェクトを親として参照する場合に使用されます。"
      }
    }
  },
  "Joint3D": {
    "description": "object-3d などの固定位置を指定します。",
    "helpUrl": "https://railsim2-support.simochee.net/help/pi_sym_object_joint_3d.html",
    "properties": {
      "JointZY": {
        "description": "直後に固定先のオブジェクト名を指定します。オブジェクト名は axle-object や body-object で定義されたものです。"
      },
      "AttachCoord": {
        "description": "固定先オブジェクトのローカル座標で、固定位置を指定します。"
      },
      "LocalCoord": {
        "description": "上で指定した固定位置に対応する、現在定義中のオブジェクトのローカル ZY 座標を指定します。"
      },
      "DirLink": {
        "description": "方向ベクトルの基準となるオブジェクト名を指定します。省略した場合は、位置の基準オブジェクトが使用されます。"
      },
      "AttachDir": {
        "description": "オブジェクトの方向ベクトルを、方向ベクトルの基準オブジェクトのローカル座標系で指定します。省略した場合は Z 軸正方向になります。"
      },
      "UpLink": {
        "description": "アップベクトルの基準となるオブジェクト名を指定します。省略した場合は、位置の基準オブジェクトが使用されます。"
      },
      "AttachUp": {
        "description": "オブジェクトのアップベクトルを、アップベクトルの基準オブジェクトのローカル座標系で指定します。省略した場合は Y 軸正方向になります。"
      },
      "_WORLD": {
        "description": "そのシーンにおけるワールド座標系です。通常地形の中心を原点とし、Z 軸正方向を北、Y 軸正方向を鉛直方向にとります。"
      },
      "_LOCAL": {
        "description": "施設プラグインや駅舎プラグインにおいては、プラグインが設置された位置と方向を基準とする座標系で、最初のオブジェクトを設置するための一般的な基準となります。地形プラグインにおいてはワールド座標系と一致します。車輌プラグインにおいては、一番前の車軸と一番後ろの車軸の中間位置を基準とする座標系になりますが、あまり使用することはないと思われます。"
      },
      "_CAMERA": {
        "description": "カメラの座標系に一致します。ビルボードなどを実現できるようになります。ただし、現バージョンではこの設定によりリンクされるカメラ座標系は実際のレンダリングより1フレーム遅延します。"
      },
      "_LIGHT": {
        "description": "平行光源の座標系に一致します。方向のみ有効です。"
      }
    }
  },
  "JointZY": {
    "description": "body-object の固定位置を指定します。",
    "helpUrl": "https://railsim2-support.simochee.net/help/pi_sym_object_joint_zy.html",
    "properties": {
      "JointZY": {
        "description": "直後に固定先のオブジェクト名を指定します。オブジェクト名は axle-object や body-object 等で定義されたものです。"
      },
      "AttachCoord": {
        "description": "固定先オブジェクトのローカル ZY 座標で、固定位置を指定します。"
      },
      "LocalCoord": {
        "description": "上で指定した固定位置に対応する、現在定義中のオブジェクトのローカル ZY 座標を指定します。"
      }
    }
  },
  "JointZYX": {
    "description": "object-zy 等の固定位置を指定します。",
    "helpUrl": "https://railsim2-support.simochee.net/help/pi_sym_object_joint_zyx.html",
    "properties": {
      "JointZY": {
        "description": "直後に固定先のオブジェクト名を指定します。オブジェクト名は axle-object や body-object 等で定義されたものです。"
      },
      "AttachX": {
        "description": "固定先オブジェクトのローカル X 座標を指定します。"
      },
      "AttachCoord": {
        "description": "固定先オブジェクトのローカル ZY 座標で、固定位置を指定します。"
      },
      "LocalCoord": {
        "description": "上で指定した固定位置に対応する、現在定義中のオブジェクトのローカル ZY 座標を指定します。"
      }
    }
  },
  "ObjectZY": {
    "description": "車輌プラグインにおいて、任意の 2 点を結ぶようなオブジェクトを配置します。",
    "helpUrl": "https://railsim2-support.simochee.net/help/pi_sym_object_zy.html",
    "properties": {
      "ObjectZY": {
        "description": "直後にオブジェクト名を書きます。このオブジェクト名は、他のオブジェクトがこのオブジェクトを親として参照する場合に使用されます。"
      },
      "FixPosition": {
        "description": "接続する 2 点のうち、位置の決定においてどちらを重視するかを 0.0～1.0 の値で指定します。0.0 の場合は 1 点目、1.0 の場合は 2 点目を重視ます。デフォルト値は 0.5 です。"
      },
      "FixRight": {
        "description": "上と同様に、接続する 2 点のうち、方向の決定においてどちらを重視するかを 0.0～1.0 の値で指定します。デフォルト値は FixPosition です。"
      }
    }
  },
  "Particle": {
    "description": "煙や噴水などのパーティクル (粒子) エフェクトを定義します。",
    "helpUrl": "https://railsim2-support.simochee.net/help/pi_sym_particle_applier.html",
    "properties": {
      "TextureFileName": {
        "description": "パーティクルの表現に使用するテクスチャファイルを指定します。"
      },
      "AttachObject": {
        "description": "固定先のオブジェクト名を指定します。オブジェクト名は object-3d や body-object で定義されたものです。"
      },
      "SourceCoord": {
        "description": "固定先オブジェクトのローカル座標で、パーティクルの生成位置を指定します。"
      },
      "MinQty": {
        "description": "単位時間当たりのパーティクル最小発生数 [個/s] を指定します。"
      },
      "MaxQty": {
        "description": "単位時間当たりのパーティクル最大発生数 [個/s] を指定します。以下の各種比例成分を指定した場合に、単位時間当たりの発生個数の上限を設定します。デフォルト値は MinQty です。"
      },
      "VelocityRel": {
        "description": "単位時間当たりのパーティクル発生数の、発生源の移動速度に比例した成分 [(個/s)/(km/h)] を指定します。デフォルト値は 0.0 です。"
      },
      "AccelerationRel": {
        "description": "単位時間当たりのパーティクル発生数の、発生源の加速度に比例した成分 [(個/s)/(km/h/s)] を指定します。加速度は常に正または 0 で、減速中の加速度は 0.0 となります。蒸気機関車の煙の量等を制御するのに使用します。デフォルト値は 0.0 です。"
      },
      "DecelerationRel": {
        "description": "単位時間当たりのパーティクル発生数の、発生源の減速度に比例した成分 [(個/s)/(km/h/s)] を指定します。減速度は常に正または 0 で、加速中の減速度は 0.0 となります。ブレーキの火花等を制御するのに使用します。デフォルト値は 0.0 です。"
      },
      "Lifetime": {
        "description": "パーティクルの寿命の最大値と最小値を秒単位で指定します。寿命はパーティクルごとに最小値と最大値の間でランダムに決定されます。"
      },
      "Direction": {
        "description": "パーティクルの初期速度ベクトルの最小値と最大値を設置先オブジェクトのローカル座標系で指定します。"
      },
      "InitialRadius": {
        "description": "パーティクルの初期サイズの最小値と最大値を指定します。"
      },
      "FinalRadius": {
        "description": "パーティクルの最終サイズの最小値と最大値を指定します。"
      },
      "Color": {
        "description": "パーティクルの色の変化範囲を指定します。パーティクルの色はここで指定した 2 色の間でランダムに決定されます。この機能を使えば、白いテクスチャ画像だけを用意しておけば、同じ形ならこのパラメタを変えるだけでどんな色のパーティクルも表現できます。"
      },
      "BlendMode": {
        "description": "テクスチャ画像の描画モードを指定します。Alpha の場合は半透明合成、Add の場合は加算合成になります。加算合成は火花など発光粒子を表現するために使用します。"
      },
      "AirResistance": {
        "description": "空気抵抗を 0.0～1.0 の間で指定します。この値は 1 秒間に粒子の速度が何倍になるかを表します。空気抵抗が大きいほど、速度の減衰具合や風の影響を受けやすくなります。デフォルト値は 0.0 です。"
      },
      "Gravity": {
        "description": "実効重力加速度を [m/s^2] で指定します。デフォルト値は 0.0 です。"
      },
      "Turbulence": {
        "description": "乱気流の影響を指定します。この数値が大きいほど、速度ベクトルがランダムに変化します。デフォルト値は 0.0 です。"
      }
    }
  },
  "Base": {
    "description": "橋脚プラグインの橋脚底部を定義します。",
    "helpUrl": "https://railsim2-support.simochee.net/help/pi_sym_pier_base_info.html",
    "properties": {
      "ModelFileName": {
        "description": "使用する *.x ファイルを指定します。"
      },
      "ModelScale": {
        "description": "*.x ファイルのスケールを指定します。デフォルト値は 1.0 です。"
      },
      "BaseToPierLocal": {
        "description": "橋脚底部に対して橋脚連続部下端をどの位置に配置するかを、橋脚底部オブジェクトのローカル座標系で指定します。"
      }
    }
  },
  "Head": {
    "description": "橋脚プラグインの橋脚頭部を定義します。",
    "helpUrl": "https://railsim2-support.simochee.net/help/pi_sym_pier_head_info.html",
    "properties": {
      "ModelFileName": {
        "description": "使用する *.x ファイルを指定します。"
      },
      "ModelScale": {
        "description": "*.x ファイルのスケールを指定します。デフォルト値は 1.0 です。"
      },
      "HeadToPierLocal": {
        "description": "橋脚頭部に対して橋脚連続部上端をどの位置に配置するかを、橋脚頭部オブジェクトのローカル座標系で指定します。"
      }
    }
  },
  "Joint": {
    "description": "橋脚プラグインの線路支持部を定義します。",
    "helpUrl": "https://railsim2-support.simochee.net/help/pi_sym_pier_joint_info.html",
    "properties": {
      "ModelFileName": {
        "description": "使用する *.x ファイルを指定します。"
      },
      "ModelScale": {
        "description": "*.x ファイルのスケールを指定します。デフォルト値は 1.0 です。"
      },
      "JointToHeadLocal": {
        "description": "支持部に対して橋脚頭部をどの位置に配置するかを、支持部オブジェクトのローカル座標系で指定します。"
      }
    }
  },
  "Platform": {
    "description": "駅舎プラグインにプラットフォームを定義します。",
    "helpUrl": "https://railsim2-support.simochee.net/help/pi_sym_platform.html",
    "properties": {
      "TrackNum": {
        "description": "複線用のプラグインを用いて 2 本以上のプラットフォームを同時に設置したい場合に指定します。デフォルト値は 1 です。"
      },
      "TrackInterval": {
        "description": "TrackNum で 2 以上の値を指定した場合に記述します。2 線以上同時に設置する場合の、線路の間隔を指定します。"
      },
      "Stoppable": {
        "description": "このプラットフォームに列車が停車可能かどうかを指定します。no を指定した場合、ダイヤ設定にかかわらず、列車はこのプラットフォームに停車せず通過します。デフォルト値は yes です。"
      },
      "OpenDoor": {
        "description": "列車がこのプラットフォームに停車した場合、どちら側のドアを開けるか指定します。2 個の値は、それぞれ Coord で指定する最初の座標を始点、最後の座標を終点として、始点から終点を見た場合の左側、右側のドアを開けるかどうかに対応します。列車が入ってきた方向が基準ではないので注意してください。省略した場合いずれも no になります。"
      },
      "RailPlugin": {
        "description": "プラットフォームの設置に使用するレールプラグインを指定します。省略した場合は、直前に指定されたものと同じレールプラグインか、それがなければそのとき選択されているレールプラグインが使用されます。RailPlugin = \"\"; のように空白を指定すると、レールプラグインを使用しないことになります。省略するのと空白を指定するのでは動作が異なるので注意してください。省略した場合や空白を指定した場合等の動作は以下同様になります。"
      },
      "TiePlugin": {
        "description": "プラットフォームの設置に使用する枕木プラグインを指定します。"
      },
      "GirderPlugin": {
        "description": "プラットフォームの設置に使用する橋桁プラグインを指定します。"
      },
      "PierPlugin": {
        "description": "プラットフォームの設置に使用する橋脚プラグインを指定します。"
      },
      "LinePlugin": {
        "description": "プラットフォームの設置に使用する架線プラグインを指定します。"
      },
      "PolePlugin": {
        "description": "プラットフォームの設置に使用する架線柱プラグインを指定します。"
      },
      "LiftRailSurface": {
        "description": "以下で指定する座標に対し、レールプラグインの SurfaceAlt で指定されたレール表面の高度分を加えるかどうか設定します。レールプラグインが選択されていない場合は枕木プラグインと橋桁プラグインの Height で指定された高さを加算した値にが使用されます。デフォルト値は yes です。"
      },
      "EnableCant": {
        "description": "カーブしたプラットフォームを設置する場合に、カントを有効にするかどうか指定します。デフォルト値は yes です。"
      },
      "ParentObject": {
        "description": "転車台などにおいて、プラットフォームをオブジェクトに連動して動かしたい場合、連動させるオブジェクト名を指定します。"
      },
      "Coord": {
        "description": "プラットフォームを設置するための制御点の座標を、駅舎のローカル座標系で 2 個以上指定します。線路設置モードでマウスにより設置するのと同じ感覚です。3 点以上指定するとカーブを設置できます。"
      }
    }
  },
  "PluginHeader": {
    "description": "プラグインのヘッダ情報を定義します。",
    "helpUrl": "https://railsim2-support.simochee.net/help/pi_sym_plugin_header.html",
    "properties": {
      "RailSimVersion": {
        "description": "そのプラグインが対応する RailSim のバージョンを指定します。通常、そのプラグインが作成された時点での RailSim の最新バージョンを指定します。例えば、Version 2.00 の場合は RailSimVersion = 2.00; と書きます。"
      },
      "PluginType": {
        "description": "プラグインタイプを指定します。プラグインタイプはプラグインクラスの図に ( ) で示された英単語です。大文字と小文字は区別されます。"
      },
      "PluginName": {
        "description": "プラグイン名を指定します。"
      },
      "PluginAuthor": {
        "description": "プラグインの作者名を指定します。"
      },
      "IconTexture": {
        "description": "ツリービューで使用されるプラグインのアイコン画像ファイルを指定します。画像ファイルは BMP や PNG 等 DirectX がサポートする画像フォーマットである必要があります。Windows 用アイコンファイル (*.ico) は使用できません。省略した場合はスキンで定義されたデフォルトアイコンが使用されます。アンチエイリアスはかかりませんので、16*16 ちょうどの画像を使用すると最も綺麗に表示されます。"
      },
      "IconRect": {
        "description": "通常は IconTexture で指定された画像全体をアイコンとして使用しますが、テクスチャファイルの余った部分をアイコンに使いたい場合などに、アイコンとして使用する領域の左上 UV 座標と UV サイズを指定します。ピクセル単位ではないので注意してください。"
      },
      "Description": {
        "description": "プラグイン選択時に表示される説明文を入力します。長い文字列は自動的に折り返されますが、Description を複数指定すればその間は強制的に改行されます。"
      }
    }
  },
  "Vertex": {
    "description": "断面の頂点を定義します。",
    "helpUrl": "https://railsim2-support.simochee.net/help/pi_sym_profile_vertex.html",
    "properties": {
      "IgnoreCant": {
        "description": "カントの影響を無視するかどうか指定します。バラストの底辺など、カントの影響を無視すべき頂点で yes を指定します。デフォルト値は no です。"
      },
      "Normal": {
        "description": "頂点における法線方向を指定します。省略した場合、隣接する頂点座標から自動的に計算されます。"
      },
      "Diffuse": {
        "description": "頂点におけるポリゴンの色を指定します。デフォルト値は #ffffffff です。"
      },
      "TexU": {
        "description": "profile でUseTexture = yes; を指定した場合のみ記述します。頂点のテクスチャマッピング U 座標値を指定します。"
      }
    }
  },
  "Background": {
    "description": "スキンの画面背景に関する定義です。",
    "helpUrl": "https://railsim2-support.simochee.net/help/pi_sym_skin_background_info.html",
    "properties": {
      "UseWallpaper": {
        "description": "プラグイン選択画面等の背景に壁紙画像を使用するかどうか指定します。"
      },
      "TexFileName": {
        "description": "壁紙を使用する場合、画像ファイル名を指定します。"
      },
      "ImageSize": {
        "description": "壁紙を使用する場合、画像サイズを指定します。"
      },
      "BackgroundColor": {
        "description": "壁紙を指定しない場合、背景色を指定します。"
      }
    }
  },
  "EditCtrl": {
    "description": "スキンのエディットボックスに関する定義です。",
    "helpUrl": "https://railsim2-support.simochee.net/help/pi_sym_skin_editctrl_info.html",
    "properties": {
      "DefaultFontColor": {
        "description": "フォーカスがない時のフォント色を指定します。"
      },
      "EditBaseColor": {
        "description": "編集中の背景色を指定します。1 個指定すると塗りつぶし、4 個指定すると、左上、右上、右下、左下の順で長方形領域をグラデーションにすることができます。これは以下で 1 個または 4 個色を指定する場合にも同様になります。"
      },
      "EditFontColor": {
        "description": "フォーカス時の編集中フォント色を指定します。"
      },
      "ConvertFontColor": {
        "description": "変換中のフォント色を指定します。"
      },
      "ConvertClauseColor": {
        "description": "変換文節を示す下線の色を、通常部分と変換対象部分の 2 個指定します。"
      },
      "SelectedBaseColor": {
        "description": "選択部分の背景色を指定します。"
      }
    }
  },
  "Interface": {
    "description": "スキンのフレームインターフェイスに関する定義です。",
    "helpUrl": "https://railsim2-support.simochee.net/help/pi_sym_skin_frame_info.html",
    "properties": {
      "FrameTexFileName": {
        "description": "フレームに使用するテクスチャのファイル名を指定します。画像はサンプルを参考に作成してください。"
      },
      "IconTexFileName": {
        "description": "フレームのアイコンに使用するテクスチャのファイル名を指定します。アイコンファイルは線路、車輌、駅舎、施設、シーン、システムの各グループに分けて指定します。サンプルを参考にしてください。"
      },
      "LabelFontColor": {
        "description": "フレームの上部パネルに表示される現在のモード名のフォント色を指定します。"
      },
      "InfoFontColor": {
        "description": "フレームの上部パネルに表示される FPS 等のフォント色を指定します。"
      },
      "FloatFontColor": {
        "description": "画面右下に表示される、アイコンをポイントした際の説明のフォント色を指定します。"
      },
      "TexFileName": {
        "description": "スキンに使用するテクスチャのファイル名を指定します。画像はサンプルを参考に作成してください。"
      },
      "FontName": {
        "description": "全体で使用するフォント名を指定します。"
      },
      "TitleBarFontColor": {
        "description": "内部のウィンドウタイトルバーのフォント色を指定します。"
      },
      "ButtonFontColor": {
        "description": "ボタンのフォント色を指定します。"
      },
      "StaticFontColor": {
        "description": "ウィンドウ内の文字列のフォント色を指定します。"
      },
      "FocusFrameColor": {
        "description": "コントロールにフォーカスがある時の枠の色を指定します。"
      }
    }
  },
  "ListView": {
    "description": "スキンのリストビューに関する定義です。",
    "helpUrl": "https://railsim2-support.simochee.net/help/pi_sym_skin_listview_info.html",
    "properties": {
      "DefaultBaseColorOdd": {
        "description": "奇数列の背景色を指定します。"
      },
      "DefaultBaseColorEven": {
        "description": "偶数列の背景色を指定します。"
      },
      "DefaultFontColor": {
        "description": "リスト要素の通常のフォント色を指定します。"
      },
      "SelectedBaseColor": {
        "description": "選択要素の背景色を指定します。"
      },
      "SelectedFontColor": {
        "description": "選択要素のフォント色を指定します。"
      },
      "FocusFrameColor": {
        "description": "フォーカスされた要素の枠の色を指定します。"
      }
    }
  },
  "PluginTree": {
    "description": "スキンのプラグインツリービューに関する定義です。",
    "helpUrl": "https://railsim2-support.simochee.net/help/pi_sym_skin_plugintree_info.html",
    "properties": {
      "DefaultBaseColor": {
        "description": "ツリー要素の通常の背景色を指定します。"
      },
      "DefaultFontColor": {
        "description": "ツリー要素の通常のフォント色を指定します。"
      },
      "SelectedBaseColor": {
        "description": "選択要素の背景色を指定します。"
      },
      "SelectedFontColor": {
        "description": "選択要素のフォント色を指定します。"
      },
      "FocusFrameColor": {
        "description": "選択要素の枠の色を指定します。"
      }
    }
  },
  "PopupMenu": {
    "description": "スキンのポップアップメニューに関する定義です。",
    "helpUrl": "https://railsim2-support.simochee.net/help/pi_sym_skin_popupmenu_info.html",
    "properties": {
      "DefaultFontColor": {
        "description": "通常のフォント色を指定します。"
      },
      "DisabledFontColor": {
        "description": "無効な要素のフォント色を指定します。"
      },
      "DisabledShadowColor": {
        "description": "無効な要素の文字の影の色を指定します。"
      },
      "SelectedBaseColor": {
        "description": "選択要素の背景色を指定します。"
      },
      "SelectedFontColor": {
        "description": "選択要素のフォント色を指定します。"
      }
    }
  },
  "SoundEffect": {
    "description": "スキンの各種サウンドに関する定義です。",
    "helpUrl": "https://railsim2-support.simochee.net/help/pi_sym_skin_sound_info.html",
    "properties": {
      "MouseDownWaveFileName": {
        "description": "マウスのボタンを押した時の音に使用する .wav ファイル名を指定します。.wav ファイルは短すぎると再生できない場合がありますので、100～200 [ms] 程度は長さを取ってください。"
      },
      "MouseUpWaveFileName": {
        "description": "ボタンなどをクリックしてマウスのボタンを離した時の音を指定します。"
      },
      "ErrorWaveFileName": {
        "description": "エラーが発生した時の音を指定します。"
      },
      "ScreenShotWaveFileName": {
        "description": "スクリーンショットを撮影した時の音を指定します。"
      },
      "VideoStartWaveFileName": {
        "description": "ビデオの撮影を開始した時の音を指定します。"
      },
      "VideoStopWaveFileName": {
        "description": "ビデオの撮影を終了した時の音を指定します。"
      }
    }
  },
  "Sound": {
    "description": "オブジェクトにサウンドエフェクトを取り付けます。",
    "helpUrl": "https://railsim2-support.simochee.net/help/pi_sym_sound_effector.html",
    "properties": {
      "WaveFileName": {
        "description": "再生する .wav ファイルを指定します。短すぎると再生できないことがありますので、100～200 [ms] 程度は長さを取ってください。"
      },
      "AttachObject": {
        "description": "固定先のオブジェクト名を指定します。オブジェクト名は object-3d や body-object で定義されたものです。"
      },
      "SourceCoord": {
        "description": "固定先オブジェクトのローカル座標で、音源の位置を指定します。"
      },
      "Volume": {
        "description": "再生する際のボリュームを 1/100 [dB] 単位で、-10000～0 の間で指定します。デフォルト値は 0 です。"
      },
      "Loop": {
        "description": "サウンドを繰り返し再生するかどうか指定します。デフォルト値は yes です。"
      }
    }
  },
  "StaticMove": {
    "description": "対象オブジェクトを静的に移動します。",
    "helpUrl": "https://railsim2-support.simochee.net/help/pi_sym_static_mover.html",
    "properties": {
      "Displacement": {
        "description": "元の位置からの変位を、オブジェクトの移動前のローカル座標系ベクトルで指定します。"
      }
    }
  },
  "StaticRotation": {
    "description": "対象オブジェクトを静的に回転します。",
    "helpUrl": "https://railsim2-support.simochee.net/help/pi_sym_static_rotator.html",
    "properties": {
      "RotationAxis": {
        "description": "回転軸をオブジェクトのローカル座標系で指定します。デフォルト値は Z 軸になります。"
      },
      "RotationAngle": {
        "description": "回転角度を指定します。"
      }
    }
  },
  "Link": {
    "description": "triangle-zy 等の一辺を定義します。",
    "helpUrl": "https://railsim2-support.simochee.net/help/pi_sym_triangle_link_zy.html",
    "properties": {
      "Link": {
        "description": "直後にオブジェクト名を書きます。このオブジェクト名は、他のオブジェクトがこのオブジェクトを親として参照する場合に使用されます。"
      },
      "LinkCoord": {
        "description": "triangle-zy 等 2 個 1 組のオブジェクトセットにおいて、もう一方のオブジェクトと連結する座標を指定します。"
      }
    }
  },
  "Whiteout": {
    "description": "太陽のホワイトアウトを定義します。",
    "helpUrl": "https://railsim2-support.simochee.net/help/pi_sym_whiteout.html",
    "properties": {
      "StartAngle": {
        "description": "光源方向に対し、ホワイトアウトの描画を始める視線方向の角度を指定します。"
      },
      "Color": {
        "description": "ホワイトアウトの色を指定します。"
      }
    }
  },
  "TrackWind": {
    "description": "風の方向を追跡します。",
    "helpUrl": "https://railsim2-support.simochee.net/help/pi_sym_wind_tracker.html",
    "properties": {
      "TrackSpeed": {
        "description": "風の追跡速度を設定します。正値を指定するとオブジェクトの Z 軸正方向が風下の方向と一致するように追跡し、負値の場合は風上になります。この数値には範囲の制限はありませんが、大体 0.1～10.0 程度後のオーダーで指定します。"
      },
      "FixAxis": {
        "description": "風の方向を追跡する際に、旋回軸を固定したい場合に指定します。旋回軸はオブジェクト内のローカル座標系で指定します。"
      }
    }
  },
  "Windmill": {
    "description": "風の強さに応じた回転を設定します。",
    "helpUrl": "https://railsim2-support.simochee.net/help/pi_sym_windmill.html",
    "properties": {
      "Directional": {
        "description": "風の方向と回転軸の一致度合いにより回転速度を変化させるかどうか設定します。回転軸が垂直になっているような風車の場合は no を指定します。デフォルト値は yes です。"
      },
      "RotationAxis": {
        "description": "回転軸をオブジェクトのローカル座標系で指定します。デフォルト値は Z 軸になります。"
      },
      "RotationSpeed": {
        "description": "風速に対する回転速度の比率を [rps/(m/s)] で設定します。負値を指定すると逆回転になります。"
      },
      "Symmetric": {
        "description": "回転するオブジェクトの対称性を指定します。axle-object の場合と同じです。"
      }
    }
  },
  "Wireframe": {
    "description": "プロファイルプラグインのワイヤフレーム定義です。",
    "helpUrl": "https://railsim2-support.simochee.net/help/pi_sym_wireframe.html",
    "properties": {
      "MinInterval": {
        "description": "このワイヤフレームを適用する最小区間距離を指定します。ここで指定した距離以上 (同値含む) の場合にのみワイヤフレームが適用されます。省略した場合は距離の下限を設けません。"
      },
      "MaxInterval": {
        "description": "このワイヤフレームを適用する最大区間距離を指定します。ここで指定した距離未満 (同値含まず) の場合にのみワイヤフレームが適用されます。省略した場合は距離の上限を設けません。"
      }
    }
  },
  "Vertex:Wireframe": {
    "description": "ラインを構成する頂点を定義します。",
    "helpUrl": "https://railsim2-support.simochee.net/help/pi_sym_wireframe_vertex.html",
    "properties": {
      "IgnoreCant": {
        "description": "カントの影響を無視するかどうか指定します。バラストの底辺など、カントの影響を無視すべき頂点で yes を指定します。デフォルト値は no です。"
      },
      "Diffuse": {
        "description": "頂点におけるラインの色を指定します。デフォルト値は #ff000000 です。"
      }
    }
  }
};

/** Lookup property documentation in context of an object */
export function getPropertyDoc(
  objectName: string,
  propertyName: string
): PropertyDoc | undefined {
  return objectDocs[objectName]?.properties[propertyName];
}

/** Lookup object documentation */
export function getObjectDoc(objectName: string): ObjectDoc | undefined {
  return objectDocs[objectName];
}
