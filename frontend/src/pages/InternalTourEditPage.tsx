import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { getTourDetail, createTour, updateTour } from '../api/tour';
import { getPois, PoiDto } from '../api/poi';
import { executeAuthenticatedInternalRequest } from '../api/auth';
import { getApiBaseUrl } from '../api/client';
import { Icon } from '../components/Icon';
import { useUnsavedChangesGuard } from '../hooks/useUnsavedChangesGuard';
import { AdminPage, PageHeader, Card, Alert, Badge, Field, EmptyState, LoadingState } from '../components/admin/AdminUI';

export const InternalTourEditPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id);
  const tourId = id ? parseInt(id, 10) : null;

  const baseUrl = getApiBaseUrl();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedPoiIds, setSelectedPoiIds] = useState<number[]>([]);
  const [expectedRevision, setExpectedRevision] = useState<string>('');

  const [allPois, setAllPois] = useState<PoiDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Client-side filter for the POI picker (no extra API call).
  const [poiFilter, setPoiFilter] = useState('');
  // Unsaved edits (name, description or stop list) are protected on tab close.
  const [dirty, setDirty] = useState(false);
  useUnsavedChangesGuard(dirty && !submitting);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const poiRes = await executeAuthenticatedInternalRequest(baseUrl, token => getPois(token, { limit: 100 }, baseUrl));
        setAllPois(poiRes.items);

        if (isEditMode && tourId) {
          const tourRes = await executeAuthenticatedInternalRequest(baseUrl, token => getTourDetail(tourId, token, baseUrl));
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
    setDirty(true);
    if (selectedPoiIds.includes(poiId)) {
      setSelectedPoiIds(selectedPoiIds.filter((p) => p !== poiId));
    } else {
      setSelectedPoiIds([...selectedPoiIds, poiId]);
    }
  };

  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    setDirty(true);
    const next = [...selectedPoiIds];
    const temp = next[index - 1];
    next[index - 1] = next[index];
    next[index] = temp;
    setSelectedPoiIds(next);
  };

  const handleMoveDown = (index: number) => {
    if (index >= selectedPoiIds.length - 1) return;
    setDirty(true);
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
        await executeAuthenticatedInternalRequest(baseUrl, token => updateTour(
          tourId,
          {
            name: name.trim(),
            description: description.trim() || null,
            items,
            expectedRevision
          },
          token,
          baseUrl
        ));
      } else {
        await executeAuthenticatedInternalRequest(baseUrl, token => createTour(
          {
            name: name.trim(),
            description: description.trim() || null,
            items
          },
          token,
          baseUrl
        ));
      }

      setDirty(false);
      navigate('/internal/tours');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi khi lưu lộ trình');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <AdminPage width="narrow"><LoadingState label="Đang tải thông tin lộ trình..." /></AdminPage>;
  }

  const normalized = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('vi');
  const visiblePois = allPois.filter(poi => !poiFilter.trim() || normalized(poi.name).includes(normalized(poiFilter.trim())));

  return (
    <AdminPage width="narrow">
      <Link to="/internal/tours" className="adm-link">← Quay lại danh sách lộ trình</Link>
      <PageHeader eyebrow="Nội dung thuyết minh" title={isEditMode ? 'Chỉnh sửa lộ trình mẫu' : 'Tạo lộ trình mẫu mới'}
        description="Chọn các điểm tham quan và sắp xếp thứ tự ghé thăm. Điểm ngừng hoạt động sẽ không hiển thị cho khách."
        actions={dirty ? <Badge tone="warning" dot>Có thay đổi chưa lưu</Badge> : undefined} />

      {error && <Alert tone="danger" onDismiss={() => setError(null)}>{error}</Alert>}

      <form onSubmit={handleSubmit} className="adm-stack" style={{ gap: 20 }}>
        <Card title="Thông tin lộ trình">
          <div className="adm-form">
            <Field label="Tên lộ trình tham quan" htmlFor="tour-name" required>
              <input id="tour-name" type="text" value={name} onChange={(e) => { setName(e.target.value); setDirty(true); }} placeholder="Ví dụ: Tour Động vật hoang dã & Cây cổ thụ di sản" required />
            </Field>
            <Field label="Mô tả tóm tắt lộ trình" htmlFor="tour-description" hint="Tùy chọn">
              <textarea id="tour-description" value={description} onChange={(e) => { setDescription(e.target.value); setDirty(true); }} placeholder="Mô tả các điểm nhấn, thời lượng dự kiến và lộ trình di chuyển..." rows={3} />
            </Field>
          </div>
        </Card>

        <Card title={<>Thứ tự các trạm trong lộ trình <span className="adm-required">*</span></>} description={`${selectedPoiIds.length} trạm đã chọn`}>
          {selectedPoiIds.length === 0 ? (
            <EmptyState icon="map" title="Chưa chọn trạm nào.">Vui lòng tick chọn từ danh sách các điểm tham quan phía dưới.</EmptyState>
          ) : (
            <ol className="adm-sortable">
              {selectedPoiIds.map((poiId, index) => {
                const poi = allPois.find((p) => p.poiId === poiId);
                const poiName = poi ? poi.name : `POI #${poiId}`;
                return (
                  <li key={poiId}>
                    <span className="adm-sortable__index">{index + 1}</span>
                    <span className="adm-sortable__name">{poiName}</span>
                    <span className="adm-row-actions">
                      <button type="button" onClick={() => handleMoveUp(index)} disabled={index === 0} className="adm-btn adm-btn--ghost adm-btn--sm" title="Di chuyển lên trước" aria-label={`Đưa ${poiName} lên trước`}>▲</button>
                      <button type="button" onClick={() => handleMoveDown(index)} disabled={index === selectedPoiIds.length - 1} className="adm-btn adm-btn--ghost adm-btn--sm" title="Di chuyển xuống sau" aria-label={`Đưa ${poiName} xuống sau`}>▼</button>
                      <button type="button" onClick={() => handleTogglePoi(poiId)} className="adm-btn adm-btn--danger-soft adm-btn--sm" title="Xóa trạm khỏi tour" aria-label={`Xóa ${poiName} khỏi lộ trình`}><Icon name="close" /></button>
                    </span>
                  </li>
                );
              })}
            </ol>
          )}

          <hr className="adm-divider" />
          <div className="adm-row adm-row--between" style={{ marginBottom: 12 }}>
            <p className="adm-label" style={{ margin: 0 }}>Chọn điểm tham quan từ kho dữ liệu</p>
            <span className="adm-search" style={{ maxWidth: 260, minWidth: 200 }}><Icon name="search" /><input aria-label="Lọc điểm tham quan" value={poiFilter} onChange={e => setPoiFilter(e.target.value)} placeholder="Lọc theo tên" /></span>
          </div>
          <div className="adm-picker">
            {visiblePois.map((poi) => {
              const isSelected = selectedPoiIds.includes(poi.poiId);
              return (
                <label key={poi.poiId} className={isSelected ? 'is-selected' : undefined}>
                  <input type="checkbox" checked={isSelected} onChange={() => handleTogglePoi(poi.poiId)} />
                  <span>{poi.name}</span>
                  {poi.status === 'INACTIVE' && <Badge>INACTIVE</Badge>}
                </label>
              );
            })}
            {!visiblePois.length && <p className="adm-muted adm-small" style={{ margin: 8 }}>Không có điểm khớp bộ lọc.</p>}
          </div>
        </Card>

        <div className="adm-form-actions" style={{ borderTop: 0, paddingTop: 0 }}>
          <button type="button" onClick={() => navigate('/internal/tours')} className="adm-btn adm-btn--secondary">Hủy bỏ</button>
          <button type="submit" disabled={submitting} className="adm-btn adm-btn--primary">{submitting ? 'Đang lưu...' : isEditMode ? 'Cập nhật lộ trình' : 'Tạo lộ trình'}</button>
        </div>
      </form>
    </AdminPage>
  );
};
