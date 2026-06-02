import { useRef } from 'react';
import { useAppStore } from '../../store/useAppStore';

export function ImageUploader() {
  const inputRef = useRef<HTMLInputElement>(null);
  const setFloorplan = useAppStore((s) => s.setFloorplan);
  const hasFloorplan = useAppStore((s) => !!s.project.floorplan);

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
      <button onClick={() => inputRef.current?.click()} style={{ width: '100%' }}>
        {hasFloorplan ? '画像を変更' : '画像をアップロード'}
      </button>
    </div>
  );
}
