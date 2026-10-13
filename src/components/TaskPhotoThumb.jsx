import React, { useState, useEffect } from 'react';
import { ImageOff } from 'lucide-react';
import { resolvePhotoUrl } from '../utils/taskPhotos';

/**
 * A single evidence-photo thumbnail. Always resolves its URL through the
 * same helper (resolvePhotoUrl) and ALWAYS shows a clear, labeled
 * placeholder - never a browser's broken-image icon - if the photo fails
 * to load (wrong host, the file no longer exists on disk, a dead S3 link,
 * etc.), so a broken photo is still informative instead of a mystery box.
 */
const TaskPhotoThumb = ({ file, className = 'w-16 h-16', onClick, title }) => {
  const [failed, setFailed] = useState(false);
  const src = resolvePhotoUrl(file?.fileUrl);

  // A different photo (new src) deserves a fresh attempt at loading.
  useEffect(() => { setFailed(false); }, [src]);

  const Wrapper = onClick ? 'button' : 'div';
  const wrapperProps = onClick ? { type: 'button', onClick } : {};

  if (failed || !src) {
    return (
      <Wrapper
        {...wrapperProps}
        title={file?.fileName || 'Photo failed to load'}
        className={`${className} rounded-xl border border-dashed border-border bg-background flex flex-col items-center justify-center gap-0.5 p-1 text-center`}
      >
        <ImageOff size={16} className="text-slate-400 shrink-0" />
        <span className="text-[7px] font-black uppercase tracking-tight text-slate-400 leading-tight break-all line-clamp-2">
          {file?.fileName || 'Image unavailable'}
        </span>
      </Wrapper>
    );
  }

  return (
    <Wrapper {...wrapperProps} title={title || file?.fileName}>
      <img
        src={src}
        alt={file?.fileName || 'evidence'}
        onError={() => setFailed(true)}
        className={`${className} object-cover rounded-xl border border-border hover:border-primary transition-all`}
      />
    </Wrapper>
  );
};

export default TaskPhotoThumb;
