import { useRef } from 'react';
import { useAppStore } from '../../store/useAppStore';

export function ImageUploader() {
  const inputRef = useRef<HTMLInputElement>(null);
  const setFloorplan = useAppStore((s) => s.setFloorplan);
  const hasFloorplan = useAppStore((s) => !!s.project.floorplan);
  const hasMeasurements = useAppStore((s) => s.project.dimensions.length + s.project.memos.length > 0);

  const handleClick = () => {
    // Measurements are stored in image pixel coordinates, so a different image misplaces them
    if (hasMeasurements && !window.confirm(
      '図面を差し替えると、寸法線とメモの位置が新しい図面とずれる可能性があります。続けますか？'
    )) return;
    inputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      // Measure natural dimensions before storing
      const img = new window.Image();
      img.onload = () => {
        setFloorplan({ dataUrl, widthPx: img.naturalWidth, heightPx: img.naturalHeight });
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
    e.target.value = '';  // Allow re-uploading the same file
  };

  return (
    <div className="panel-section">
      <h3>間取り画像</h3>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
      <button onClick={handleClick} style={{ width: '100%' }}>
        {hasFloorplan ? '画像を変更' : '画像をアップロード'}
      </button>
    </div>
  );
}
