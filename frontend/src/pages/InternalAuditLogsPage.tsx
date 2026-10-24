import React, { useState, useEffect, useRef } from 'react';
import { getAuditLogs, AuditLogDto } from '../api/audit';
import { executeAuthenticatedInternalRequest } from '../api/auth';
import { businessDate } from '../api/operations';
import { getApiBaseUrl } from '../api/client';

const actionLabels: Record<string,string> = {"CONFIRM_CASH_PAYMENT":"Xác nhận thu tiền","CREATE_PENDING_PAYMENT":"Tạo yêu cầu thu tiền","ISSUE_CASH_CODE":"Cấp mã nghe","ISSUE_VISITOR_TOKEN":"Khách đổi mã nghe","CREATE_STAFF":"Thêm nhân viên","CREATE_POI":"Thêm điểm tham quan","UPDATE_POI":"Sửa điểm tham quan","DEACTIVATE_POI":"Ngừng mở điểm tham quan","CREATE_TOUR":"Tạo lộ trình","UPDATE_TOUR":"Sửa lộ trình","RETRY_CONTENT_JOB":"Thử lại xử lý nội dung","CLAIM_CONTENT_JOB":"Bắt đầu xử lý nội dung","FAIL_CONTENT_JOB":"Xử lý nội dung thất bại","RECOVER_CONTENT_JOB":"Khôi phục tác vụ","PREPARE_TRANSLATION":"Chuẩn bị bản dịch","IMPORT_REVIEWED_TRANSLATION":"Nhập bản dịch đã duyệt","COMPLETE_CONTENT_JOB":"Hoàn tất nội dung","CREATE_KNOWLEDGE_DOCUMENT":"Thêm tài liệu tra cứu","UPDATE_KNOWLEDGE_DOCUMENT":"Sửa tài liệu tra cứu","DEACTIVATE_KNOWLEDGE_DOCUMENT":"Ngừng tài liệu tra cứu","PUBLISH_KNOWLEDGE_DOCUMENT":"Xuất bản tài liệu","FAIL_KNOWLEDGE_PROCESSING":"Lỗi xử lý tài liệu"};

