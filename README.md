# RailSim2 Support

[![Visual Studio Code - RailSim2 Support](https://img.shields.io/badge/Visual_Studio_Code-RailSim2_Support-blue?logo=visual-studio-code&logoColor=white)](https://marketplace.visualstudio.com/items?itemName=simochee.vscode-railsim2-grammar)
[![VS Marketplace](https://img.shields.io/visual-studio-marketplace/v/simochee.vscode-railsim2-grammar)](https://marketplace.visualstudio.com/items?itemName=simochee.vscode-railsim2-grammar)
[![Installs](https://img.shields.io/visual-studio-marketplace/i/simochee.vscode-railsim2-grammar)](https://marketplace.visualstudio.com/items?itemName=simochee.vscode-railsim2-grammar)

RailSim2 プラグイン定義ファイルの開発支援を提供する VS Code 拡張機能です。

## Features

- シンタックスハイライト
- 入力補完
- ホバーでの定義説明表示
- フォーマッター（自動整形）
- バリデーター（エラー検出）

## Installation

[VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=simochee.vscode-railsim2-grammar) から拡張機能をインストールします。

## Supported versions

この拡張機能は RailSim 2.14 で有効なシンタックスに対応しています。

それ以外のバージョン、RailSim2 -k-build の独自記法には対応していません。

## Usage

Visual Studio Code 上でシンタックスハイライトを有効化するには、 `言語モードの選択` より `RailSim2` を指定します。

なお、ファイル名が次のいずれかの場合、自動的に `RailSim2` のシンタックスハイライトが適用されます。

* `Rail2.txt`
* `Tie2.txt`
* `Girder2.txt`
* `Pier2.txt`
* `Line2.txt`
* `Pole2.txt`
* `Train2.txt`
* `Station2.txt`
* `Struct2.txt`
* `Surface2.txt`
* `Env2.txt`
* `Skin2.txt`

## Bugs

バグや機能追加については [Issues](https://github.com/simochee/railsim2-support/issues) までご連絡ください。
