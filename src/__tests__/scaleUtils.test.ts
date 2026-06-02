import { describe, test, expect } from 'vitest';
import {
  DEFAULT_PIXELS_PER_CM,
  getPixelsPerCm,
  cmToPx,
  pxToCm,
  snapToCm,
  estimateScaleFromTatami,
  TATAMI_SIZES,
} from '../utils/scaleUtils';
import type { ScaleSetting } from '../types';

const exactScale: ScaleSetting = { pixelsPerCm: 4, method: 'ruler', accuracy: 'exact' };

describe('getPixelsPerCm', () => {
  test('returns DEFAULT_PIXELS_PER_CM when no scale given', () => {
    expect(getPixelsPerCm(undefined)).toBe(DEFAULT_PIXELS_PER_CM);
  });
  test('returns scale.pixelsPerCm when scale is provided', () => {
    expect(getPixelsPerCm(exactScale)).toBe(4);
  });
});

describe('cmToPx / pxToCm', () => {
  test('cmToPx multiplies by pixelsPerCm', () => {
    expect(cmToPx(100, exactScale)).toBe(400);
  });
  test('pxToCm divides by pixelsPerCm', () => {
    expect(pxToCm(400, exactScale)).toBe(100);
  });
  test('cmToPx and pxToCm are inverses', () => {
    expect(pxToCm(cmToPx(75, exactScale), exactScale)).toBeCloseTo(75);
  });
  test('uses DEFAULT_PIXELS_PER_CM when no scale', () => {
    expect(cmToPx(50)).toBe(50 * DEFAULT_PIXELS_PER_CM);
  });
});

describe('snapToCm', () => {
  test('snaps to nearest grid unit', () => {
    expect(snapToCm(14, 10)).toBe(10);
    expect(snapToCm(16, 10)).toBe(20);
    expect(snapToCm(15, 10)).toBe(20);
  });
});

describe('estimateScaleFromTatami', () => {
  test('returns correct pixelsPerCm using area formula', () => {
    const result = estimateScaleFromTatami(400, 300, 6, 'edo');
    expect(result).toBeCloseTo(Math.sqrt((400 * 300) / (6 * TATAMI_SIZES.edo.areaCm2)), 5);
  });
  test('larger rect gives larger pixelsPerCm', () => {
    const small = estimateScaleFromTatami(400, 300, 6, 'edo');
    const large = estimateScaleFromTatami(800, 600, 6, 'edo');
    expect(large).toBeGreaterThan(small);
  });
});