export const InternalAuditLogsPage: React.FC = () => {
  const baseUrl = getApiBaseUrl();

  const [logs, setLogs] = useState<AuditLogDto[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [availableActions, setAvailableActions] = useState<string[]>([]);

  const [selectedAction, setSelectedAction] = useState<string>('');
  const [fromDate, setFromDate] = useState<string>(businessDate);
  const [toDate, setToDate] = useState<string>(businessDate);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const requestSeq = useRef(0);
  const fetchLogs = async (currentPage = 1) => {
    const seq = ++requestSeq.current;
    setLoading(true);
    setError(null);
    try {
      const res = await executeAuthenticatedInternalRequest(baseUrl, token => getAuditLogs(
        {
          page: currentPage,
          limit,
          action: selectedAction || undefined,
          from: fromDate ? new Date(fromDate + 'T00:00:00+07:00').toISOString().replace(/\.\d{3}Z$/, 'Z') : undefined,
          to: toDate ? new Date(toDate + 'T23:59:59+07:00').toISOString().replace(/\.\d{3}Z$/, 'Z') : undefined
        },
        token,
        baseUrl
      ));
      if (seq !== requestSeq.current) return;
      if (!Array.isArray(res.items) || !Number.isSafeInteger(res.total)) throw new Error('Dữ liệu lịch sử thao tác chưa hợp lệ. Vui lòng tải lại.');
      setLogs(res.items);
      setTotal(res.total);
      setPage(res.page);
      if (res.actions) {
        setAvailableActions(res.actions);
      }
    } catch (err) {
      if (seq !== requestSeq.current) return;
      setError(err instanceof Error ? err.message : 'Không thể tải nhật ký thao tác');
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(1);
    return () => { requestSeq.current++; };
  }, [baseUrl]);

  const handleFilter = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLogs(1);
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 16px' }}>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '1.6rem', color: '#132a13', margin: 0, fontWeight: 700 }}>
          Lịch sử thao tác
        </h1>
        <p style={{ color: '#4b5563', fontSize: '0.86rem', margin: '4px 0 0' }}>
          Xem ai đã thu tiền, cấp mã hoặc sửa nội dung. Bộ lọc tính trọn ngày theo giờ Việt Nam.
        </p>
      </div>

      {/* Bo loc nhat ky */}
      <div className="tcv-card" style={{ marginBottom: '20px', padding: '16px' }}>
        <form onSubmit={handleFilter} style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'flex-end' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
              Loại hành động
            </label>
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #d1d5db', fontSize: '0.86rem' }}
            >
              <option value="">-- Tất cả hành động --</option>
              {availableActions.map((act) => (
                <option key={act} value={act}>{actionLabels[act] || act}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
              Từ ngày
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              style={{ padding: '7px 12px', borderRadius: '4px', border: '1px solid #d1d5db', fontSize: '0.86rem' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
              Đến ngày
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              style={{ padding: '7px 12px', borderRadius: '4px', border: '1px solid #d1d5db', fontSize: '0.86rem' }}
            />
          </div>

          <button type="submit" className="btn-primary" style={{ padding: '8px 16px', fontSize: '0.86rem' }}>
            Lọc nhật ký
          </button>
        </form>
      </div>

      {error && (
        <div className="banner-notice" style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', marginBottom: '16px' }}>
          <div>{error}{logs.length > 0 && " Đang hiển thị lần tải thành công trước."}</div>
        </div>
      )}

      {/* Bang nhat ky */}
      <div className="tcv-card" style={{ padding: '0', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.86rem' }}>
          <thead>
            <tr style={{ background: '#f3f4f6', borderBottom: '2px solid #e5e7eb', color: '#374151' }}>
              <th style={{ padding: '12px 14px' }}>Mã #</th>
              <th style={{ padding: '12px 14px' }}>Thời điểm (giờ Việt Nam)</th>
              <th style={{ padding: '12px 14px' }}>Hành động</th>
              <th style={{ padding: '12px 14px' }}>Tài nguyên</th>
              <th style={{ padding: '12px 14px' }}>Người thực hiện</th>
              <th style={{ padding: '12px 14px' }}>IP</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: '#6b7280' }}>
                  Đang tải dữ liệu nhật ký...
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: '#6b7280' }}>
                  Không tìm thấy bản ghi nhật ký nào phù hợp.
                </td>
              </tr>
            ) : (
              logs.map((log) => {
                const formattedDate = new Date(log.createdAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
                return (
                  <tr key={log.logId} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: '#6b7280' }}>
                      #{log.logId}
                    </td>
                    <td style={{ padding: '10px 14px', color: '#374151', whiteSpace: 'nowrap' }}>
                      {formattedDate}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{
                        background: '#e0f2fe',
                        color: '#0369a1',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontWeight: 600,
                        fontSize: '0.8rem'
                      }}>
                        {actionLabels[log.action] || log.action}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', color: '#4b5563' }}>
                      {log.resourceType ? `${log.resourceType} (${log.resourceId || 'N/A'})` : '—'}
                    </td>
                    <td style={{ padding: '10px 14px', color: '#1f2937' }}>
                      {log.actorName || log.userEmail || (log.userId ? `User #${log.userId}` : 'Hệ thống')}
                    </td>
                    <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: '0.78rem', color: '#6b7280' }}>
                      {log.ipAddress || '—'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Phan trang */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', background: '#f9fafb', borderTop: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: '0.82rem', color: '#6b7280' }}>
            Hiển thị trang <strong>{page}</strong> / <strong>{totalPages}</strong> (Tổng cộng <strong>{total}</strong> bản ghi)
          </div>

          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              type="button"
              onClick={() => fetchLogs(page - 1)}
              disabled={page <= 1 || loading}
              className="btn-secondary btn-sm"
              style={{ padding: '4px 12px' }}
            >
              ← Trang trước
            </button>
            <button
              type="button"
              onClick={() => fetchLogs(page + 1)}
              disabled={page >= totalPages || loading}
              className="btn-secondary btn-sm"
              style={{ padding: '4px 12px' }}
            >
              Trang sau →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
