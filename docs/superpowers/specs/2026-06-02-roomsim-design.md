# RoomSim 設計ドキュメント

**日付:** 2026-06-02  
**スコープ:** MVP（間取り画像上の家具配置シミュレーター）

---

## 1. 概要

賃貸物件の間取り画像を下敷きに、家具を矩形オブジェクトとして配置・移動・回転・リサイズできるWebアプリ。PowerPointで行っていた家具配置作業をブラウザ上で完結させることを目標とする。

**技術スタック:**
- React + TypeScript + Vite
- react-konva / Konva.js（キャンバス描画）
- Zustand（状態管理）
- シンプルなCSS（スタイリング）
- localStorage（永続化）、バックエンドなし

---

## 2. アーキテクチャ方針

**ドメインモデル＋Konva描画分離パターンを採用。**

| レイヤー | 責務 | 単位 |
|---------|------|------|
| Zustand store | アプリ状態・ドメインデータ・全アクション | cm |
| Konvaコンポーネント | 描画・ユーザー操作の入力受付 | px |
| `scaleUtils.ts` | cm↔px変換・縮尺計算（純粋関数） | — |

- Konvaのイベント結果（`dragend`, `transformend`）は必ず cm に変換してから `updateFurniture` を呼ぶ
- ズーム・パン状態は `CanvasArea` のローカルstateに閉じ、Zustandには書かない
- Konva Transformerは使用してよいが、リサイズ・回転の結果はZustandアクション経由で反映する

---

## 3. データ構造

```ts
// types/index.ts

type FloorplanImage = {
  dataUrl: string;      // base64
  widthPx: number;
  heightPx: number;
};

type TatamiType = 'edo' | 'kyo' | 'chukyo' | 'danchi';

type ScaleSetting = {
  pixelsPerCm: number;
  method: 'ruler' | 'tatami';
  accuracy: 'exact' | 'estimated';
};

type FurnitureItem = {
  id: string;
  name: string;
  xCm: number;         // ドメイン座標（cm）
  yCm: number;
  widthCm: number;
  depthCm: number;
  rotation: number;    // degrees
  color: string;
  presetId?: string;   // プリセット由来の場合のみ設定
};

type Project = {
  id: string;
  name: string;
  floorplan?: FloorplanImage;
  scale?: ScaleSetting;
  snapGrid: {
    enabled: boolean;
    sizeCm: number;    // デフォルト 10
  };
  furniture: FurnitureItem[];
};

type FurniturePreset = {
  id: string;
  category: string;
  name: string;
  widthCm: number;
  depthCm: number;
  color: string;
};
```

**設計上の規約:**
- `FurnitureItem.xCm/yCm` はpxではなくcm座標。描画時のみ `cmToPx()` で変換する
- `FloorplanImage.widthPx/heightPx` は画像そのものの情報なのでpxのまま
- `presetId` なしはカスタム家具、`presetId` ありはプリセット由来

---

## 4. Zustand ストア

```ts
// store/useAppStore.ts

type AppState = {
  project: Project;
  selectedId: string | null;
};

type AppStore = AppState & {
  // 家具操作
  addFurniture: (item: Omit<FurnitureItem, 'id'>) => void;
  updateFurniture: (id: string, changes: Partial<FurnitureItem>) => void;
  deleteFurniture: (id: string) => void;

  // 選択
  selectFurniture: (id: string | null) => void;

  // 間取り
  setFloorplan: (image: FloorplanImage) => void;

  // 縮尺
  setScale: (scale: ScaleSetting) => void;

  // スナップグリッド
  setSnapGrid: (enabled: boolean, sizeCm?: number) => void;

  // 永続化
  saveProject: () => void;    // localStorage、内部でtry/catch + console.error
  loadProject: () => void;    // localStorage、内部でtry/catch + console.error
  resetProject: () => void;   // 初期状態に戻す
};
```

---

## 5. コンポーネントツリー

```
src/
├── App.tsx                         # 3カラムレイアウトのルート
│
├── components/
│   ├── toolbar/
│   │   ├── Toolbar.tsx             # 左パネル全体
│   │   ├── ImageUploader.tsx       # 間取り画像アップロード
│   │   ├── FurniturePresetList.tsx # プリセット一覧 + カスタム追加
│   │   ├── ScaleCalibrator.tsx     # 縮尺設定UI（モード選択・畳数入力・結果表示）
│   │   ├── SnapGridToggle.tsx      # スナップON/OFF + グリッドサイズ入力
│   │   └── ProjectActions.tsx     # 保存・読み込み・リセットボタン
│   │
│   ├── canvas/
│   │   ├── CanvasArea.tsx          # Stageラッパー。zoom/pan をローカルstateで管理
│   │   ├── FloorplanLayer.tsx      # 間取り画像レイヤー（Konva.Image）
│   │   ├── FurnitureLayer.tsx      # 全FurnitureShapeを描画するレイヤー
│   │   ├── FurnitureShape.tsx      # 個別家具（Rect + Text + Transformer）
│   │   └── RulerOverlay.tsx        # 縮尺キャリブレーション用Konvaレイヤー
│   │                               #   mode:'ruler' → 2点クリック
│   │                               #   mode:'tatami' → 矩形ドラッグ選択
│   │
│   └── properties/
│       ├── PropertiesPanel.tsx     # 右パネル全体
│       └── FurnitureEditor.tsx     # 選択中家具の編集フォーム
│
├── store/
│   └── useAppStore.ts
│
├── data/
│   └── furniturePresets.ts         # FURNITURE_PRESETS 定数
│
├── types/
│   └── index.ts
│
└── utils/
    └── scaleUtils.ts               # cmToPx / pxToCm / estimateScaleFromTatami 等
```

