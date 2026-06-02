import { useEffect, useState } from 'react';
import { Layer, Image as KonvaImage } from 'react-konva';
import { useAppStore } from '../../store/useAppStore';

export function FloorplanLayer() {
  const floorplan = useAppStore((s) => s.project.floorplan);
  const [htmlImage, setHtmlImage] = useState<HTMLImageElement | null>(null);

  // Re-create HTMLImageElement whenever the stored base64 data changes
  useEffect(() => {
    if (!floorplan) { setHtmlImage(null); return; }
    const img = new window.Image();
    img.onload = () => setHtmlImage(img);
    img.src = floorplan.dataUrl;
  }, [floorplan]);

  if (!floorplan || !htmlImage) return <Layer />;

  return (
    <Layer>
      <KonvaImage
        image={htmlImage}
        x={0}
        y={0}
        width={floorplan.widthPx}
        height={floorplan.heightPx}
        listening={false}   // floor plan does not receive pointer events
      />
    </Layer>
  );
}
