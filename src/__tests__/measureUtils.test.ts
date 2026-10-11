import { describe, test, expect } from 'vitest';
import { snapToAxis, parseCm, formatCm } from '../utils/measureUtils';
import { normalizeProject } from '../utils/projectUtils';

describe('snapToAxis', () => {
  const a = { x: 100, y: 100 };
  test('snaps near-horizontal lines in either direction', () => {
    expect(snapToAxis(a, { x: 300, y: 110 })).toEqual({ x: 300, y: 100 });
    expect(snapToAxis(a, { x: -100, y: 90 })).toEqual({ x: -100, y: 100 });
  });
  test('snaps near-vertical lines', () => {
    expect(snapToAxis(a, { x: 108, y: 300 })).toEqual({ x: 100, y: 300 });
  });
  test('keeps diagonal lines', () => {
    expect(snapToAxis(a, { x: 200, y: 200 })).toEqual({ x: 200, y: 200 });
  });
});

describe('parseCm / formatCm', () => {
  test('parses decimals and rejects empty/invalid/non-positive', () => {
    expect(parseCm('350')).toBe(350);
    expect(parseCm(' 85.5 ')).toBe(85.5);
    expect(parseCm('85,5')).toBe(85.5);
    expect(parseCm('')).toBeNull();
    expect(parseCm('abc')).toBeNull();
    expect(parseCm('0')).toBeNull();
  });
  test('formats unmeasured values as "? cm"', () => {
    expect(formatCm(null)).toBe('? cm');
    expect(formatCm(120.5)).toBe('120.5cm');
  });
});

describe('normalizeProject', () => {
  test('fills measurement arrays missing from older saved data', () => {
    const p = normalizeProject({ id: 'x', name: 'old', furniture: [], snapGrid: { enabled: true, sizeCm: 10 } });
    expect(p).toMatchObject({ id: 'x', name: 'old', dimensions: [], memos: [], snapGrid: { enabled: true, sizeCm: 10 } });
  });
});
