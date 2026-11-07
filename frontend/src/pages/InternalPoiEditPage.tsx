import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { getApiBaseUrl, ApiError } from '../api/client.ts';
import { getAuthMe, executeAuthenticatedInternalRequest } from '../api/auth.ts';
import { clearInternalSession } from '../api/authStorage.ts';
import type { InternalUser } from '../api/authStorage.ts';
import { getPoiDetail, createPoi, updatePoi } from '../api/poi.ts';
import type { PoiDto, PoiCategory, PoiStatus, PoiSaveInput } from '../api/poi.ts';
import { AdminPage, PageHeader, Card, Alert, Badge, DescriptionList, Field, LoadingState } from '../components/admin/AdminUI';

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
    return <AdminPage><LoadingState label="Đang tải dữ liệu biểu mẫu..." /></AdminPage>;
  }

  // Every field marks the draft dirty so the unload guard keeps unsaved input.
  const bind = (setter: (value: string) => void) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => { setter(e.target.value); setIsDirty(true); };
  const counter = (value: string) => <span style={{ color: value.length > 5500 ? 'var(--adm-danger)' : undefined }}>{value.length} / 6000 ký tự</span>;

  return (
    <AdminPage width="narrow">
      <Link to={isCreate ? '/internal/pois' : `/internal/pois/${id}`} className="adm-link">
        ← {isCreate ? 'Quay lại danh sách điểm tham quan' : 'Quay lại chi tiết điểm'}
      </Link>
      <PageHeader eyebrow="Nội dung thuyết minh"
        title={isCreate ? 'Thêm điểm tham quan mới' : `Chỉnh sửa điểm tham quan #${id} (v${serverPoi?.contentVersion})`}
        description={isCreate
          ? 'Khởi tạo điểm tham quan mới. Hệ thống đề xuất trạng thái INACTIVE để chuẩn bị nội dung trước khi công bố.'
          : 'Chỉnh sửa nguồn tiếng Việt và thông số kỹ thuật. Thay đổi nội dung nguồn sẽ tự động tạo tác vụ dịch và âm thanh.'}
        actions={isDirty ? <Badge tone="warning" dot>Có thay đổi chưa lưu</Badge> : undefined} />

      {successMessage && <Alert tone="success">{successMessage}</Alert>}
      {formError && <Alert tone="danger">{formError}</Alert>}

      {/* KHỐI XỬ LÝ XUNG ĐỘT PHIÊN BẢN (409 POI_VERSION_CONFLICT) */}
      {conflictData && (
        <Card className="adm-conflict" title="Xung đột phiên bản nội dung"
          description={<>Phiên bản bạn đang chỉnh sửa dựa trên <strong>v{conflictData.expectedVersion}</strong>, nhưng máy chủ hiện đã là <strong>v{conflictData.serverVersion}</strong>. Toàn bộ nội dung bạn vừa nhập vẫn đang được giữ nguyên trong biểu mẫu bên dưới.</>}
          actions={<>
            <button type="button" onClick={handleCopyDraft} className="adm-btn adm-btn--secondary adm-btn--sm">{copiedDraftNotice ? 'Đã chép bản nháp!' : 'Sao chép bản nháp ra bộ nhớ tạm'}</button>
            {conflictData.serverPoiLatest && <button type="button" onClick={handleAdoptLatestVersion} className="adm-btn adm-btn--primary adm-btn--sm">Áp dụng bản nháp lên phiên bản mới (v{conflictData.serverVersion})</button>}
          </>}>
          {conflictData.serverPoiLatest && (
            <div style={{ background: 'var(--adm-warning-bg)', border: '1px solid var(--adm-warning-border)', borderRadius: 'var(--adm-r-md)', padding: 14 }}>
              <p className="adm-label" style={{ margin: '0 0 8px' }}>Đối chiếu nội dung trên máy chủ (v{conflictData.serverPoiLatest.contentVersion}):</p>
              <DescriptionList columns={1} items={[
                { label: 'Tên hiện tại trên máy chủ', value: conflictData.serverPoiLatest.name },
                { label: 'Mô tả hiện tại', value: `${conflictData.serverPoiLatest.description.slice(0, 150)}...` },
                { label: 'Kịch bản đọc hiện tại', value: `${conflictData.serverPoiLatest.audioScript.slice(0, 150)}...` },
              ]} />
            </div>
          )}
        </Card>
      )}

      {/* FORM NHAP LIEU */}
      <form onSubmit={handleSubmit} className="adm-stack" style={{ gap: 20 }} noValidate>
        <Card title="Thông tin cơ bản">
          <div className="adm-form-grid">
            <Field label="Tên điểm tham quan" htmlFor="poi-name" required error={fieldErrors.name} className="adm-field--full">
              <input id="poi-name" type="text" value={name} onChange={bind(setName)} placeholder="Ví dụ: Hươu cao cổ, Voi châu Á, Đền vua Hùng..." maxLength={255} required aria-invalid={!!fieldErrors.name} />
            </Field>
            <Field label="Phân loại (Category)" htmlFor="poi-category" required>
              <select id="poi-category" value={category} onChange={(e) => { setCategory(e.target.value as PoiCategory); setIsDirty(true); }}>
                <option value="ANIMAL">Động vật (ANIMAL)</option>
                <option value="PLANT">Thực vật (PLANT)</option>
                <option value="HERITAGE">Di tích lịch sử (HERITAGE)</option>
                <option value="AMENITY">Tiện ích (AMENITY)</option>
              </select>
            </Field>
            <Field label="Trạng thái hiển thị" htmlFor="poi-status" required hint="INACTIVE được đề xuất khi đang chuẩn bị nội dung.">
              <select id="poi-status" value={status} onChange={(e) => { setStatus(e.target.value as PoiStatus); setIsDirty(true); }}>
                <option value="INACTIVE">Ngừng hoạt động (INACTIVE) - Đề xuất khi chuẩn bị nội dung</option>
                <option value="ACTIVE">Hoạt động (ACTIVE) - Xuất hiện trong gói tham quan</option>
              </select>
            </Field>
            <Field label="Tình trạng bảo tồn" htmlFor="poi-conservation" hint="Tùy chọn">
              <input id="poi-conservation" type="text" value={conservationStatus} onChange={bind(setConservationStatus)} placeholder="Ví dụ: Ít quan tâm, Nguy cấp..." maxLength={100} />
            </Field>
            <Field label="Khung giờ hoạt động" htmlFor="poi-hours" hint="Tùy chọn">
              <input id="poi-hours" type="text" value={activityHours} onChange={bind(setActivityHours)} placeholder="Ví dụ: 07:00 - 17:30" maxLength={100} />
            </Field>
          </div>
        </Card>

        {/* THONG SO TOA DO VA KHONG GIAN */}
        <Card title="Tọa độ và bán kính kích hoạt GPS" description="Bán kính mặc định 30 m; ngưỡng đặt lại lượt tiếp cận là 1,5 lần bán kính.">
          <div className="adm-form-grid">
            <Field label="Vĩ độ (Latitude)" htmlFor="poi-lat" required error={fieldErrors.latitude}>
              <input id="poi-lat" type="number" step="any" value={latitude} onChange={bind(setLatitude)} placeholder="Ví dụ: 10.7915" required className="adm-mono" aria-invalid={!!fieldErrors.latitude} />
            </Field>
            <Field label="Kinh độ (Longitude)" htmlFor="poi-lng" required error={fieldErrors.longitude}>
              <input id="poi-lng" type="number" step="any" value={longitude} onChange={bind(setLongitude)} placeholder="Ví dụ: 106.7052" required className="adm-mono" aria-invalid={!!fieldErrors.longitude} />
            </Field>
            <Field label="Bán kính kích hoạt (mét)" htmlFor="poi-radius" required error={fieldErrors.triggerRadius}>
              <input id="poi-radius" type="number" min="1" step="1" value={triggerRadius} onChange={bind(setTriggerRadius)} placeholder="Mặc định: 30" required className="adm-mono" aria-invalid={!!fieldErrors.triggerRadius} />
            </Field>
            <Field label="Thứ tự hiển thị" htmlFor="poi-order">
              <input id="poi-order" type="number" min="0" step="1" value={displayOrder} onChange={bind(setDisplayOrder)} placeholder="Mặc định: 0" className="adm-mono" />
            </Field>
            <Field label="Đường dẫn ảnh đại diện" htmlFor="poi-avatar" error={fieldErrors.avatarUrl} className="adm-field--full"
              hint="Tùy chọn. Hệ thống nhận đường dẫn URL hoặc đường dẫn nội bộ máy chủ; chưa hỗ trợ tải tệp ảnh trực tiếp từ máy khách.">
              <input id="poi-avatar" type="text" value={avatarUrl} onChange={bind(setAvatarUrl)} placeholder="Ví dụ: /assets/images/tcv_huou_thao_em.jpg hoặc https://..." maxLength={500} aria-invalid={!!fieldErrors.avatarUrl} />
            </Field>
          </div>
        </Card>

        {/* NGUON TIENG VIET: MO TA VA KICH BAN */}
        <Card title="Nội dung nguồn tiếng Việt" description="Thay đổi Tên, Mô tả hoặc Kịch bản đọc sẽ làm tăng phiên bản nguồn của POI và kích hoạt các tác vụ dịch/tạo âm thanh mới.">
          <div className="adm-form">
            <Field label="Nội dung mô tả tiếng Việt" htmlFor="poi-description" required error={fieldErrors.description} hint={counter(description)}>
              <textarea id="poi-description" rows={6} value={description} onChange={bind(setDescription)} placeholder="Nhập nội dung giới thiệu chi tiết về điểm tham quan bằng tiếng Việt..." maxLength={6000} required aria-invalid={!!fieldErrors.description} />
            </Field>
            <Field label="Kịch bản đọc thuyết minh tiếng Việt" htmlFor="poi-audio" required error={fieldErrors.audioScript} hint={counter(audioScript)}>
              <textarea id="poi-audio" rows={6} value={audioScript} onChange={bind(setAudioScript)} placeholder="Nhập lời đọc văn bản dùng cho hệ thống chuyển văn bản thành giọng nói (TTS)..." maxLength={6000} required aria-invalid={!!fieldErrors.audioScript} />
            </Field>
          </div>
        </Card>

        {/* HANH DONG SUBMIT */}
        <div className="adm-form-actions" style={{ borderTop: 0, paddingTop: 0 }}>
          <button type="button" onClick={() => navigate(isCreate ? '/internal/pois' : `/internal/pois/${id}`)} disabled={isSubmitting} className="adm-btn adm-btn--secondary">Hủy bỏ</button>
          <button type="submit" disabled={isSubmitting} className="adm-btn adm-btn--primary">{isSubmitting ? 'Đang lưu dữ liệu...' : isCreate ? 'Tạo điểm tham quan' : 'Lưu thay đổi'}</button>
        </div>
      </form>
    </AdminPage>
  );
};
