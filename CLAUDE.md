# RoomSim

賃貸物件の間取りシミュレーター。間取り画像を背景に家具を配置・サイズ調整・回転できるブラウザアプリ（日本語UI）。
内見時に実測値を記録する「採寸モード」（寸法線・マーク/メモピン）と、寸法から簡易な間取り図を描く「作図モード」（PC のみ）を持つ。PWA（オフライン起動可）。

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
  store/planSlice.ts               作図モードの state/アクション（useAppStore に合成。undo/redo は家具込みのスナップショット）
  store/persistence.ts             IndexedDB 自動保存・物件一覧・旧 localStorage 移行・JSON 書き出し/読み込み
  types/index.ts                   型定義（FurnitureItem, Dimension, MemoPin 等）
  utils/scaleUtils.ts              px/cm 変換・snapToCm・縮尺推定
  utils/measureUtils.ts            水平垂直スナップ・cm 入力パース
  utils/projectUtils.ts            makeInitialProject / normalizeProject（旧データ補完）/ effectiveBackground
  utils/planUtils.ts               図面の幾何（壁の座標系 hostFrame、扉窓の追従、移動・削除、スナップ線、範囲選択、外接矩形）
  utils/planMeasure.ts             図面の値と採寸値の紐付け・比較
  utils/exportImage.ts             図面＋家具の PNG 書き出し
  data/planKinds.ts                扉・窓・設備の種類（既定サイズ・表示名・色）
  data/furniturePresets.ts         プリセット家具データ
  data/pinKinds.ts                 マークの種類（コンセント/TV端子/LAN/エアコン/メモ）の表示名・色・グリフ
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
      ProjectBar.tsx               PC 左パネル下部の折りたたみバー（現在の物件名、開くと ProjectActions）。スマホは「その他」タブ
    properties/
      PropertiesPanel.tsx          右パネル（選択家具のプロパティ編集）
    canvas/PlanLayer.tsx           作図: 部屋・壁・設備・扉窓の描画、選択・ドラッグ・リサイズ・壁端ハンドル
    canvas/PlanOpeningShape.tsx    扉・窓の記号（sceneFunc 1 つで描画）
    canvas/PlanFixtureShape.tsx    設備（斜線=家具不可、階段は段、梁は点線）
    canvas/usePlanDrawing.ts       作図ツールのポインタ処理（部屋/設備/壁の描画、扉窓の配置、Shift+ドラッグ範囲選択）
    plan/                          作図モード UI（PlanTools, PlanSelectionEditor, RoomEditor, WallEditor,
                                   OpeningEditor, FixtureEditor, MeasureLinkRow, MeasureComparison, NumField）
    measure/                       採寸モード UI（CanvasModeBar, MeasureTools, MeasureHint,
                                   MeasureList, MeasureSelectionEditor, DimensionEditor, MemoEditor, PinIcon）
    mobile/
      MobileTabBar.tsx             スマホ用下部タブ（配置: 画像/家具/縮尺/編集/その他、採寸: ＋寸法/＋マーク/一覧/その他）
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
  memos: MemoPin[]        // { pos: ImagePoint, text, kind?: PinKind }（kind 未設定 = 'memo'）
  snapGrid: { enabled: boolean; sizeCm: number }
  plan?: Plan             // 作図データ（初めて作図モードを開いたときに作成）
  background?: 'image' | 'plan'   // 配置モードの背景（未設定 = 部屋があれば図面）
}
selectedId: string | null      // 単独選択の家具（プロパティで編集）。複数選択中は null
furnitureSelection: string[]   // 選択中の家具すべて（Shift+クリック / Shift+ドラッグ範囲選択）。selectedId と常に同期
viewCenterCm: { x, y } | null  // 表示中キャンバス中心のワールド座標（非保存）。新規家具の配置位置
projectRev: number             // 物件の差し替え/消去で増える（ローカルフォーム state リセットの合図）
mode: 'furniture' | 'measure' | 'plan'
measureTool / measureSelection / dimensionDraft / axisSnap / pinKind / measureUndo   // 採寸 UI 状態（非保存）
planTool / planSelection / planDoorType / planWindowType / planFixtureKind / planMoveFurniture / planUndo / planRedo  // 作図 UI 状態（非保存）
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

### perfectDrawEnabled={false}

