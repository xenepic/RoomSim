import { useEffect, useState } from 'react';
import { Layer, Image as KonvaImage } from 'react-konva';
import { useAppStore } from '../../store/useAppStore';
import type { FloorplanImage } from '../../types';

export type LoadedFloorplan = { floorplan: FloorplanImage; image: HTMLImageElement };

// Decoded floorplan image, shared by FloorplanLayer and PlanLayer (the underlay)
export function useFloorplanImage(): LoadedFloorplan | null {
  const floorplan = useAppStore((s) => s.project.floorplan);
  const [loaded, setLoaded] = useState<LoadedFloorplan | null>(null);

  // Re-create HTMLImageElement whenever the stored base64 data changes
  useEffect(() => {
    if (!floorplan) { setLoaded(null); return; }
    const img = new window.Image();
    img.onload = () => setLoaded({ floorplan, image: img });
    img.src = floorplan.dataUrl;
  }, [floorplan]);

  return loaded && loaded.floorplan === floorplan ? loaded : null;
}

export function FloorplanLayer({ loaded }: { loaded: LoadedFloorplan | null }) {
  if (!loaded) return <Layer />;

  return (
    <Layer>
      <KonvaImage
        image={loaded.image}
        x={0}
        y={0}
        width={loaded.floorplan.widthPx}
        height={loaded.floorplan.heightPx}
        listening={false}   // floor plan does not receive pointer events
      />
    </Layer>
  );
}
