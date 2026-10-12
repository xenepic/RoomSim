import { Group, Shape, Text } from 'react-konva';
import type { Context } from 'konva/lib/Context';
import type { PlanFixture } from '../../types';
import { getFixtureKind } from '../../data/planKinds';

const STAIR_TREAD_CM = 25;

const hexToRgba = (hex: string, alpha: number) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
};

/**
 * The look of a fixture, drawn by one sceneFunc (no Konva fill/stroke, so no offscreen
 * canvas). Areas furniture can't use are tinted and hatched; stairs get treads; beams
 * are overhead, so only a dashed outline. k = cm per screen px.
 */
export function FixtureShape({ fixture: f, k }: { fixture: PlanFixture; k: number }) {
  const def = getFixtureKind(f.kind);

  const sceneFunc = (ctx: Context) => {
    const { w, h } = f;
    ctx.setAttr('lineCap', 'butt');
    if (f.kind === 'beam') {
      ctx.beginPath();
      ctx.rect(0, 0, w, h);
      ctx.setLineDash([6 * k, 4 * k]);
      ctx.setAttr('strokeStyle', def.color);
      ctx.setAttr('lineWidth', 1.5 * k);
      ctx.stroke();
      ctx.setLineDash([]);
      return;
    }

    ctx.beginPath();
    ctx.rect(0, 0, w, h);
    ctx.setAttr('fillStyle', hexToRgba(def.color, 0.14));
    ctx.fill();

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, w, h);
    ctx.clip();
    ctx.beginPath();
    if (f.kind === 'stairs') {
      // Treads across the longer side
      if (h >= w) for (let y = STAIR_TREAD_CM; y < h; y += STAIR_TREAD_CM) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
      else for (let x = STAIR_TREAD_CM; x < w; x += STAIR_TREAD_CM) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
    } else {
      // 45° hatch, spaced in screen px but never denser than every 4cm
      const step = Math.max(10 * k, 4);
      for (let s = step; s < w + h; s += step) { ctx.moveTo(s, 0); ctx.lineTo(s - h, h); }
    }
    ctx.setAttr('strokeStyle', hexToRgba(def.color, 0.55));
    ctx.setAttr('lineWidth', 1 * k);
    ctx.stroke();
    ctx.restore();

    ctx.beginPath();
    ctx.rect(0, 0, w, h);
    ctx.setAttr('strokeStyle', def.color);
    ctx.setAttr('lineWidth', 1.5 * k);
    ctx.stroke();
  };

  // Label only when the fixture is big enough on screen to hold it
  const showLabel = f.label && f.w / k >= f.label.length * 11 + 6 && f.h / k >= 16;

  return (
    <Group x={f.x} y={f.y} listening={false}>
      <Shape sceneFunc={sceneFunc} perfectDrawEnabled={false} />
      {showLabel && (
        <Group x={f.w / 2} y={f.h / 2} scaleX={k} scaleY={k}>
          <Text
            text={f.label} x={-100} y={-6} width={200} align="center" fontSize={11} fontStyle="bold"
            fill={def.color}
          />
        </Group>
      )}
    </Group>
  );
}
