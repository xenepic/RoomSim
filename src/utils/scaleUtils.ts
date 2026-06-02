import type { ScaleSetting, TatamiType } from '../types';

export const DEFAULT_PIXELS_PER_CM = 2;

// Standard tatami dimensions and areas by regional type
export const TATAMI_SIZES: Record<TatamiType, { widthCm: number; depthCm: number; areaCm2: number }> = {
  edo:    { widthCm: 176,   depthCm: 88,   areaCm2: 176   * 88   },  // 関東間
  kyo:    { widthCm: 191,   depthCm: 95.5, areaCm2: 191   * 95.5 },  // 京間
  chukyo: { widthCm: 182,   depthCm: 91,   areaCm2: 182   * 91   },  // 中京間
  danchi: { widthCm: 170,   depthCm: 85,   areaCm2: 170   * 85   },  // 団地間
};

export function getPixelsPerCm(scale?: ScaleSetting): number {
  return scale?.pixelsPerCm ?? DEFAULT_PIXELS_PER_CM;
}

export function cmToPx(cm: number, scale?: ScaleSetting): number {
  return cm * getPixelsPerCm(scale);
}

export function pxToCm(px: number, scale?: ScaleSetting): number {
  return px / getPixelsPerCm(scale);
}

// Round a cm value to the nearest grid step
export function snapToCm(valueCm: number, gridSizeCm: number): number {
  return Math.round(valueCm / gridSizeCm) * gridSizeCm;
}

/**
 * Estimate pixelsPerCm from a user-drawn rectangle over a room area.
 * Formula: pixelsPerCm = sqrt(rectAreaPx^2 / roomAreaCm^2)
 * Compatible with future closed-region recognition (same formula, automatic area input).
 */
export function estimateScaleFromTatami(
  rectWidthPx: number,
  rectHeightPx: number,
  tatamiCount: number,
  tatamiType: TatamiType,
): number {
  const { areaCm2 } = TATAMI_SIZES[tatamiType];
  const roomAreaCm2 = tatamiCount * areaCm2;
  const rectAreaPx2 = rectWidthPx * rectHeightPx;
  return Math.sqrt(rectAreaPx2 / roomAreaCm2);
}
