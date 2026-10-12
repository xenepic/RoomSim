import Konva from 'konva';
import type { Project } from '../types';
import { planBounds } from './planUtils';
import { getPixelsPerCm } from './scaleUtils';

const MARGIN_CM = 30;
const OUT_PX_PER_CM = 3;
const MAX_OUT_PX = 6000;

/**
 * Save the drawn plan with the furniture as a PNG (plan mode). Renders the current
 * Stage over the plan's bounds, without editing aids (selection, handles, underlay,
 * measure lines; nodes named 'export-hide' and Transformers) and with the furniture
 * at full opacity. Returns false if there is nothing to export.
 */
export function exportPlanPng(project: Project): boolean {
  const stage = Konva.stages[0];
  const b = project.plan && planBounds(project.plan, project.furniture);
  if (!stage || !b) return false;

  const ppc = getPixelsPerCm(project.scale);
  const s = stage.scaleX();
  const w = b.w + 2 * MARGIN_CM;
  const h = b.h + 2 * MARGIN_CM;
  const outPxPerCm = Math.min(OUT_PX_PER_CM, MAX_OUT_PX / Math.max(w, h));

  const hidden = [...stage.find('.export-hide'), ...stage.find('Transformer')].filter((n) => n.visible());
  hidden.forEach((n) => n.visible(false));
  const furnitureLayer = stage.findOne('.furniture-layer');
  const furnitureOpacity = furnitureLayer?.opacity();
  furnitureLayer?.opacity(1);
  let canvas: HTMLCanvasElement;
  try {
    canvas = stage.toCanvas({
      x: (b.x - MARGIN_CM) * ppc * s + stage.x(),
      y: (b.y - MARGIN_CM) * ppc * s + stage.y(),
      width: w * ppc * s,
      height: h * ppc * s,
      pixelRatio: outPxPerCm / (ppc * s),
    });
  } finally {
    hidden.forEach((n) => n.visible(true));
    if (furnitureOpacity !== undefined) furnitureLayer?.opacity(furnitureOpacity);
    stage.batchDraw();
  }

  // The Stage is transparent: put it on white
  const out = document.createElement('canvas');
  out.width = canvas.width;
  out.height = canvas.height;
  const ctx = out.getContext('2d')!;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.drawImage(canvas, 0, 0);
  out.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name.replace(/[\\/:*?"<>|]/g, '_') || 'roomsim'}_間取り図.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, 'image/png');
  return true;
}
