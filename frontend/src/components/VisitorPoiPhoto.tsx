import { useState } from 'react';
import { Icon } from './Icon';

import { POI_PHOTOS } from '../data/poiPhotos';

// Presentation-only photos use the stable VI name from the bundle.
// An explicit API image always takes precedence over this local collection.
export function resolveVisitorPhoto(originalName: string, avatarUrl: string | null) {
  if (avatarUrl) return { thumbnail: avatarUrl, detail: avatarUrl, credit: null, label: null, thumbnailWidth: 128, thumbnailHeight: 128, detailWidth: 640, detailHeight: 480 };
  const normalized = originalName.normalize('NFC').trim().toLocaleLowerCase('vi');
  const entry = Object.entries(POI_PHOTOS).find(([name]) => name.normalize('NFC').toLocaleLowerCase('vi') === normalized)?.[1];
  return entry ? { thumbnail: entry.thumbnail.src, detail: entry.detail.src, credit: entry.credit, label: entry.label, thumbnailWidth: entry.thumbnail.width, thumbnailHeight: entry.thumbnail.height, detailWidth: entry.detail.width, detailHeight: entry.detail.height } : null;
}

export function VisitorPoiPhoto({ originalName, name, avatarUrl, category, variant = 'thumbnail' }: {
  originalName: string; name: string; avatarUrl: string | null; category: string | null; variant?: 'thumbnail' | 'detail';
}) {
  const photo = resolveVisitorPhoto(originalName, avatarUrl);
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const source = photo?.[variant === 'detail' ? 'detail' : 'thumbnail'];
  const icon = category?.toUpperCase() === 'ANIMAL' ? 'paw' : category?.toUpperCase() === 'PLANT' ? 'leaf' : 'pin';
  if (!source || source === failedSource) {
    return variant === 'thumbnail' ? <span className="garden-category-icon"><Icon name={icon} /></span>
      : source ? <p className="garden-photo-error" role="status">Chưa tải được ảnh. Bạn vẫn có thể đọc giới thiệu và nghe thuyết minh.</p> : null;
  }
  const img = <img src={source} alt={photo?.label ? `${photo.label}: ${name}` : name} loading="lazy" decoding="async" width={variant === 'detail' ? photo?.detailWidth : photo?.thumbnailWidth} height={variant === 'detail' ? photo?.detailHeight : photo?.thumbnailHeight} onError={() => setFailedSource(source)} />;
  if (variant === 'thumbnail') return <span className="garden-poi-thumbnail">{img}</span>;
  return <figure className="garden-poi-figure">
    {img}
    {photo?.label && <figcaption>
      <span>{photo.label}</span>
      <span>{photo.credit && <><a href={photo.credit.source} target="_blank" rel="noreferrer">{photo.credit.author}</a> · <a href={photo.credit.licenseUrl} target="_blank" rel="noreferrer">{photo.credit.license}</a> · </>}<a href="/images/pois/SOURCES.md" target="_blank" rel="noreferrer">Nguồn ảnh</a></span>
    </figcaption>}
  </figure>;
}