---

## 6. スケール未設定時の挙動

`project.scale` が未設定の場合、デフォルト値 `pixelsPerCm = 2` を使用して描画する。  
これにより、縮尺設定前でも家具（例：100cm幅 → 200px）をキャンバス上に確認できる。  
UIには「縮尺未設定（参考表示）」などの注意表示を出す。

`scaleUtils.ts` に以下を定義する:
```ts
export const DEFAULT_PIXELS_PER_CM = 2;
export function getPixelsPerCm(scale?: ScaleSetting): number {
  return scale?.pixelsPerCm ?? DEFAULT_PIXELS_PER_CM;
}
```

---

## 7. 主要インタラクションフロー

### 家具の追加と初期位置
```
addFurniture 呼び出し時
  → 初期位置: キャンバスの表示中央付近（ズーム・パンを考慮した座標）
  → stagePos と stageScale から逆算した cm 座標を xCm, yCm に設定
```

### 家具の移動
```
Konva dragend → x/y (px)
  → pxToCm(x), pxToCm(y)
  → updateFurniture(id, { xCm, yCm })
```

### 家具のリサイズ・回転
```
Konva transformend → scaleX, scaleY, rotation
  → Transformerのscaleをリセット（scaleX=1, scaleY=1）
  → widthCm = 元widthCm × scaleX
  → depthCm = 元depthCm × scaleY
  → pxToCm で座標も再計算
  → updateFurniture(id, { xCm, yCm, widthCm, depthCm, rotation })
```

### グリッドスナップ
```
dragBoundFunc (Konva)
  → px座標 → pxToCm → round(cm / snapSizeCm) × snapSizeCm → cmToPx
  → スナップ済みpx座標を返す
```

### ズーム・パン
```
Stage wheel → stageScale / stagePos をローカルstateで更新
  → Stage の scale・position props に反映
  ※ Zustandには書かない
```

### RulerOverlay のアクティベーション
- `ScaleCalibrator` でキャリブレーション開始ボタンを押したときのみ `RulerOverlay` を表示する
- `CanvasArea` は `isCalibrating: boolean` と `calibrationMode: 'ruler' | 'tatami'` を props で受け取り、`RulerOverlay` の表示を制御する
- キャリブレーション完了またはキャンセル時に非表示に戻す

---

## 8. 縮尺キャリブレーション

### ルーラー方式（accuracy: 'exact'）
1. RulerOverlay `mode:'ruler'` で1点目クリック → 座標1を一時保持
2. 2点目クリック → 距離px = √((x2-x1)² + (y2-y1)²)
3. ScaleCalibrator で実寸cm入力
4. `pixelsPerCm = 距離px / 実寸cm`

### 畳数推定方式（accuracy: 'estimated'）
1. ScaleCalibrator で畳タイプ（江戸間/京間/中京間/団地間）と畳数を入力
2. RulerOverlay `mode:'tatami'` でキャンバス上の対象部屋を矩形ドラッグ選択
3. 計算:
   ```ts
   const roomAreaCm2 = tatamiCount * TATAMI_SIZES[tatamiType].areaCm2;
   const rectAreaPx2 = rectWidthPx * rectHeightPx;
   const pixelsPerCm = Math.sqrt(rectAreaPx2 / roomAreaCm2);
   ```
4. `setScale({ pixelsPerCm, method: 'tatami', accuracy: 'estimated' })`

**将来拡張:** 壁認識で閉領域の面積px²を自動取得し、同じ `sqrt(areaPx2/areaCm2)` 式で縮尺算出。MVP設計と互換性あり。

**畳タイプ定数（cm²）:**
| タイプ | 1畳サイズ |
|--------|---------|
| 江戸間（関東間） | 176 × 88 = 15,488 cm² |
| 京間（関西間）  | 191 × 95.5 = 18,240 cm² |
| 中京間          | 182 × 91 = 16,562 cm² |
| 団地間          | 170 × 85 = 14,450 cm² |

---

## 8. 家具プリセット

カテゴリ分けされた定数として `data/furniturePresets.ts` に保持。

| カテゴリ | プリセット例 |
|---------|------------|
| ベッド   | S(100×200), SD(120×200), D(140×200) |
| ソファ   | 1P(80×80), 2P(145×80), 3P(195×85) |
| テーブル | ダイニング4P(120×80), センター(90×50) |
| デスク   | デスク(120×60), チェア(60×60) |
| 収納     | テレビ台(120×45) |
| 家電     | 洗濯機(60×60), 冷蔵庫(60×65) |

---

## 9. MVP スコープ外（将来拡張）

- マルチプロジェクト管理
- 壁・ドア・窓オブジェクト
- 閉領域認識による自動縮尺算出
- AI間取り画像認識
- 衝突判定
- PNG/PDFエクスポート
- 家具配置履歴（Undo/Redo）

---

## 10. ディレクトリ構成（最終）

```
roomsim/
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── App.css
│   ├── components/
│   │   ├── toolbar/
│   │   ├── canvas/
│   │   └── properties/
│   ├── store/
│   │   └── useAppStore.ts
│   ├── data/
│   │   └── furniturePresets.ts
│   ├── types/
│   │   └── index.ts
│   └── utils/
│       └── scaleUtils.ts
└── docs/
    └── superpowers/
        └── specs/
            └── 2026-06-02-roomsim-design.md
```
