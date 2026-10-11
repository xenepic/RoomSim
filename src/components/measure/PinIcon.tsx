import { getPinKind } from '../../data/pinKinds';
import type { PinKind } from '../../types';

// HTML version of the canvas pin (MeasureLayer) for the picker, list and editor.
// `number` labels memo pins; without it a memo shows a pencil.
export function PinIcon({ kind, number, size = 20 }: { kind: PinKind | undefined; number?: number; size?: number }) {
  const def = getPinKind(kind);
  const text = def.id === 'memo' ? (number !== undefined ? String(number) : '✎') : def.glyph;
  return (
    <svg width={size} height={size} viewBox="-12 -12 24 24" style={{ flex: 'none', display: 'block' }} aria-hidden>
      <circle r={11} fill={def.color} stroke="#fff" strokeWidth={1.5} />
      {def.id === 'outlet' ? (
        <>
          <rect x={-5} y={-4.5} width={2.6} height={9} rx={1} fill="#fff" />
          <rect x={2.4} y={-4.5} width={2.6} height={9} rx={1} fill="#fff" />
        </>
      ) : (
        <text
          y={0.5} textAnchor="middle" dominantBaseline="middle" fill="#fff" fontWeight="bold"
          fontSize={text.length >= 3 ? 7.5 : text.length === 2 ? 9 : 11}
        >
          {text}
        </text>
      )}
    </svg>
  );
}
