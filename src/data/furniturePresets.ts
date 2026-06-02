import type { FurniturePreset } from '../types';

export const FURNITURE_PRESETS: FurniturePreset[] = [
  // ベッド
  { id: 'bed-single',      category: 'ベッド',   name: 'ベッド（S）',       widthCm: 100, depthCm: 200, color: '#AED6F1' },
  { id: 'bed-semi-double', category: 'ベッド',   name: 'ベッド（SD）',      widthCm: 120, depthCm: 200, color: '#AED6F1' },
  { id: 'bed-double',      category: 'ベッド',   name: 'ベッド（D）',       widthCm: 140, depthCm: 200, color: '#AED6F1' },
  // ソファ
  { id: 'sofa-1p',         category: 'ソファ',   name: 'ソファ（1P）',      widthCm:  80, depthCm:  80, color: '#A9DFBF' },
  { id: 'sofa-2p',         category: 'ソファ',   name: 'ソファ（2P）',      widthCm: 145, depthCm:  80, color: '#A9DFBF' },
  { id: 'sofa-3p',         category: 'ソファ',   name: 'ソファ（3P）',      widthCm: 195, depthCm:  85, color: '#A9DFBF' },
  // テーブル
  { id: 'table-dining',    category: 'テーブル', name: 'ダイニング（4P）',  widthCm: 120, depthCm:  80, color: '#F9E79F' },
  { id: 'table-coffee',    category: 'テーブル', name: 'センターテーブル',  widthCm:  90, depthCm:  50, color: '#F9E79F' },
  // 収納
  { id: 'tv-stand',        category: '収納',     name: 'テレビ台',          widthCm: 120, depthCm:  45, color: '#D5DBDB' },
  // デスク
  { id: 'desk',            category: 'デスク',   name: 'デスク',            widthCm: 120, depthCm:  60, color: '#FAD7A0' },
  { id: 'chair',           category: 'デスク',   name: 'チェア',            widthCm:  60, depthCm:  60, color: '#FAD7A0' },
  // 家電
  { id: 'washing-machine', category: '家電',     name: '洗濯機',            widthCm:  60, depthCm:  60, color: '#D2B4DE' },
  { id: 'refrigerator',    category: '家電',     name: '冷蔵庫',            widthCm:  60, depthCm:  65, color: '#D2B4DE' },
];

// Category list in display order (preserves insertion order)
export const PRESET_CATEGORIES = [...new Set(FURNITURE_PRESETS.map((p) => p.category))];
