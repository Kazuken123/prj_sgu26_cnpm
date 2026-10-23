import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getTours, TourDto } from '../api/tour';
import { getPois, PoiDto } from '../api/poi';
import { executeAuthenticatedInternalRequest } from '../api/auth';
import { getApiBaseUrl } from '../api/client';

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

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', color: '#132a13', margin: 0, fontWeight: 700 }}>
            Quản Lý Lộ Trình Tham Quan (Tours)
          </h1>
          <p style={{ color: '#4b5563', fontSize: '0.86rem', margin: '4px 0 0' }}>
            Thiết lập các lộ trình mẫu với thứ tự POI ghé thăm để du khách lựa chọn khi tham quan
          </p>
        </div>

        <Link
          to="/internal/tours/new"
          className="btn-primary"
          style={{ padding: '8px 18px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <span>➕</span>
          <span>Tạo lộ trình mẫu mới</span>
        </Link>
      </div>

      {error && (
        <div className="banner-notice" style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', marginBottom: '16px' }}>
          <div>{error}</div>
        </div>
      )}

      {loading ? (
        <div className="tcv-card" style={{ textAlign: 'center', padding: '40px' }}>
          Đang tải danh sách lộ trình...
        </div>
      ) : tours.length === 0 ? (
        <div className="tcv-card" style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
          Chưa có lộ trình mẫu nào được tạo. Nhấn "Tạo lộ trình mẫu mới" để bắt đầu.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {tours.map((tour) => {
            const sortedItems = [...tour.items].sort((a, b) => a.sequenceNo - b.sequenceNo);
            return (
              <div key={tour.tourId} className="tcv-card" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <h3 style={{ margin: '0 0 6px', fontSize: '1.2rem', color: '#14532d' }}>
                      {tour.name}
                    </h3>
                    <p style={{ margin: 0, color: '#4b5563', fontSize: '0.9rem', lineHeight: 1.5 }}>
                      {tour.description || 'Chưa có mô tả'}
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Link
                      to={`/internal/tours/${tour.tourId}/edit`}
                      className="btn-secondary btn-sm"
                      style={{ textDecoration: 'none', padding: '6px 14px' }}
                    >
                      ✏️ Chỉnh sửa
                    </Link>
                  </div>
                </div>

                <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid #e5e7eb' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.84rem', color: '#374151', marginBottom: '8px' }}>
                    Các trạm dừng trong lộ trình ({sortedItems.length} trạm):
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {sortedItems.map((item) => {
                      const poi = pois.find((p) => p.poiId === item.poiId);
                      const poiName = item.poiName || (poi ? poi.name : `POI #${item.poiId}`);
                      return (
                        <div
                          key={`${tour.tourId}-${item.poiId}`}
                          style={{
                            background: '#f0fdf4',
                            border: '1px solid #bbf7d0',
                            borderRadius: '20px',
                            padding: '4px 12px',
                            fontSize: '0.82rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            color: '#166534'
                          }}
                        >
                          <span style={{
                            background: '#15803d',
                            color: '#fff',
                            borderRadius: '50%',
                            width: '18px',
                            height: '18px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.72rem',
                            fontWeight: 700
                          }}>
                            {item.sequenceNo}
                          </span>
                          <span>{poiName}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {total > 0 && (
        <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.84rem', color: '#6b7280' }}>
          <div>Tổng cộng: <strong>{total}</strong> lộ trình (Trang {page})</div>
        </div>
      )}
    </div>
  );
};
