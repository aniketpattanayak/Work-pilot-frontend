import React, { useEffect, useRef, useState } from 'react';
import { runFaceCapture } from '../utils/faceCapture';

/**
 * Full-screen camera box for face check. Calls onResult(descriptors) when done or onCancel() when closed.
 * The camera is switched off as soon as it closes.
 */
const FaceCaptureModal = ({ title = 'Face check', count = 1, onResult, onCancel }) => {
  const videoRef = useRef(null);
  const [hint, setHint] = useState('Starting the camera…');
  const [error, setError] = useState('');

  useEffect(() => {
    const ctl = new AbortController();
    let stream = null;
    (async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error('This browser cannot use the camera. Try Chrome or Safari on a secure (https) page.');
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 } }, audio: false });
        if (ctl.signal.aborted) { stream.getTracks().forEach((t) => t.stop()); return; }
        const v = videoRef.current;
        if (v) { v.srcObject = stream; try { await v.play(); } catch (e) { /* autoplay handles it */ } }
        const descriptors = await runFaceCapture({ video: v, count, onHint: setHint, signal: ctl.signal });
        if (!ctl.signal.aborted) onResult(descriptors);
      } catch (e) {
        if (ctl.signal.aborted || e.message === 'cancelled') return;
        setError(e.name === 'NotAllowedError' ? 'Camera access was blocked. Allow the camera for this site in your browser settings and try again.' : (e.message || 'Could not use the camera.'));
      }
    })();
    return () => { ctl.abort(); if (stream) stream.getTracks().forEach((t) => t.stop()); };
  }, []);

  return (
    <div role="dialog" aria-label={title} className="fixed inset-0 z-[10001] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-[2rem] p-5 md:p-6 w-full max-w-md shadow-2xl">
        <p className="text-sm font-black uppercase tracking-tight text-foreground mb-3">{title}</p>
        <div className="relative rounded-2xl overflow-hidden bg-black aspect-[4/3]">
          <video ref={videoRef} playsInline muted autoPlay className="w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} />
        </div>
        {error ? <p role="alert" className="mt-3 text-sm font-bold text-red-600 dark:text-red-400">{error}</p> : <p aria-live="polite" className="mt-3 text-sm font-black text-primary">{hint}</p>}
        <p className="mt-1 text-[11px] font-bold text-muted-foreground">Your photo is not saved. Only a set of numbers made from your face is used.</p>
        <button type="button" onClick={onCancel} className="mt-4 w-full px-5 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest border border-border bg-background text-foreground">{error ? 'Close' : 'Cancel'}</button>
      </div>
    </div>
  );
};

export default FaceCaptureModal;
