import React, { useMemo, useEffect } from 'react';
import { X, FileText, FileSpreadsheet, FileArchive, File as FileIcon } from 'lucide-react';
import { isImageFile, fileExt } from '../utils/uploadLimit';

export const iconForExt = (ext) => {
  if (['xls', 'xlsx', 'csv', 'ods'].includes(ext)) return FileSpreadsheet;
  if (['zip', 'rar', '7z', 'gz', 'tar'].includes(ext)) return FileArchive;
  if (['pdf', 'doc', 'docx', 'txt', 'ppt', 'pptx', 'rtf'].includes(ext)) return FileText;
  return FileIcon;
};

/** Preview of a file the user has picked but not yet sent: a picture for images, a labelled tile for everything else. */
const LocalFileThumb = ({ file, onRemove, className = 'w-16 h-16' }) => {
  const img = isImageFile(file);
  const url = useMemo(() => (img ? URL.createObjectURL(file) : ''), [file, img]);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);
  const ext = fileExt(file.name);
  const Icon = iconForExt(ext);
  return (
    <div className="relative" title={file.name}>
      {img ? (
        <img src={url} alt={file.name} className={`${className} object-cover rounded-lg border border-border`} />
      ) : (
        <div className={`${className} rounded-lg border border-border bg-background flex flex-col items-center justify-center gap-0.5 p-1 text-center overflow-hidden`}>
          <Icon size={18} className="text-primary shrink-0" />
          <span className="text-[7px] font-black uppercase tracking-tight text-slate-500 leading-tight break-all line-clamp-2">{file.name}</span>
        </div>
      )}
      {onRemove && (
        <button type="button" onClick={onRemove} aria-label={`Remove ${file.name}`}
          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center">
          <X size={10} />
        </button>
      )}
    </div>
  );
};

export default LocalFileThumb;
