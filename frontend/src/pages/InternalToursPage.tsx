import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getTours, TourDto } from '../api/tour';
import { getPois, PoiDto } from '../api/poi';
import { executeAuthenticatedInternalRequest } from '../api/auth';
import { getApiBaseUrl } from '../api/client';
import { Icon } from '../components/Icon';
import { AdminPage, PageHeader, Card, Alert, EmptyState, LoadingState, Pagination } from '../components/admin/AdminUI';

export const InternalToursPage: React.FC = () => {
  const baseUrl = getApiBaseUrl();

  const [tours, setTours] = useState<TourDto[]>([]);
  const [pois, setPois] = useState<PoiDto[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async (currentPage = 1) => {
    setLoading(true);
    setError(null);
    try {
      const [tourRes, poiRes] = await Promise.all([
        executeAuthenticatedInternalRequest(baseUrl, token => getTours({ page: currentPage, limit: 10 }, token, baseUrl)),
        executeAuthenticatedInternalRequest(baseUrl, token => getPois(token, { limit: 100 }, baseUrl))
      ]);
      setTours(tourRes.items);
      setTotal(tourRes.total);
      setPage(tourRes.page);
      setPois(poiRes.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải danh sách lộ trình');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(1);
  }, []);

  const totalPages = Math.max(1, Math.ceil(total / 10));
  return (
    <AdminPage>
      <PageHeader eyebrow="Nội dung thuyết minh" title="Quản lý lộ trình tham quan (Tours)"
        description="Thiết lập các lộ trình mẫu với thứ tự POI ghé thăm để du khách lựa chọn khi tham quan."
        actions={<Link to="/internal/tours/new" className="adm-btn adm-btn--primary"><Icon name="plus" />Tạo lộ trình mẫu mới</Link>} />

      {error && <Alert tone="danger" action={<button type="button" className="adm-btn adm-btn--secondary adm-btn--sm" onClick={() => loadData(page)}>Thử lại</button>}>{error}</Alert>}

      {loading ? (
        <Card><LoadingState label="Đang tải danh sách lộ trình..." /></Card>
      ) : tours.length === 0 ? (
        <Card><EmptyState icon="map" title="Chưa có lộ trình mẫu nào được tạo." action={<Link to="/internal/tours/new" className="adm-btn adm-btn--primary adm-btn--sm"><Icon name="plus" />Tạo lộ trình mẫu mới</Link>}>Nhấn "Tạo lộ trình mẫu mới" để bắt đầu.</EmptyState></Card>
      ) : (
        <div className="adm-grid adm-grid--2" style={{ alignItems: 'start' }}>
          {tours.map((tour) => {
            const sortedItems = [...tour.items].sort((a, b) => a.sequenceNo - b.sequenceNo);
            return (
              <Card key={tour.tourId} title={tour.name} description={tour.description || 'Chưa có mô tả'}
                actions={<Link to={`/internal/tours/${tour.tourId}/edit`} className="adm-btn adm-btn--secondary adm-btn--sm"><Icon name="edit" />Chỉnh sửa</Link>}>
                <p className="adm-label" style={{ margin: '0 0 10px' }}>Các trạm dừng trong lộ trình ({sortedItems.length} trạm)</p>
                <ol className="adm-tour-stops">
                  {sortedItems.map((item) => {
                    const poi = pois.find((p) => p.poiId === item.poiId);
                    const poiName = item.poiName || (poi ? poi.name : `POI #${item.poiId}`);
                    return <li key={`${tour.tourId}-${item.poiId}`}><span>{item.sequenceNo}</span>{poiName}</li>;
                  })}
                </ol>
              </Card>
            );
          })}
        </div>
      )}

      {total > 0 && <Card flush><Pagination page={page} totalPages={totalPages} disabled={loading}
        summary={<>Tổng cộng: <strong>{total}</strong> lộ trình</>} onChange={next => loadData(next)} /></Card>}
    </AdminPage>
  );
};
