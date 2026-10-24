import React, { useState } from 'react';
import { Icon } from './Icon';

export const PoiImage: React.FC<{ src: string | null; name: string; category: string | null; className?: string }> = ({ src, name, category, className = '' }) => {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const icon = category?.toUpperCase() === 'ANIMAL' ? 'paw' : category?.toUpperCase() === 'PLANT' ? 'leaf' : 'pin';
  return <div className={`poi-photo ${className}`}>
    {src && failedSrc !== src ? <img src={src} alt={name} loading="lazy" decoding="async" onError={() => setFailedSrc(src)} /> : <div className="poi-photo-placeholder" role="img" aria-label={`Chưa có ảnh ${name}`}><Icon name={icon} /><span>Ảnh đang cập nhật</span></div>}
  </div>;
};
