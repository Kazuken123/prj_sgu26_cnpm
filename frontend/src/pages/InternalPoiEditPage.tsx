import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { getApiBaseUrl, ApiError } from '../api/client.ts';
import { getAuthMe, executeAuthenticatedInternalRequest } from '../api/auth.ts';
import { clearInternalSession } from '../api/authStorage.ts';
import type { InternalUser } from '../api/authStorage.ts';
import { getPoiDetail, createPoi, updatePoi } from '../api/poi.ts';
import type { PoiDto, PoiCategory, PoiStatus, PoiSaveInput } from '../api/poi.ts';

export const InternalPoiEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isCreate = !id;
  const navigate = useNavigate();
  const currentBaseUrl = getApiBaseUrl();

  const [user, setUser] = useState<InternalUser | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(true);
  const [isLoadingPoi, setIsLoadingPoi] = useState<boolean>(!isCreate);

  // Du lieu goc tren may chu de doi chieu va giu expectedVersion
  const [serverPoi, setServerPoi] = useState<PoiDto | null>(null);

  // Form state
  const [name, setName] = useState<string>('');
  const [category, setCategory] = useState<PoiCategory>('ANIMAL');
  const [conservationStatus, setConservationStatus] = useState<string>('');
  const [activityHours, setActivityHours] = useState<string>('');
  const [latitude, setLatitude] = useState<string>('');
  const [longitude, setLongitude] = useState<string>('');
  const [triggerRadius, setTriggerRadius] = useState<string>('30');
  const [displayOrder, setDisplayOrder] = useState<string>('0');
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [status, setStatus] = useState<PoiStatus>('INACTIVE');
  const [description, setDescription] = useState<string>('');
  const [audioScript, setAudioScript] = useState<string>('');

  // Theo doi thay doi chua luu de canh bao truoc khi roi trang
  const [isDirty, setIsDirty] = useState<boolean>(false);

  // Trang thai luu va loi
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Xu ly xung dot phien ban 409
  const [conflictData, setConflictData] = useState<{
    serverVersion: number;
    expectedVersion: number;
    serverPoiLatest: PoiDto | null;
  } | null>(null);
  const [copiedDraftNotice, setCopiedDraftNotice] = useState<boolean>(false);

  // Kiem tra quyen STAFF hoac ADMIN
  const verifyAccess = useCallback(async () => {
    setIsVerifying(true);
    try {
      const profile = await executeAuthenticatedInternalRequest(
        currentBaseUrl,
        (token) => getAuthMe(token, currentBaseUrl),
        () => navigate('/internal/login', { replace: true })
      );

      if (profile.role !== 'STAFF' && profile.role !== 'ADMIN') {
        clearInternalSession();
        navigate('/internal/login', { replace: true });
        return;
      }

      setUser(profile);
      setIsVerifying(false);
    } catch {
      setIsVerifying(false);
      clearInternalSession();
      navigate('/internal/login', { replace: true });
    }
  }, [currentBaseUrl, navigate]);

  useEffect(() => {
    verifyAccess();
  }, [verifyAccess]);

  // Tai du lieu POI khi sua
  const loadPoiForEdit = useCallback(async () => {
    if (isCreate || !id || !user) return;

    setIsLoadingPoi(true);
    setFormError(null);

    try {
      const data = await executeAuthenticatedInternalRequest(
        currentBaseUrl,
        (token) => getPoiDetail(token, id, currentBaseUrl),
        () => navigate('/internal/login', { replace: true })
      );

      setServerPoi(data);
      setName(data.name || '');
      setCategory(data.category || 'ANIMAL');
      setConservationStatus(data.conservationStatus || '');
      setActivityHours(data.activityHours || '');
      setLatitude(String(data.latitude ?? ''));
      setLongitude(String(data.longitude ?? ''));
      setTriggerRadius(String(data.triggerRadius ?? 30));
      setDisplayOrder(String(data.displayOrder ?? 0));
      setAvatarUrl(data.avatarUrl || '');
      setStatus(data.status || 'INACTIVE');
      setDescription(data.description || '');
      setAudioScript(data.audioScript || '');
      setIsDirty(false);
      setIsLoadingPoi(false);
    } catch (err: unknown) {
      setIsLoadingPoi(false);
      if (err instanceof ApiError) {
        setFormError(err.message);
      } else {
        setFormError('Không thể tải thông tin điểm tham quan để chỉnh sửa.');
      }
    }
  }, [isCreate, id, user, currentBaseUrl, navigate]);

  useEffect(() => {
    if (!isVerifying && user && !isCreate) {
      loadPoiForEdit();
    }
  }, [isVerifying, user, isCreate, loadPoiForEdit]);

  // Canh bao roi trang neu chua luu
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty && !isSubmitting) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty, isSubmitting]);

  // Validate form client-side theo quy tac backend
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!name.trim()) {
      errors.name = 'Tên điểm tham quan không được để trống.';
    } else if (name.trim().length > 255) {
      errors.name = 'Tên tối đa 255 ký tự.';
    }

    if (!['ANIMAL', 'PLANT', 'HERITAGE', 'AMENITY'].includes(category)) {
      errors.category = 'Phân loại không hợp lệ.';
    }

    if (!latitude.trim()) {
      errors.latitude = 'Vĩ độ là bắt buộc (không được để trống).';
    } else {
      const latNum = Number(latitude);
      if (!Number.isFinite(latNum) || latNum < -90 || latNum > 90) {
        errors.latitude = 'Vĩ độ phải là số thực trong khoảng từ -90 đến 90.';
      }
    }

    if (!longitude.trim()) {
      errors.longitude = 'Kinh độ là bắt buộc (không được để trống).';
    } else {
      const lngNum = Number(longitude);
      if (!Number.isFinite(lngNum) || lngNum < -180 || lngNum > 180) {
        errors.longitude = 'Kinh độ phải là số thực trong khoảng từ -180 đến 180.';
      }
    }

    if (!triggerRadius.trim()) {
      errors.triggerRadius = 'Bán kính là bắt buộc.';
    } else {
      const radiusNum = Number(triggerRadius);
      if (!Number.isSafeInteger(radiusNum) || radiusNum < 1) {
        errors.triggerRadius = 'Bán kính phải là số nguyên dương lớn hơn hoặc bằng 1.';
      }
    }

    if (displayOrder.trim()) {
      const orderNum = Number(displayOrder);
      if (!Number.isSafeInteger(orderNum) || orderNum < 0) {
        errors.displayOrder = 'Thứ tự hiển thị phải là số nguyên không âm.';
      }
    }

    if (avatarUrl.trim()) {
      const cleanUrl = avatarUrl.trim();
      if (cleanUrl.length > 500) {
        errors.avatarUrl = 'Đường dẫn ảnh tối đa 500 ký tự.';
      } else if (!/^https?:\/\//i.test(cleanUrl) && !/^\/(?!\/)[^\\]*$/.test(cleanUrl)) {
        errors.avatarUrl = 'Đường dẫn ảnh phải bắt đầu bằng http://, https:// hoặc dấu gạch chéo / nội bộ.';
      }
    }

    if (!description.trim()) {
      errors.description = 'Nội dung mô tả tiếng Việt không được để trống.';
    } else if (description.trim().length > 6000) {
      errors.description = 'Nội dung mô tả tối đa 6000 ký tự.';
    }

    if (!audioScript.trim()) {
      errors.audioScript = 'Kịch bản đọc thuyết minh tiếng Việt không được để trống.';
    } else if (audioScript.trim().length > 6000) {
      errors.audioScript = 'Kịch bản đọc tối đa 6000 ký tự.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMessage(null);
    setConflictData(null);

    if (!validateForm()) {
      setFormError('Vui lòng kiểm tra lại các trường thông tin chưa hợp lệ.');
      return;
    }

    setIsSubmitting(true);

    const payload: PoiSaveInput = {
      name: name.trim(),
      category,
      conservationStatus: conservationStatus.trim() || null,
      activityHours: activityHours.trim() || null,
      latitude: Number(latitude),
      longitude: Number(longitude),
      triggerRadius: Number(triggerRadius),
      avatarUrl: avatarUrl.trim() || null,
      displayOrder: Number(displayOrder || 0),
      status,
      description: description.trim(),
      audioScript: audioScript.trim()
    };

    if (!isCreate && serverPoi) {
      payload.expectedVersion = serverPoi.contentVersion;
    }

    try {
      let savedPoi: PoiDto;

      if (isCreate) {
        savedPoi = await executeAuthenticatedInternalRequest(
          currentBaseUrl,
          (token) => createPoi(token, payload, currentBaseUrl),
          () => navigate('/internal/login', { replace: true })
        );
      } else {
        savedPoi = await executeAuthenticatedInternalRequest(
          currentBaseUrl,
          (token) => updatePoi(token, id!, payload, currentBaseUrl),
          () => navigate('/internal/login', { replace: true })
        );
      }

      setIsDirty(false);
      setIsSubmitting(false);
      setServerPoi(savedPoi);

      if (savedPoi.processing === 'PENDING') {
        setSuccessMessage(`Đã lưu thành công. Do nội dung nguồn tiếng Việt thay đổi, phiên bản nội dung đã nâng lên v${savedPoi.contentVersion} và tác vụ dịch/âm thanh đã được ghi nhận ở trạng thái PENDING.`);
      } else {
        setSuccessMessage(`Đã cập nhật thông tin thành công. Phiên bản nội dung giữ nguyên v${savedPoi.contentVersion} (không tạo lại âm thanh do không thay đổi văn bản nguồn).`);
      }

      setTimeout(() => {
        navigate(`/internal/pois/${savedPoi.poiId}`);
      }, 1500);
    } catch (err: unknown) {
      setIsSubmitting(false);
      if (err instanceof ApiError) {
        if (err.status === 409 && err.code === 'POI_VERSION_CONFLICT') {
          // XUNG DOT PHIEN BAN: Giu nguyen ban nhap nguoi dung
          setFormError('Xung đột phiên bản: Dữ liệu trên máy chủ đã được cập nhật bởi một người khác. Toàn bộ bản nháp của bạn đã được giữ lại an toàn bên dưới.');

          // Tai ban moi nhat tu may chu de nguoi dung doi chieu
          try {
            const latest = await executeAuthenticatedInternalRequest(
              currentBaseUrl,
              (token) => getPoiDetail(token, id!, currentBaseUrl),
              () => navigate('/internal/login', { replace: true })
            );
            setConflictData({
              serverVersion: latest.contentVersion,
              expectedVersion: serverPoi ? serverPoi.contentVersion : 1,
              serverPoiLatest: latest
            });
          } catch {
            setConflictData({
              serverVersion: (serverPoi?.contentVersion || 1) + 1,
              expectedVersion: serverPoi ? serverPoi.contentVersion : 1,
              serverPoiLatest: null
            });
          }
        } else {
          setFormError(`Lỗi [${err.code}]: ${err.message}`);
        }
      } else {
        setFormError('Mất kết nối tới máy chủ khi lưu điểm tham quan. Bản nháp của bạn vẫn được giữ nguyên để thử lại.');
      }
    }
  };

  // Sao chep ban nhap ra clipboard
  const handleCopyDraft = () => {
    const draftText = `--- BẢN NHÁP POI #${id || 'MỚI'} ---\nTên: ${name}\nPhân loại: ${category}\nVĩ độ: ${latitude}\nKinh độ: ${longitude}\nBán kính: ${triggerRadius}m\nTrạng thái: ${status}\nMô tả:\n${description}\n\nKịch bản đọc:\n${audioScript}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(draftText);
      setCopiedDraftNotice(true);
      setTimeout(() => setCopiedDraftNotice(false), 3000);
    }
  };

  // Nguoi dung chu dong ap dung ban nhap len phien ban moi
  const handleAdoptLatestVersion = () => {
    if (!conflictData?.serverPoiLatest) return;
    setServerPoi(conflictData.serverPoiLatest);
    setConflictData(null);
    setFormError('Đã cập nhật phiên bản đối soát lên v' + conflictData.serverPoiLatest.contentVersion + '. Bạn có thể kiểm tra lại bản nháp và bấm Lưu thay đổi.');
  };

  if (isVerifying || isLoadingPoi) {
    return (
      <div className="container" style={{ padding: '60px 16px', textAlign: 'center' }}>
        <p>Đang tải dữ liệu biểu mẫu...</p>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '32px 16px', maxWidth: '860px' }}>
      <div style={{ marginBottom: '16px' }}>
        <Link to={isCreate ? '/internal/pois' : `/internal/pois/${id}`} style={{ fontSize: '0.88rem', textDecoration: 'none', color: '#0369a1' }}>
          ← {isCreate ? 'Quay lại danh sách điểm tham quan' : 'Quay lại chi tiết điểm'}
        </Link>
      </div>

      <div className="page-header" style={{ marginBottom: '24px' }}>
        <h1 className="page-title" style={{ margin: 0 }}>
          {isCreate ? 'Thêm điểm tham quan mới' : `Chỉnh sửa điểm tham quan #${id} (v${serverPoi?.contentVersion})`}
        </h1>
        <p className="page-subtitle" style={{ margin: '6px 0 0 0' }}>
          {isCreate
            ? 'Khởi tạo điểm tham quan mới. Hệ thống đề xuất trạng thái INACTIVE để chuẩn bị nội dung trước khi công bố.'
            : 'Chỉnh sửa nguồn tiếng Việt và thông số kỹ thuật. Thay đổi nội dung nguồn sẽ tự động tạo tác vụ dịch và âm thanh.'}
        </p>
      </div>

      {successMessage && (
        <div className="panel" style={{ marginBottom: '20px', borderLeft: '4px solid #10b981', backgroundColor: '#f0fdf4', padding: '14px 16px' }}>
          <div style={{ color: '#166534', fontWeight: 600 }}>{successMessage}</div>
        </div>
      )}

      {formError && (
        <div className="panel" style={{ marginBottom: '20px', borderLeft: '4px solid #dc2626', backgroundColor: '#fef2f2', padding: '14px 16px' }}>
          <div style={{ color: '#991b1b', fontWeight: 600 }}>{formError}</div>
        </div>
      )}

      {/* KHỐI XỬ LÝ XUNG ĐỘT PHIÊN BẢN (409 POI_VERSION_CONFLICT) */}
      {conflictData && (
        <div className="panel" style={{ marginBottom: '24px', border: '2px solid #f59e0b', backgroundColor: '#fffbeb', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <span style={{ fontSize: '1.4rem' }}>⚠️</span>
            <h3 style={{ margin: 0, color: '#92400e', fontSize: '1.1rem' }}>
              Xung đột phiên bản nội dung
            </h3>
          </div>

          <p style={{ margin: '0 0 14px 0', fontSize: '0.9rem', color: '#78350f', lineHeight: '1.5' }}>
            Phiên bản bạn đang chỉnh sửa dựa trên <strong>v{conflictData.expectedVersion}</strong>, nhưng máy chủ hiện đã là <strong>v{conflictData.serverVersion}</strong>. Toàn bộ nội dung bạn vừa nhập vẫn đang được giữ nguyên trong biểu mẫu bên dưới.
          </p>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '16px' }}>
            <button
              type="button"
              onClick={handleCopyDraft}
              className="btn-secondary"
              style={{ fontSize: '0.85rem' }}
            >
              {copiedDraftNotice ? 'Đã chép bản nháp!' : 'Sao chép bản nháp ra bộ nhớ tạm'}
            </button>

            {conflictData.serverPoiLatest && (
              <button
                type="button"
                onClick={handleAdoptLatestVersion}
                className="btn-primary"
                style={{ backgroundColor: '#d97706', fontSize: '0.85rem' }}
              >
                Áp dụng bản nháp lên phiên bản mới (v{conflictData.serverVersion})
              </button>
            )}
          </div>

          {/* Bang so sanh don gian giua may chu va ban nhap */}
          {conflictData.serverPoiLatest && (
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #fcd34d', borderRadius: '6px', padding: '14px' }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '0.92rem', color: '#92400e' }}>
                Đối chiếu nội dung trên máy chủ (v{conflictData.serverPoiLatest.contentVersion}):
              </h4>
              <div style={{ fontSize: '0.85rem', marginBottom: '8px' }}>
                <strong>Tên hiện tại trên máy chủ:</strong> {conflictData.serverPoiLatest.name}
              </div>
              <div style={{ fontSize: '0.85rem', marginBottom: '8px' }}>
                <strong>Mô tả hiện tại:</strong> {conflictData.serverPoiLatest.description.slice(0, 150)}...
              </div>
              <div style={{ fontSize: '0.85rem' }}>
                <strong>Kịch bản đọc hiện tại:</strong> {conflictData.serverPoiLatest.audioScript.slice(0, 150)}...
              </div>
            </div>
          )}
        </div>
      )}

      {/* FORM NHAP LIEU */}
      <form onSubmit={handleSubmit}>
        <div className="panel" style={{ marginBottom: '20px' }}>
          <h2 style={{ fontSize: '1.1rem', margin: '0 0 16px 0', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
            Thông tin cơ bản
          </h2>

          <div style={{ marginBottom: '16px' }}>
            <label htmlFor="poi-name" style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: '6px' }}>
              Tên điểm tham quan *
            </label>
            <input
              id="poi-name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setIsDirty(true);
              }}
              placeholder="Ví dụ: Hươu cao cổ, Voi châu Á, Đền vua Hùng..."
              maxLength={255}
              required
              style={{ width: '100%', padding: '8px 12px', border: `1px solid ${fieldErrors.name ? '#dc2626' : '#cbd5e1'}`, borderRadius: '4px', fontSize: '0.92rem' }}
            />
            {fieldErrors.name && <div style={{ color: '#dc2626', fontSize: '0.78rem', marginTop: '4px' }}>{fieldErrors.name}</div>}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label htmlFor="poi-category" style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: '6px' }}>
                Phân loại (Category) *
              </label>
              <select
                id="poi-category"
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value as PoiCategory);
                  setIsDirty(true);
                }}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.92rem' }}
              >
                <option value="ANIMAL">Động vật (ANIMAL)</option>
                <option value="PLANT">Thực vật (PLANT)</option>
                <option value="HERITAGE">Di tích lịch sử (HERITAGE)</option>
                <option value="AMENITY">Tiện ích (AMENITY)</option>
              </select>
            </div>

            <div>
              <label htmlFor="poi-status" style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: '6px' }}>
                Trạng thái hiển thị *
              </label>
              <select
                id="poi-status"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value as PoiStatus);
                  setIsDirty(true);
                }}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.92rem' }}
              >
                <option value="INACTIVE">Ngừng hoạt động (INACTIVE) - Đề xuất khi chuẩn bị nội dung</option>
                <option value="ACTIVE">Hoạt động (ACTIVE) - Xuất hiện trong gói tham quan</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            <div>
              <label htmlFor="poi-conservation" style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: '6px' }}>
                Tình trạng bảo tồn (Tùy chọn)
              </label>
              <input
                id="poi-conservation"
                type="text"
                value={conservationStatus}
                onChange={(e) => {
                  setConservationStatus(e.target.value);
                  setIsDirty(true);
                }}
                placeholder="Ví dụ: Ít quan tâm, Nguy cấp..."
                maxLength={100}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.92rem' }}
              />
            </div>

            <div>
              <label htmlFor="poi-hours" style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: '6px' }}>
                Khung giờ hoạt động (Tùy chọn)
              </label>
              <input
                id="poi-hours"
                type="text"
                value={activityHours}
                onChange={(e) => {
                  setActivityHours(e.target.value);
                  setIsDirty(true);
                }}
                placeholder="Ví dụ: 07:00 - 17:30"
                maxLength={100}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.92rem' }}
              />
            </div>
          </div>
        </div>

        {/* THONG SO TOA DO VA KHONG GIAN */}
        <div className="panel" style={{ marginBottom: '20px' }}>
          <h2 style={{ fontSize: '1.1rem', margin: '0 0 16px 0', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
            Tọa độ và bán kính kích hoạt GPS
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label htmlFor="poi-lat" style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: '6px' }}>
                Vĩ độ (Latitude) *
              </label>
              <input
                id="poi-lat"
                type="number"
                step="any"
                value={latitude}
                onChange={(e) => {
                  setLatitude(e.target.value);
                  setIsDirty(true);
                }}
                placeholder="Ví dụ: 10.7915"
                required
                style={{ width: '100%', padding: '8px 12px', border: `1px solid ${fieldErrors.latitude ? '#dc2626' : '#cbd5e1'}`, borderRadius: '4px', fontSize: '0.92rem', fontFamily: 'monospace' }}
              />
              {fieldErrors.latitude && <div style={{ color: '#dc2626', fontSize: '0.78rem', marginTop: '4px' }}>{fieldErrors.latitude}</div>}
            </div>

            <div>
              <label htmlFor="poi-lng" style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: '6px' }}>
                Kinh độ (Longitude) *
              </label>
              <input
                id="poi-lng"
                type="number"
                step="any"
                value={longitude}
                onChange={(e) => {
                  setLongitude(e.target.value);
                  setIsDirty(true);
                }}
                placeholder="Ví dụ: 106.7052"
                required
                style={{ width: '100%', padding: '8px 12px', border: `1px solid ${fieldErrors.longitude ? '#dc2626' : '#cbd5e1'}`, borderRadius: '4px', fontSize: '0.92rem', fontFamily: 'monospace' }}
              />
              {fieldErrors.longitude && <div style={{ color: '#dc2626', fontSize: '0.78rem', marginTop: '4px' }}>{fieldErrors.longitude}</div>}
            </div>

            <div>
              <label htmlFor="poi-radius" style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: '6px' }}>
                Bán kính kích hoạt (mét) *
              </label>
              <input
                id="poi-radius"
                type="number"
                min="1"
                step="1"
                value={triggerRadius}
                onChange={(e) => {
                  setTriggerRadius(e.target.value);
                  setIsDirty(true);
                }}
                placeholder="Mặc định: 30"
                required
                style={{ width: '100%', padding: '8px 12px', border: `1px solid ${fieldErrors.triggerRadius ? '#dc2626' : '#cbd5e1'}`, borderRadius: '4px', fontSize: '0.92rem', fontFamily: 'monospace' }}
              />
              {fieldErrors.triggerRadius && <div style={{ color: '#dc2626', fontSize: '0.78rem', marginTop: '4px' }}>{fieldErrors.triggerRadius}</div>}
            </div>

            <div>
              <label htmlFor="poi-order" style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: '6px' }}>
                Thứ tự hiển thị
              </label>
              <input
                id="poi-order"
                type="number"
                min="0"
                step="1"
                value={displayOrder}
                onChange={(e) => {
                  setDisplayOrder(e.target.value);
                  setIsDirty(true);
                }}
                placeholder="Mặc định: 0"
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.92rem', fontFamily: 'monospace' }}
              />
            </div>
          </div>

          <div>
            <label htmlFor="poi-avatar" style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: '6px' }}>
              Đường dẫn ảnh đại diện (Tùy chọn)
            </label>
            <input
              id="poi-avatar"
              type="text"
              value={avatarUrl}
              onChange={(e) => {
                setAvatarUrl(e.target.value);
                setIsDirty(true);
              }}
              placeholder="Ví dụ: /assets/images/tcv_huou_thao_em.jpg hoặc https://..."
              maxLength={500}
              style={{ width: '100%', padding: '8px 12px', border: `1px solid ${fieldErrors.avatarUrl ? '#dc2626' : '#cbd5e1'}`, borderRadius: '4px', fontSize: '0.92rem' }}
            />
            {fieldErrors.avatarUrl && <div style={{ color: '#dc2626', fontSize: '0.78rem', marginTop: '4px' }}>{fieldErrors.avatarUrl}</div>}
            <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>
              * Lưu ý: Hiện tại hệ thống nhận đường dẫn URL hoặc đường dẫn nội bộ máy chủ; chưa hỗ trợ tải tệp ảnh trực tiếp từ máy khách.
            </div>
          </div>
        </div>

        {/* NGUON TIENG VIET: MO TA VA KICH BAN */}
        <div className="panel" style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '1.1rem', margin: '0 0 16px 0', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
            Nội dung nguồn tiếng Việt
          </h2>

          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label htmlFor="poi-description" style={{ fontWeight: 600, fontSize: '0.88rem' }}>
                Nội dung mô tả tiếng Việt *
              </label>
              <span style={{ fontSize: '0.78rem', color: description.length > 5500 ? '#b91c1c' : '#64748b' }}>
                {description.length} / 6000 ký tự
              </span>
            </div>
            <textarea
              id="poi-description"
              rows={6}
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setIsDirty(true);
              }}
              placeholder="Nhập nội dung giới thiệu chi tiết về điểm tham quan bằng tiếng Việt..."
              maxLength={6000}
              required
              style={{ width: '100%', padding: '10px 12px', border: `1px solid ${fieldErrors.description ? '#dc2626' : '#cbd5e1'}`, borderRadius: '4px', fontSize: '0.92rem', lineHeight: '1.5' }}
            />
            {fieldErrors.description && <div style={{ color: '#dc2626', fontSize: '0.78rem', marginTop: '4px' }}>{fieldErrors.description}</div>}
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label htmlFor="poi-audio" style={{ fontWeight: 600, fontSize: '0.88rem' }}>
                Kịch bản đọc thuyết minh tiếng Việt *
              </label>
              <span style={{ fontSize: '0.78rem', color: audioScript.length > 5500 ? '#b91c1c' : '#64748b' }}>
                {audioScript.length} / 6000 ký tự
              </span>
            </div>
            <textarea
              id="poi-audio"
              rows={6}
              value={audioScript}
              onChange={(e) => {
                setAudioScript(e.target.value);
                setIsDirty(true);
              }}
              placeholder="Nhập lời đọc văn bản dùng cho hệ thống chuyển văn bản thành giọng nói (TTS)..."
              maxLength={6000}
              required
              style={{ width: '100%', padding: '10px 12px', border: `1px solid ${fieldErrors.audioScript ? '#dc2626' : '#cbd5e1'}`, borderRadius: '4px', fontSize: '0.92rem', lineHeight: '1.5' }}
            />
            {fieldErrors.audioScript && <div style={{ color: '#dc2626', fontSize: '0.78rem', marginTop: '4px' }}>{fieldErrors.audioScript}</div>}
            <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>
              * Lưu ý: Thay đổi Tên, Mô tả hoặc Kịch bản đọc sẽ làm tăng phiên bản nguồn của POI và kích hoạt các tác vụ dịch/tạo âm thanh mới.
            </div>
          </div>
        </div>

        {/* HANH DONG SUBMIT */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => navigate(isCreate ? '/internal/pois' : `/internal/pois/${id}`)}
            disabled={isSubmitting}
            className="btn-secondary"
          >
            Hủy bỏ
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary"
            style={{ backgroundColor: '#059669', borderColor: '#047857' }}
          >
            {isSubmitting ? 'Đang lưu dữ liệu...' : isCreate ? 'Tạo điểm tham quan' : 'Lưu thay đổi'}
          </button>
        </div>
      </form>
    </div>
  );
};
