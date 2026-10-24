import type { PoiDto, TourDto } from './content';
import { calculateHaversineDistance } from '../components/MapView';

export type Position = { latitude: number; longitude: number };
export function nearestTour(pois: PoiDto[], ids: number[], start: Position): { tour: TourDto; distance: number } {
  if (!ids.length || new Set(ids).size !== ids.length || !Number.isFinite(start.latitude) || Math.abs(start.latitude) > 90 ||
      !Number.isFinite(start.longitude) || Math.abs(start.longitude) > 180) throw new Error('Chọn điểm ghé và điểm xuất phát hợp lệ.');
  const remaining = ids.map(id => pois.find(p => p.poiId === id));
  if (remaining.some(p => !p || !Number.isFinite(p.latitude) || Math.abs(p.latitude) > 90 || !Number.isFinite(p.longitude) || Math.abs(p.longitude) > 180)) throw new Error('Điểm ghé không còn trong gói nội dung.');
  let current = start, distance = 0;
  const ordered: PoiDto[] = [];
  while (remaining.length) {
    remaining.sort((a, b) => calculateHaversineDistance(current.latitude, current.longitude, a!.latitude, a!.longitude) -
      calculateHaversineDistance(current.latitude, current.longitude, b!.latitude, b!.longitude) || a!.poiId - b!.poiId);
    const point = remaining.shift()! as PoiDto;
    distance += calculateHaversineDistance(current.latitude, current.longitude, point.latitude, point.longitude);
    ordered.push(point); current = point;
  }
  return { distance, tour: { tourId: -1, name: 'Lộ trình của bạn', description: 'Đường nối và khoảng cách ước tính; không phải đường đi bộ thực tế.',
    localization: 'SHARED', items: ordered.map((p, index) => ({ poiId: p.poiId, sequenceNo: index + 1 })) } };
}
