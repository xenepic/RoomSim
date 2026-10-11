# RoomSim

賃貸物件の間取りシミュレーター。間取り画像を背景に家具を配置・サイズ調整・回転できるブラウザアプリ（日本語UI）。
内見時に実測値を記録する「採寸モード」（寸法線・メモピン）を持つ。PWA（オフライン起動可）。

## Tech Stack

- **React 19** + **TypeScript** + **Vite 6**
- **Konva / react-konva** — 家具・間取り画像・ルーラーのキャンバスレンダリング
- **Zustand v5** — グローバル状態管理
- **idb-keyval** — IndexedDB 保存（自動保存）
- **vite-plugin-pwa** — Service Worker / manifest（`vite.config.ts`）
- スタイル: インラインスタイル + `src/App.css` + `src/index.css`（CSS Modules 未使用）

## Key Files

```
src/
  App.tsx                          レイアウト（PC 3カラム / スマホ タブ+シート）、Delete/Ctrl+C
  hooks/useMediaQuery.ts           matchMedia 購読フック
  store/useAppStore.ts             Zustand store（プロジェクト全データ + UI 状態 + 採寸 undo）
  store/persistence.ts             IndexedDB 自動保存・物件一覧・旧 localStorage 移行・JSON 書き出し/読み込み
  types/index.ts                   型定義（FurnitureItem, Dimension, MemoPin 等）
  utils/scaleUtils.ts              px/cm 変換・snapToCm・縮尺推定
  utils/measureUtils.ts            水平垂直スナップ・cm 入力パース
  utils/projectUtils.ts            makeInitialProject / normalizeProject（旧データ補完）
  data/furniturePresets.ts         プリセット家具データ
  components/
    canvas/
      CanvasArea.tsx               Stage・zoom/pan・CSS グリッドオーバーレイ
      FloorplanLayer.tsx           間取り画像レンダリング
      FurnitureLayer.tsx           家具一覧 + Konva Transformer 管理
      FurnitureShape.tsx           個別家具（ドラッグ・リサイズ・スナップ）
      RulerOverlay.tsx             縮尺設定用オーバーレイ
      MeasureLayer.tsx             寸法線・ラベル・端点ハンドル・メモピン
    toolbar/
      Toolbar.tsx                  左パネル
      FurniturePresetList.tsx      家具プリセット + カスタム追加フォーム
      ScaleCalibrator.tsx          縮尺設定UI（実測・畳数推定）
      ProjectActions.tsx           物件の切替・新規・削除・書き出し/読み込み・内容消去
    properties/
      PropertiesPanel.tsx          右パネル（選択家具のプロパティ編集）
    measure/                       採寸モード UI（CanvasModeBar, MeasureTools, MeasureHint,
                                   MeasureList, MeasureSelectionEditor, DimensionEditor, MemoEditor）
    mobile/
      MobileTabBar.tsx             スマホ用下部タブ（配置: 画像/家具/縮尺/編集/その他、採寸: ＋寸法/＋メモ/一覧/その他）
```

## State Model

`useAppStore` の `project` オブジェクト:

```ts
project: {
  id: string              // 物件 ID（IndexedDB のキー）。resetProject では変わらない
  name: string
  floorplan?: FloorplanImage
  scale?: ScaleSetting
  furniture: FurnitureItem[]
  dimensions: Dimension[] // { a, b: ImagePoint, valueCm: number|null, note? }
  memos: MemoPin[]        // { pos: ImagePoint, text }
  snapGrid: { enabled: boolean; sizeCm: number }
}
selectedId: string | null
viewCenterCm: { x, y } | null  // 表示中キャンバス中心のワールド座標（非保存）。新規家具の配置位置
projectRev: number             // 物件の差し替え/消去で増える（ローカルフォーム state リセットの合図）
mode: 'furniture' | 'measure'
measureTool / measureSelection / dimensionDraft / axisSnap / measureUndo   // 採寸 UI 状態（非保存）
```

保存先: IndexedDB（`store/persistence.ts`）。キー: `projects`（一覧）, `currentProjectId`,
`project:<id>`（画像以外）, `floorplan:<id>`（画像 Data URL、変更時のみ書き込み）。

## Non-obvious Design Decisions

### 座標系: xCm/yCm = 中心座標

`FurnitureItem.xCm` / `yCm` は家具の**中心**位置（左上角ではない）。
Konva Group に `offsetX = widthPx/2`, `offsetY = heightPx/2` を設定して中心回転を実現しているため。
スナップ計算など端点が必要な場合は `xCm ± widthCm/2` で変換する。

### グリッドスナップ: マグネット式・最近傍エッジ

- 左/右エッジと上/下エッジのうち**最もグリッド線に近い辺**を吸着対象にする
- **画面上 20px 以内**のときのみ吸着（それ以外はフリー移動）
- `stageScale` を使って `thresholdCm = 20px / (ppc * stageScale)` に換算して判定

### CSS 固定グリッド

グリッド線は Konva Stage の**外側**に CSS `background-image`（SVG data URL、点線）でレンダリング。
`background-position: stagePos % gridSpacingPx` でオフセットし、ワールド座標と整合させつつ視覚的に固定して見せる。

