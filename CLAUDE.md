# RoomSim

賃貸物件の間取りシミュレーター。間取り画像を背景に家具を配置・サイズ調整・回転できるブラウザアプリ（日本語UI）。

## Tech Stack

- **React 19** + **TypeScript** + **Vite 6**
- **Konva / react-konva** — 家具・間取り画像・ルーラーのキャンバスレンダリング
- **Zustand v5** — グローバル状態管理
- スタイル: インラインスタイル + `src/App.css` + `src/index.css`（CSS Modules 未使用）

## Key Files

```
src/
  App.tsx                          レイアウト、Delete/Ctrl+C キーボードショートカット
  store/useAppStore.ts             Zustand store（プロジェクト全データ）
  types.ts                         型定義（FurnitureItem, ScaleSetting 等）
  utils/scaleUtils.ts              px/cm 変換・snapToCm・縮尺推定
  data/furniturePresets.ts         プリセット家具データ
  components/
    canvas/
      CanvasArea.tsx               Stage・zoom/pan・CSS グリッドオーバーレイ
      FloorplanLayer.tsx           間取り画像レンダリング
      FurnitureLayer.tsx           家具一覧 + Konva Transformer 管理
      FurnitureShape.tsx           個別家具（ドラッグ・リサイズ・スナップ）
      RulerOverlay.tsx             縮尺設定用オーバーレイ
    toolbar/
      Toolbar.tsx                  左パネル
      FurniturePresetList.tsx      家具プリセット + カスタム追加フォーム
      ScaleCalibrator.tsx          縮尺設定UI（実測・畳数推定）
      ProjectActions.tsx           保存・読込・リセット
    properties/
      PropertiesPanel.tsx          右パネル（選択家具のプロパティ編集）
```

## State Model

`useAppStore` の `project` オブジェクト:

```ts
project: {
  id: string              // resetProject/loadProject で変わる（ローカル state リセットの合図）
  floorplan: string|null  // Data URL
  scale: ScaleSetting|null
  furniture: FurnitureItem[]
  snapGrid: { enabled: boolean; sizeCm: number }
}
selectedId: string | null
```

保存先: `localStorage`（`saveProject` / `loadProject`）

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

`project.id` を `useEffect` で監視し、変化時にカスタム名・幅・奥行のローカル state をリセット。
`resetProject()` は新 UUID を生成し、`loadProject()` は保存時の UUID を復元するため、どちらの操作でも確実に発火する。

### 回転スナップ

Konva Transformer の `rotationSnaps={[0,45,90,135,180,225,270,315]}` + `rotationSnapTolerance={10}` で実装。

## Canvas Layer Order

```
Konva Stage
  FloorplanLayer    (間取り画像)
  FurnitureLayer    (家具 + Transformer)
  RulerOverlay      (縮尺設定時のみ)
HTML overlay (Stage 外)
  CSS グリッド div  (snapGrid.enabled 時のみ、固定表示)
  canvas-status     (ステータスバー)
```
