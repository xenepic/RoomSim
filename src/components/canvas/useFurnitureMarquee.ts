import { useRef, useState } from 'react';
import type { KonvaEventObject } from 'konva/lib/Node';
import { useAppStore } from '../../store/useAppStore';
import { furnitureInRect } from '../../utils/furnitureUtils';
import type { CmPoint } from '../../types';

const CLICK_PX = 4;   // pointer travel below this is a click, not a marquee

export type CmRect = { x: number; y: number; w: number; h: number };

/**
 * Furniture mode: Shift+drag (from anywhere but the Transformer) draws a marquee and
 * adds the furniture entirely inside it to the selection.
 */
export function useFurnitureMarquee(stageScale: number, ppc: number) {
  const [rect, setRect] = useState<CmRect | null>(null);
  const startRef = useRef<CmPoint | null>(null);
  // The click that ends a marquee must not toggle/deselect what is under the pointer
  const swallowClickRef = useRef(false);
  const k = 1 / (ppc * stageScale);

  const pointerCm = (e: KonvaEventObject<PointerEvent>): CmPoint | null => {
    const p = e.target.getStage()?.getRelativePointerPosition();
    return p ? { x: p.x / ppc, y: p.y / ppc } : null;
  };
  const rectOf = (a: CmPoint, b: CmPoint): CmRect =>
    ({ x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(b.x - a.x), h: Math.abs(b.y - a.y) });

  const onPointerDown = (e: KonvaEventObject<PointerEvent>) => {
    swallowClickRef.current = false;
    if (e.evt.button !== 0 || !e.evt.shiftKey) return;
    if (e.target.getParent()?.getClassName() === 'Transformer') return;
    startRef.current = pointerCm(e);
  };

  const onPointerMove = (e: KonvaEventObject<PointerEvent>) => {
    const start = startRef.current;
    const p = start && pointerCm(e);
    if (!start || !p) return;
    if (!rect && Math.hypot(p.x - start.x, p.y - start.y) < CLICK_PX * k) return;
    setRect(rectOf(start, p));
  };

  const onPointerUp = (e: KonvaEventObject<PointerEvent>) => {
    const start = startRef.current;
    startRef.current = null;
    setRect(null);
    const p = start && pointerCm(e);
    if (!start || !p || Math.hypot(p.x - start.x, p.y - start.y) < CLICK_PX * k) return;
    swallowClickRef.current = true;
    const st = useAppStore.getState();
    const sel = st.furnitureSelection;
    const added = furnitureInRect(st.project.furniture, rectOf(start, p)).filter((id) => !sel.includes(id));
    st.setFurnitureSelection([...sel, ...added]);
  };

  const consumeClick = () => {
    const swallow = swallowClickRef.current;
    swallowClickRef.current = false;
    return swallow;
  };

  return { rect, active: rect !== null, handlers: { onPointerDown, onPointerMove, onPointerUp }, consumeClick };
}
