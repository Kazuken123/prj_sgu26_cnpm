import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { getTourDetail, createTour, updateTour } from '../api/tour';
import { getPois, PoiDto } from '../api/poi';
import { loadInternalSession } from '../api/authStorage';
import { getApiBaseUrl } from '../api/client';

export const InternalTourEditPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id);
  const tourId = id ? parseInt(id, 10) : null;

  const baseUrl = getApiBaseUrl();
  const { session } = loadInternalSession(baseUrl);
  const token = session.accessToken || undefined;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedPoiIds, setSelectedPoiIds] = useState<number[]>([]);
  const [expectedRevision, setExpectedRevision] = useState<string>('');

  const [allPois, setAllPois] = useState<PoiDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const poiRes = await getPois(token || '', { limit: 100 }, baseUrl);
        setAllPois(poiRes.items);

        if (isEditMode && tourId) {
          const tourRes = await getTourDetail(tourId, token, baseUrl);
          setName(tourRes.name);
          setDescription(tourRes.description || '');
          setExpectedRevision(tourRes.revision);
          const sorted = [...tourRes.items]
            .sort((a, b) => a.sequenceNo - b.sequenceNo)
            .map((item) => item.poiId);
          setSelectedPoiIds(sorted);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Không thể tải dữ liệu');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, tourId, isEditMode]);

  const handleTogglePoi = (poiId: number) => {
    if (selectedPoiIds.includes(poiId)) {
      setSelectedPoiIds(selectedPoiIds.filter((p) => p !== poiId));
    } else {
      setSelectedPoiIds([...selectedPoiIds, poiId]);
    }
  };

  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    const next = [...selectedPoiIds];
    const temp = next[index - 1];
    next[index - 1] = next[index];
    next[index] = temp;
    setSelectedPoiIds(next);
  };

  const handleMoveDown = (index: number) => {
    if (index >= selectedPoiIds.length - 1) return;
    const next = [...selectedPoiIds];
    const temp = next[index + 1];
    next[index + 1] = next[index];
    next[index] = temp;
    setSelectedPoiIds(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditMode && !expectedRevision) {
      setError('Chưa có phiên bản tour để đối chiếu. Vui lòng tải lại trang trước khi lưu.');
      return;
    }
    if (!name.trim()) {
      setError('Vui lòng nhập tên lộ trình');
      return;
    }
    if (selectedPoiIds.length === 0) {
      setError('Vui lòng chọn ít nhất 1 điểm tham quan cho lộ trình');
      return;
    }

    setSubmitting(true);
    setError(null);

    const items = selectedPoiIds.map((poiId, index) => ({
      poiId,
      sequenceNo: index + 1
    }));

    try {
      if (isEditMode && tourId) {
        await updateTour(
          tourId,
          {
            name: name.trim(),
            description: description.trim() || null,
            items,
            expectedRevision
          },
          token,
          baseUrl
        );
      } else {
        await createTour(
          {
            name: name.trim(),
            description: description.trim() || null,
            items
          },
          token,
          baseUrl
        );
      }

      navigate('/internal/tours');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi khi lưu lộ trình');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ maxWidth: '800px', margin: '40px auto', padding: '20px', textAlign: 'center' }}>
        Đang tải thông tin lộ trình...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '24px 16px' }}>
      <div style={{ marginBottom: '20px' }}>
        <Link to="/internal/tours" style={{ color: '#15803d', textDecoration: 'none', fontSize: '0.86rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <span>←</span>
          <span>Quay lại danh sách lộ trình</span>
        </Link>
        <h1 style={{ fontSize: '1.6rem', color: '#132a13', margin: '8px 0 0', fontWeight: 700 }}>
          {isEditMode ? 'Chỉnh Sửa Lộ Trình Mẫu' : 'Tạo Lộ Trình Mẫu Mới'}
        </h1>
      </div>

      {error && (
        <div className="banner-notice" style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', marginBottom: '16px' }}>
          <div>{error}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="tcv-card" style={{ padding: '24px' }}>
        <div style={{ marginBottom: '18px' }}>
          <label style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '6px', color: '#374151' }}>
            Tên lộ trình tham quan <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ví dụ: Tour Động vật hoang dã & Cây cổ thụ di sản"
            required
            style={{ width: '100%', padding: '10px 12px', borderRadius: '4px', border: '1px solid #d1d5db', fontSize: '0.95rem' }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '6px', color: '#374151' }}>
            Mô tả tóm tắt lộ trình
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Mô tả các điểm nhấn, thời lượng dự kiến và lộ trình di chuyển..."
            rows={3}
            style={{ width: '100%', padding: '10px 12px', borderRadius: '4px', border: '1px solid #d1d5db', fontSize: '0.95rem' }}
          />
        </div>

        {/* Chon cac diem tham quan */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <label style={{ fontWeight: 600, fontSize: '0.95rem', color: '#14532d' }}>
              Thứ tự các trạm trong lộ trình ({selectedPoiIds.length} trạm đã chọn) <span style={{ color: '#dc2626' }}>*</span>
            </label>
          </div>

          {selectedPoiIds.length === 0 ? (
            <div style={{ padding: '16px', background: '#f9fafb', border: '1px dashed #d1d5db', borderRadius: '6px', color: '#6b7280', fontSize: '0.86rem', textAlign: 'center' }}>
              Chưa chọn trạm nào. Vui lòng tick chọn từ danh sách các điểm tham quan phía dưới.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
              {selectedPoiIds.map((poiId, index) => {
                const poi = allPois.find((p) => p.poiId === poiId);
                const poiName = poi ? poi.name : `POI #${poiId}`;
                return (
                  <div
                    key={poiId}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 14px',
                      background: '#f0fdf4',
                      border: '1px solid #bbf7d0',
                      borderRadius: '6px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{
                        background: '#15803d',
                        color: '#fff',
                        borderRadius: '50%',
                        width: '24px',
                        height: '24px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '0.8rem'
                      }}>
                        {index + 1}
                      </span>
                      <span style={{ fontWeight: 600, color: '#166534', fontSize: '0.9rem' }}>
                        {poiName}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        type="button"
                        onClick={() => handleMoveUp(index)}
                        disabled={index === 0}
                        className="btn-secondary btn-sm"
                        style={{ padding: '4px 8px', fontSize: '0.78rem' }}
                        title="Di chuyển lên trước"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveDown(index)}
                        disabled={index === selectedPoiIds.length - 1}
                        className="btn-secondary btn-sm"
                        style={{ padding: '4px 8px', fontSize: '0.78rem' }}
                        title="Di chuyển xuống sau"
                      >
                        ▼
                      </button>
                      <button
                        type="button"
                        onClick={() => handleTogglePoi(poiId)}
                        className="btn-sm"
                        style={{ padding: '4px 8px', fontSize: '0.78rem', background: '#fee2e2', color: '#991b1b', border: 'none' }}
                        title="Xóa trạm khỏi tour"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Danh sach tat ca POI de chon */}
          <div style={{ marginTop: '16px' }}>
            <div style={{ fontWeight: 600, fontSize: '0.86rem', color: '#374151', marginBottom: '8px' }}>
              Chọn điểm tham quan từ kho dữ liệu:
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
              gap: '8px',
              maxHeight: '260px',
              overflowY: 'auto',
              padding: '8px',
              background: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: '6px'
            }}>
              {allPois.map((poi) => {
                const isSelected = selectedPoiIds.includes(poi.poiId);
                return (
                  <label
                    key={poi.poiId}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '6px 10px',
                      borderRadius: '4px',
                      background: isSelected ? '#dcfce7' : '#fff',
                      border: isSelected ? '1px solid #86efac' : '1px solid #e5e7eb',
                      cursor: 'pointer',
                      fontSize: '0.84rem'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleTogglePoi(poi.poiId)}
                    />
                    <span style={{ fontWeight: isSelected ? 600 : 400, color: isSelected ? '#14532d' : '#374151' }}>
                      {poi.name}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
          <button
            type="button"
            onClick={() => navigate('/internal/tours')}
            className="btn-secondary"
            style={{ padding: '8px 18px' }}
          >
            Hủy bỏ
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary"
            style={{ padding: '8px 22px' }}
          >
            {submitting ? 'Đang lưu...' : isEditMode ? 'Cập nhật lộ trình' : 'Tạo lộ trình'}
          </button>
        </div>
      </form>
    </div>
  );
};
