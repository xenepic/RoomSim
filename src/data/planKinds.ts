import type { DoorType, FixtureKind, WindowType } from '../types';

export const DOOR_TYPES: Array<{ id: DoorType; label: string; widthCm: number }> = [
  { id: 'hinged', label: '片開き', widthCm: 75 },
  { id: 'sliding', label: '引き戸', widthCm: 80 },
  { id: 'double', label: '両開き', widthCm: 120 },
  { id: 'opening', label: '開口のみ', widthCm: 80 },
];

export const WINDOW_TYPES: Array<{ id: WindowType; label: string; widthCm: number; sillCm: number; heightCm: number }> = [
  { id: 'sliding', label: '引き違い（腰高）', widthCm: 165, sillCm: 90, heightCm: 110 },
  { id: 'floor', label: '掃き出し', widthCm: 170, sillCm: 0, heightCm: 200 },
  { id: 'fix', label: 'FIX', widthCm: 60, sillCm: 90, heightCm: 60 },
];

// blocks: furniture can't go there (drawn hatched); beams are overhead and only outlined
export const FIXTURE_KINDS: Array<{
  id: FixtureKind; label: string; w: number; h: number; color: string; blocks: boolean;
}> = [
  { id: 'column', label: '柱', w: 30, h: 30, color: '#6B7280', blocks: true },
  { id: 'beam', label: '梁', w: 300, h: 30, color: '#9CA3AF', blocks: false },
  { id: 'closet', label: '収納', w: 165, h: 60, color: '#A16207', blocks: true },
  { id: 'stairs', label: '階段', w: 90, h: 270, color: '#7C3AED', blocks: true },
  { id: 'kitchen', label: 'キッチン', w: 180, h: 65, color: '#0E7490', blocks: true },
  { id: 'sanitary', label: '洗面・トイレ', w: 75, h: 60, color: '#0369A1', blocks: true },
  { id: 'other', label: 'その他', w: 60, h: 60, color: '#6B7280', blocks: true },
];

export const getDoorType = (id: DoorType) => DOOR_TYPES.find((d) => d.id === id) ?? DOOR_TYPES[0];
export const getWindowType = (id: WindowType) => WINDOW_TYPES.find((w) => w.id === id) ?? WINDOW_TYPES[0];
export const getFixtureKind = (id: FixtureKind) => FIXTURE_KINDS.find((f) => f.id === id) ?? FIXTURE_KINDS[FIXTURE_KINDS.length - 1];