fill と stroke を両方持ち、かつ実効 opacity < 1（自身の opacity またはレイヤーの半透明）の Konva Shape は、
既定では**ステージ全面サイズのオフスクリーン canvas 経由**で毎フレーム描画される。家具 Rect・寸法ラベル・
メモピン等で iPad のパン/ズームが 1 フレーム ~200ms になっていたため、該当 Shape には `perfectDrawEnabled={false}` を付ける
（新しく fill+stroke の Shape を足すときも同様）。
採寸モードでは家具レイヤーが半透明になり、Transformer のアンカー（Rect）も同じ経路に入るため、Transformer は `interactive` のときだけ描画する。

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
- マークは「種類を選んでからタップ」。`memo` 以外（アイコン）は配置後に**選択しない**ので連続で置ける（誤配置は戻す）。テキストは任意メモで図面には出さない。`memo` は配置後に選択してエディタを開き、テキストを図面に表示する。番号は `memo` のみに振る
- 配置モードでも寸法線は参考表示（listening なし）。採寸モードでは家具レイヤーを半透明・listening なし
- undo は `measureUndo`（寸法線・メモ配列のスナップショット）。`UndoOption.undoKey` で入力中の連続更新を 1 ステップにまとめる。ドラッグは `onDragStart` で 1 回 push、移動中は `undoKey: false`
- スマホでは選択中の寸法線/メモがあればタブに関係なくシートにエディタを表示。タブ切替でツールが切り替わる
- 値入力欄の autoFocus を保つため、キャンバス container の `touchend` で `preventDefault`（タップ後の互換 mousedown/click がフォーカスを奪う）
- スマホでは input の font-size を 16px 以上（iOS Safari のフォーカス時自動ズーム回避）

### 作図モード

- 単位は cm（家具と同じワールド座標）。PlanLayer は `scale = ppc` の Group の中に cm で描き、線幅やラベルは `k = 1/(ppc*stageScale)` で画面上一定サイズにする
- 部屋は**室内有効寸法**の矩形（x/y = 左上）。壁は部屋ごとに外側へ壁厚分の塗り矩形で描き、その上に床を塗るので、重ねた部屋（L 字）の内側の壁は消える。自由壁は部屋で表せない間仕切り用（中心線 ± 壁厚/2）
- 扉・窓は `WallHost`（部屋の辺 or 自由壁）上の位置 `offsetCm`（中心）で持つので、壁を動かす・伸縮すると追従する。辺は時計回りで法線が室内向き。`fitOpenings` で壁からはみ出さないよう補正
- 描画は軽さ優先: 塗りと線を同じ Shape に持たせない、扉窓・設備は sceneFunc 1 つで描く
- 下敷き画像は図面の上に乗算合成で重ねる（白地が消える）。大きさは縮尺設定で決まり、位置合わせは図面側を動かす
- 図面の値と採寸値の紐付け（`measured`）は参照のみ。採寸データを書き換えない。採寸側の削除・値変更は比較表示にそのまま反映
- undo/redo は採寸と別スタック。「家具も一緒に動かす」があるので家具配列もスナップショットに含める
- 選択ツールで Shift を押している間は要素のドラッグを止め、どこからでも範囲選択（要素全体が入ったものを追加）。Shift+クリックは選択の切替。配置モードの家具も同じ操作（`useFurnitureMarquee`、回転後の四隅で判定）。複数選択中の家具はドラッグでまとめて移動（他のノードはドラッグ中に直接動かし、終了時にスナップ後の移動量で store を一括更新）。Transformer は単独選択のときだけ
- PNG 書き出しは Stage を図面の外接矩形で `toCanvas`。`name="export-hide"` のノードと Transformer を一時的に隠し、家具レイヤーを不透明にする
- スマホでは作図モードを出さない（配置モードに戻す）

## Canvas Layer Order

```
Konva Stage
  FloorplanLayer    (間取り画像。図面を背景にするときは非表示)
  PlanLayer         (作図した図面 + 下敷き画像。作図モード、または配置モードで背景=図面のとき)
  FurnitureLayer    (家具 + Transformer)
  MeasureLayer      (寸法線・メモピン)
  RulerOverlay      (縮尺設定時のみ)
HTML overlay (Stage 外)
  CSS グリッド div  (snapGrid.enabled 時のみ、固定表示)
  CanvasModeBar     (右上: 配置/採寸/作図 切替 + 戻す/やり直す)
  canvas-status     (ステータスバー)
```
