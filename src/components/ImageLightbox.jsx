import React, { useState, useEffect, useCallback } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

/**
 * Full-screen photo viewer with zoom in/out, used anywhere a task's
 * uploaded evidence photos are shown (History & Files modal, the
 * row-level "has photos" indicator, etc.) so every viewer sees the same
 * zoomable popup instead of a plain <img>.
 *
 * Props:
 *   photo: { fileUrl, fileName, caption } | null  - null/undefined hides it
 *   onClose: () => void
 */
const ImageLightbox = ({ photo, onClose }) => {
  const [zoom, setZoom] = useState(1);

  // Reset zoom whenever a new photo is opened.
  useEffect(() => { setZoom(1); }, [photo?.fileUrl]);

  const zoomIn = useCallback(() => setZoom((z) => Math.min(z + 0.5, 4)), []);
  const zoomOut = useCallback(() => setZoom((z) => Math.max(z - 0.5, 1)), []);
  const reset = useCallback(() => setZoom(1), []);

  useEffect(() => {
    if (!photo) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
      if (e.key === '+' || e.key === '=') zoomIn();
      if (e.key === '-') zoomOut();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [photo, onClose, zoomIn, zoomOut]);

  if (!photo) return null;

  return (
    <div
      className="fixed inset-0 bg-black/90 z-[10050] flex flex-col items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div className="absolute top-4 right-4 flex items-center gap-2 z-10" onClick={(e) => e.stopPropagation()}>
        <button onClick={zoomOut} disabled={zoom <= 1} className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white disabled:opacity-30 transition-all" title="Zoom out"><ZoomOut size={18} /></button>
        <button onClick={reset} disabled={zoom === 1} className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white disabled:opacity-30 transition-all" title="Reset zoom"><RotateCcw size={16} /></button>
        <button onClick={zoomIn} disabled={zoom >= 4} className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white disabled:opacity-30 transition-all" title="Zoom in"><ZoomIn size={18} /></button>
        <button onClick={onClose} className="p-2.5 rounded-full bg-white/10 hover:bg-red-500/80 text-white transition-all" title="Close"><X size={18} /></button>
      </div>

      <div className="flex-1 w-full flex items-center justify-center overflow-auto" onClick={(e) => e.stopPropagation()}>
        <img
          src={photo.fileUrl}
          alt={photo.fileName || 'evidence'}
          draggable={false}
          style={{ transform: `scale(${zoom})`, transition: 'transform 0.15s ease-out', cursor: zoom > 1 ? 'grab' : 'default' }}
          className="max-w-full max-h-[75vh] rounded-xl border border-white/10 shadow-2xl select-none"
        />
      </div>

      {photo.caption && (
        <div className="mt-4 px-5 py-3 rounded-2xl bg-white/10 backdrop-blur-sm text-white text-xs font-bold text-center max-w-lg" onClick={(e) => e.stopPropagation()}>
          {photo.caption}
        </div>
      )}
    </div>
  );
};

export default ImageLightbox;
