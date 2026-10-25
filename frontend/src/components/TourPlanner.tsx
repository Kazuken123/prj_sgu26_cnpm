import { useState } from 'react';
import type { PoiDto, TourDto } from '../api/content';
import { nearestTour, Position } from '../api/tourPlanning';
import { calculateHaversineDistance } from './MapView';
import { VisitorPoiPhoto } from './VisitorPoiPhoto';

export function TourPlanner({ pois, location, activeTour, onApply }: {
  pois: PoiDto[]; location: Position | null; activeTour: TourDto | null; onApply: (tour: TourDto | null) => void;
}) {
  const [ids, setIds] = useState<number[]>([]);
  const [start, setStart] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const ordered = activeTour ? [...activeTour.items].sort((a, b) => a.sequenceNo - b.sequenceNo).map(i => pois.find(p => p.poiId === i.poiId)) : [];
  const sampleDistance = ordered.reduce((sum, p, i) => p && i && ordered[i - 1]
    ? sum + calculateHaversineDistance(ordered[i - 1]!.latitude, ordered[i - 1]!.longitude, p.latitude, p.longitude) : sum, 0);
  const apply = (selected: number[]) => {
    const origin = start === 'location' ? location : pois.find(p => p.poiId === Number(start || selected[0]));
    if (!origin) { setError('Chọn điểm xuất phát; hiện chưa có vị trí của bạn.'); return; }
    try { const result = nearestTour(pois, selected, origin); onApply(result.tour); setDistance(result.distance); setError(null); }
    catch (err) { setError(err instanceof Error ? err.message : 'Chưa tạo được lộ trình.'); }
  };
  return <section aria-label="Tùy chỉnh lộ trình" className="garden-tour-planner">
    <h3>Chọn điểm muốn ghé</h3>
    <p>Chọn các điểm muốn ghé. Thứ tự được gợi ý theo điểm gần tiếp theo, không phải tuyến đi bộ hay đường ngắn nhất.</p>
    {activeTour && <button type="button" className="btn-secondary" onClick={() => { setIds(activeTour.items.map(i => i.poiId)); setDistance(null); setError(null); }}>Dùng các điểm của lộ trình đang chọn</button>}
    <p className="garden-tour-selection" aria-live="polite">Đã chọn {ids.length}/{pois.length} điểm</p>
    <div role="group" aria-label="Các điểm muốn ghé" className="garden-tour-options">
      {pois.map(p => <label key={p.poiId} className={`garden-tour-choice${ids.includes(p.poiId) ? ' is-selected' : ''}`}><input type="checkbox" checked={ids.includes(p.poiId)} onChange={e => {
        setIds(prev => e.target.checked ? [...prev.filter(id => id !== p.poiId), p.poiId] : prev.filter(id => id !== p.poiId));
        setDistance(null);
      }} /><span className="garden-tour-photo" aria-hidden="true"><VisitorPoiPhoto originalName={p.originalName} name={p.text.name || p.originalName} avatarUrl={p.avatarUrl} category={p.category} /></span><span className="garden-tour-name">{p.text.name || p.originalName}</span></label>)}
    </div>
    <label className="garden-field">Điểm xuất phát <select aria-label="Điểm xuất phát lộ trình" value={start} onChange={e => { setStart(e.target.value); setDistance(null); }}>
      <option value="">Điểm đầu tiên đã chọn</option>
      {location && <option value="location">Vị trí đang dùng trên bản đồ</option>}
      {pois.map(p => <option key={p.poiId} value={p.poiId}>{p.text.name || p.originalName}</option>)}
    </select></label>
    <div className="garden-tour-actions">
      <button type="button" className="btn-primary" onClick={() => apply(ids)}>Sắp xếp và xem lộ trình</button>
      <button type="button" className="btn-secondary" onClick={() => { setIds([]); setDistance(null); setError(null); onApply(null); }}>Xóa lộ trình của bạn</button>
    </div>
    {error && <p role="alert">{error}</p>}
    {distance !== null && activeTour?.tourId === -1 && <p role="status">Tổng khoảng cách đường nối ước tính: {distance} m. Không dùng để xác nhận đường đi hoặc khả năng tiếp cận.</p>}
    {activeTour && activeTour.tourId !== -1 && ordered.length > 1 && <p>Tổng khoảng cách đường nối giữa các điểm: khoảng {sampleDistance} m, không phải đường đi bộ.</p>}
    {activeTour && <ol className="garden-tour-order" aria-label="Thứ tự ghé thăm">{[...activeTour.items].sort((a, b) => a.sequenceNo - b.sequenceNo).map((item, index) => {
      const p = pois.find(p => p.poiId === item.poiId);
      return <li key={item.poiId}><span className="garden-tour-number" aria-hidden="true">{index + 1}</span><span className="garden-tour-photo" aria-hidden="true">{p && <VisitorPoiPhoto originalName={p.originalName} name={p.text.name || p.originalName} avatarUrl={p.avatarUrl} category={p.category} />}</span><span className="garden-tour-name">{p?.text.name || p?.originalName || 'Điểm chưa có dữ liệu'}{p && p.audio.status !== 'AVAILABLE' ? ' — âm thanh chưa sẵn sàng' : ''}</span></li>;
    })}</ol>}
  </section>;
}