### トースト表示

CSS `@keyframes` 単一アニメーション（fade-in → hold → fade-out）。
`onAnimationEnd` でステートクリア、`key` カウンターインクリメントで繰り返しトリガー時に強制再マウント。

### Disabled ボタンのホバー

`button:disabled { pointer-events: none }` を `index.css` にグローバル設定。
これがないとブラウザが `:hover` スタイルを適用し続ける。

### 浮動小数点ドリフト

Konva のマトリクス演算で `119.99999999997` のようなドリフトが発生する。
`handleTransformEnd` で `Math.round(value * 100) / 100` を適用して丸める。

### FurniturePresetList のカスタム名リセット

`projectRev` を `useEffect` で監視し、変化時にカスタム名・幅・奥行のローカル state をリセット。
`replaceProject()`（切替・読み込み・新規）と `resetProject()`（内容消去、id は維持）の両方でインクリメントされる。

### 回転スナップ

Konva Transformer の `rotationSnaps={[0,45,90,135,180,225,270,315]}` + `rotationSnapTolerance={10}` で実装。

### スマホレイアウト

- `useMediaQuery('(max-width: 767px), (max-height: 500px)')` で切替（横向きスマホも対象）
- キャンバス全画面 + 下部タブ + シート。シートはオーバーレイではなく**フロー内**に置き、キャンバスを縮める（ResizeObserver で Stage が追従）
- App の子要素は常に固定スロット（非表示時は `null`）にして、ブレークポイント跨ぎで CanvasArea が再マウントされない（ズーム/パン保持）
- 編集シートは**キャンバス上で家具をタップしたときだけ**自動で開く（`onFurnitureTap`）。追加時は家具シートのまま連続追加できる。選択解除で編集シートは閉じる

### タッチ操作

- ピンチズームは Stage イベントではなく**コンテナ div のネイティブ touchmove**で処理。Konva はドラッグ中にヒット判定を止めるため、家具上で始まったピンチを Stage イベントでは拾えない
- ピンチ開始時に `DD._dragElements` の全ドラッグを `stopDrag()`。ジェスチャ中の scale/pos は ref に蓄積（React state は touchmove に遅れるため）
- RulerOverlay は `onPointer*` イベント（Konva の mouse 系イベントはタッチで発火しない）
- `(pointer: coarse)` では Transformer の `anchorSize` を 20 に拡大
- `button:hover` は `@media (hover: hover)` 内のみ（タッチでホバーが残るため）

### 自動保存（persistence.ts）

- store を `subscribe` し、`project` の参照が変わったら 500ms デバウンスで保存。`visibilitychange(hidden)` / `pagehide` で即時保存
- 画像は別キー。`floorplan` の参照が前回保存時と同じなら書き込まない（大きな Data URL を毎回書かない）
- 読み込んだ project は `lastSaved` に入れてから store に入れる（読み込みだけで保存＝更新日時が変わるのを防ぐ）
- 起動時、IndexedDB が空なら旧 `localStorage['roomsim-project']` を移行して削除
- 読み込み（インポート）は常に**新しい物件**として追加（新 id 発行、既存を上書きしない）

### 採寸モード

- 寸法線・メモの座標は**図面画像のピクセル座標**（= Stage のワールド座標）。縮尺に依存しないので縮尺変更やズームでずれない
- `valueCm` はユーザー入力のみ。画像上の長さから算出しない（エディタの「図面上の長さ」は参考表示）。`null` = 未測定（内見前に線だけ引いておく用途）
- タップの解釈は `placeMeasurePoint`（store）に集約: ツール `dimension` は 2 タップで線（2 点目は水平垂直スナップ）、`memo` はピン、`select` は選択解除
- ツールが `dimension` / `memo` の間は寸法線のヒット判定を切る（`MeasureLayer` の `listening`）。既存線の上でも点を置ける
- ラベル・ピン・ハンドルは `1/stageScale` で画面上一定サイズ
- 配置モードでも寸法線は参考表示（listening なし）。採寸モードでは家具レイヤーを半透明・listening なし
- undo は `measureUndo`（寸法線・メモ配列のスナップショット）。`UndoOption.undoKey` で入力中の連続更新を 1 ステップにまとめる。ドラッグは `onDragStart` で 1 回 push、移動中は `undoKey: false`
- スマホでは選択中の寸法線/メモがあればタブに関係なくシートにエディタを表示。タブ切替でツールが切り替わる
- 値入力欄の autoFocus を保つため、キャンバス container の `touchend` で `preventDefault`（タップ後の互換 mousedown/click がフォーカスを奪う）
- スマホでは input の font-size を 16px 以上（iOS Safari のフォーカス時自動ズーム回避）

## Canvas Layer Order

```
Konva Stage
  FloorplanLayer    (間取り画像)
  FurnitureLayer    (家具 + Transformer)
  MeasureLayer      (寸法線・メモピン)
  RulerOverlay      (縮尺設定時のみ)
HTML overlay (Stage 外)
  CSS グリッド div  (snapGrid.enabled 時のみ、固定表示)
  CanvasModeBar     (右上: 配置/採寸 切替 + 戻す)
  canvas-status     (ステータスバー)
```
