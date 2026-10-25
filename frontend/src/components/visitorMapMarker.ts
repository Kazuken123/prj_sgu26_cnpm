import { translateText } from '../i18n/translate';
import type { PoiDto } from '../api/content';
import { iconPaths } from './Icon';
import { resolveVisitorPhoto } from './VisitorPoiPhoto';

function escapeAttribute(value: string) {
  return value.replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[character]!));
}

export function visitorMarkerHtml(poi: Pick<PoiDto, 'originalName' | 'avatarUrl' | 'category' | 'text'>, language = 'vi') {
  const category = poi.category?.toUpperCase();
  const path = category === 'ANIMAL' ? iconPaths.paw : category === 'PLANT' ? iconPaths.leaf : iconPaths.pin;
  const photo = resolveVisitorPhoto(poi.originalName, poi.avatarUrl);
  const name = poi.text?.name || poi.originalName;
  const label = photo?.label ? `${translateText(photo.label, language)}: ${name}` : name;
  // The icon stays underneath the photo so a failed image still leaves a usable marker.
  const fallback = `<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="${path}" /></svg>`;
  const image = photo ? `<img class="garden-marker-photo" src="${escapeAttribute(photo.thumbnail)}" alt="${escapeAttribute(label)}" width="38" height="38" decoding="async" draggable="false" />` : '';
  return `<span class="garden-marker-face">${fallback}${image}</span>`;
}

export function handleMarkerPhotoError(marker: { getElement?: () => HTMLElement | undefined }) {
  const image = marker.getElement?.()?.querySelector('img');
  image?.addEventListener('error', () => image.remove(), { once: true });
}
