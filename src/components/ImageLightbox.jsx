import React, { useState, useEffect, useCallback } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw, ChevronLeft, ChevronRight, ImageOff } from 'lucide-react';
import { resolvePhotoUrl, photoCaption } from '../utils/taskPhotos';

/**
 * Full-screen photo GALLERY with zoom. Opened on ANY task photo
 * (row thumbnail, History & Files modal, "+N more" tile) with the FULL
 * set of that task's/entry's photos, not just the one that was clicked -
 * previous/next arrows (buttons + Left/Right keys), a "2 / 3" counter,
 * and zoom in/out/reset on whichever photo is currently shown. Each
 * photo's own caption (who sent it, at which stage, when) updates as you
 * navigate.
 *
 * Props:
 *   photos: array of {fileUrl, fileName, uploadedBy, stage, uploadedAt} | null/[] - empty/null hides it
 *   startIndex: which photo to open on
 *   task: the parent task, for photoCaption's fallback (assignerId.name)
 *   onClose: () => void
 */
const ImageLightbox = ({ photos, startIndex = 0, task, onClose }) => {
  const [index, setIndex] = useState(startIndex);
  const [zoom, setZoom] = useState(1);
  const [failed, setFailed] = useState(false);

  const isOpen = Array.isArray(photos) && photos.length > 0;

  useEffect(() => {
    if (isOpen) setIndex(Math.min(Math.max(startIndex, 0), photos.length - 1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, startIndex, photos]);

  useEffect(() => { setZoom(1); setFailed(false); }, [index]);

  const zoomIn = useCallback(() => setZoom((z) => Math.min(z + 0.5, 4)), []);
  const zoomOut = useCallback(() => setZoom((z) => Math.max(z - 0.5, 1)), []);
  const reset = useCallback(() => setZoom(1), []);
  const goPrev = useCallback(() => setIndex((i) => (i > 0 ? i - 1 : i)), []);
  const goNext = useCallback(() => setIndex((i) => (photos && i < photos.length - 1 ? i + 1 : i)), [photos]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
      if (e.key === '+' || e.key === '=') zoomIn();
      if (e.key === '-') zoomOut();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose, zoomIn, zoomOut, goPrev, goNext]);

  if (!isOpen) return null;

  const photo = photos[index];
  const src = resolvePhotoUrl(photo?.fileUrl);
  const hasPrev = index > 0;
  const hasNext = index < photos.length - 1;

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

      {photos.length > 1 && (
        <div className="absolute top-5 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-white/10 text-white text-xs font-black tracking-widest z-10" onClick={(e) => e.stopPropagation()}>
          {index + 1} / {photos.length}
        </div>
      )}

      {hasPrev && (
        <button onClick={(e) => { e.stopPropagation(); goPrev(); }} className="absolute left-3 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all z-10" title="Previous photo">
          <ChevronLeft size={24} />
        </button>
      )}
      {hasNext && (
        <button onClick={(e) => { e.stopPropagation(); goNext(); }} className="absolute right-3 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all z-10" title="Next photo">
          <ChevronRight size={24} />
        </button>
      )}

      <div className="flex-1 w-full flex items-center justify-center overflow-auto" onClick={(e) => e.stopPropagation()}>
        {failed || !src ? (
          <div className="flex flex-col items-center gap-3 text-white/70 px-8 py-10 rounded-2xl border border-dashed border-white/20">
            <ImageOff size={40} />
            <span className="text-xs font-bold uppercase tracking-widest text-center break-all">{photo?.fileName || 'This photo could not be loaded'}</span>
          </div>
        ) : (
          <img
            key={src}
            src={src}
            alt={photo?.fileName || 'evidence'}
            draggable={false}
            onError={() => setFailed(true)}
            style={{ transform: `scale(${zoom})`, transition: 'transform 0.15s ease-out', cursor: zoom > 1 ? 'grab' : 'default' }}
            className="max-w-full max-h-[75vh] rounded-xl border border-white/10 shadow-2xl select-none"
          />
        )}
      </div>

      <div className="no-auto-sheet mt-4 px-5 py-3 rounded-2xl bg-white/10 backdrop-blur-sm text-white text-xs font-bold text-center max-w-lg" onClick={(e) => e.stopPropagation()}>
        {photoCaption(photo, task)}
      </div>
    </div>
  );
};

export default ImageLightbox;
