import type { PinKind } from '../types';

export type PinKindDef = {
  id: PinKind;
  label: string;
  color: string;
  glyph: string;   // short text drawn inside the pin ('' = drawn as a shape, see PinGlyph)
};

// Order = order of the picker. Marks are things that matter for furniture layout.
export const PIN_KINDS: PinKindDef[] = [
  { id: 'outlet', label: 'コンセント', color: '#D97706', glyph: '' },
  { id: 'tv', label: 'TV端子', color: '#DB2777', glyph: 'TV' },
  { id: 'lan', label: 'LAN', color: '#16A34A', glyph: 'LAN' },
  { id: 'aircon', label: 'エアコン', color: '#0891B2', glyph: 'AC' },
  { id: 'memo', label: 'メモ', color: '#8E44AD', glyph: '' },
];

export const getPinKind = (kind: PinKind | undefined): PinKindDef =>
  PIN_KINDS.find((k) => k.id === (kind ?? 'memo')) ?? PIN_KINDS[PIN_KINDS.length - 1];
