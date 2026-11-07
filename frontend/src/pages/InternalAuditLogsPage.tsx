import React, { useState, useEffect, useRef } from 'react';
import { getAuditLogs, AuditLogDto } from '../api/audit';
import { executeAuthenticatedInternalRequest } from '../api/auth';
import { businessDate } from '../api/operations';
import { getApiBaseUrl } from '../api/client';
import { Icon } from '../components/Icon';
import { AdminPage, PageHeader, Card, Alert, Badge, Field, EmptyState, LoadingState, Pagination } from '../components/admin/AdminUI';

const actionLabels: Record<string,string> = {"CONFIRM_CASH_PAYMENT":"Xác nhận thu tiền","CREATE_PENDING_PAYMENT":"Tạo yêu cầu thu tiền","ISSUE_CASH_CODE":"Cấp mã nghe","ISSUE_VISITOR_TOKEN":"Khách đổi mã nghe","CREATE_STAFF":"Thêm nhân viên","CREATE_POI":"Thêm điểm tham quan","UPDATE_POI":"Sửa điểm tham quan","DEACTIVATE_POI":"Ngừng mở điểm tham quan","CREATE_TOUR":"Tạo lộ trình","UPDATE_TOUR":"Sửa lộ trình","RETRY_CONTENT_JOB":"Thử lại xử lý nội dung","CLAIM_CONTENT_JOB":"Bắt đầu xử lý nội dung","FAIL_CONTENT_JOB":"Xử lý nội dung thất bại","RECOVER_CONTENT_JOB":"Khôi phục tác vụ","PREPARE_TRANSLATION":"Chuẩn bị bản dịch","IMPORT_REVIEWED_TRANSLATION":"Nhập bản dịch đã duyệt","COMPLETE_CONTENT_JOB":"Hoàn tất nội dung","CREATE_KNOWLEDGE_DOCUMENT":"Thêm tài liệu tra cứu","UPDATE_KNOWLEDGE_DOCUMENT":"Sửa tài liệu tra cứu","DEACTIVATE_KNOWLEDGE_DOCUMENT":"Ngừng tài liệu tra cứu","PUBLISH_KNOWLEDGE_DOCUMENT":"Xuất bản tài liệu","FAIL_KNOWLEDGE_PROCESSING":"Lỗi xử lý tài liệu","REISSUE_VISITOR_TOKEN":"Cấp lại vé cho khách","PREPARE_ONLINE_CHECKOUT":"Chuẩn bị thanh toán online","ONLINE_CHECKOUT_READY":"Phát hành thanh toán online","CONFIRM_ONLINE_PAYMENT":"Xác nhận thanh toán online","FAIL_ONLINE_PAYMENT":"Thanh toán online thất bại","SEED_APPROVED_DEMO":"Nạp dữ liệu demo","PUBLISH_DEMO_AUDIO":"Xuất bản audio demo","ROLLBACK_DEMO_AUDIO":"Hoàn tác audio demo"};

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
  // actionOverride lets quick filters query immediately instead of waiting for state.
  const fetchLogs = async (currentPage = 1, actionOverride?: string) => {
    const seq = ++requestSeq.current;
    setLoading(true);
    setError(null);
    try {
      const res = await executeAuthenticatedInternalRequest(baseUrl, token => getAuditLogs(
        {
          page: currentPage,
          limit,
          action: (actionOverride ?? selectedAction) || undefined,
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
  // Details are already projected to an allow-list by the backend (UC-17);
  // render as plain text only.
  const detailText = (details: AuditLogDto['details']) => details && typeof details === 'object'
    ? Object.entries(details).filter(([, value]) => value !== null && value !== undefined && typeof value !== 'object')
      .map(([key, value]) => `${key}: ${String(value)}`) : [];
  const toneFor = (action: string) => action.startsWith('FAIL') ? 'danger' : action.startsWith('REISSUE') ? 'warning' : action.startsWith('DEACTIVATE') ? 'neutral' : action.includes('PAYMENT') || action.includes('CASH') ? 'success' : 'info';

  return (
    <AdminPage>
      <PageHeader eyebrow="Quản trị hệ thống" title="Lịch sử thao tác"
        description="Xem ai đã thu tiền, cấp mã, cấp lại vé hoặc sửa nội dung. Bộ lọc tính trọn ngày theo giờ Việt Nam. Nhật ký chỉ được xem, không sửa hoặc xóa." />

      {error && <Alert tone="danger">{error}{logs.length > 0 && " Đang hiển thị lần tải thành công trước."}</Alert>}

      <Card flush>
        {/* Bo loc nhat ky */}
        <form onSubmit={handleFilter} className="adm-toolbar">
          <Field label="Loại hành động" htmlFor="audit-action">
            <select id="audit-action" value={selectedAction} onChange={(e) => setSelectedAction(e.target.value)}>
              <option value="">-- Tất cả hành động --</option>
              {availableActions.map((act) => <option key={act} value={act}>{actionLabels[act] || act}</option>)}
            </select>
          </Field>
          <Field label="Từ ngày" htmlFor="audit-from"><input id="audit-from" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} /></Field>
          <Field label="Đến ngày" htmlFor="audit-to"><input id="audit-to" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} /></Field>
          <button type="submit" className="adm-btn adm-btn--primary"><Icon name="search" />Lọc nhật ký</button>
          <span className="adm-toolbar__spacer" />
          <Badge>{total} bản ghi</Badge>
        </form>
        <div className="adm-toolbar" style={{ paddingTop: 0 }} role="group" aria-label="Lọc nhanh theo hành động">
          <span className="adm-label">Lọc nhanh:</span>
          <div className="adm-segmented">{['', 'REISSUE_VISITOR_TOKEN', 'CONFIRM_CASH_PAYMENT', 'ISSUE_CASH_CODE', 'UPDATE_POI'].filter(act => !act || availableActions.includes(act)).map(act =>
            <button type="button" key={act || 'all'} aria-pressed={selectedAction === act} disabled={loading} onClick={() => { setSelectedAction(act); void fetchLogs(1, act); }}>{act ? actionLabels[act] || act : 'Tất cả'}</button>)}</div>
        </div>

        <div className="adm-table-wrap">
          <table className="adm-table">
            <caption className="sr-only">Nhật ký thao tác</caption>
            <thead>
              <tr><th>Mã #</th><th>Thời điểm (giờ Việt Nam)</th><th>Hành động</th><th>Tài nguyên</th><th>Người thực hiện</th><th>Chi tiết</th><th>IP</th></tr>
            </thead>
            <tbody>
              {loading ? (
                <tr className="adm-state-row"><td colSpan={7}><LoadingState label="Đang tải dữ liệu nhật ký..." /></td></tr>
              ) : logs.length === 0 ? (
                <tr className="adm-state-row"><td colSpan={7}><EmptyState icon="search" title="Không tìm thấy bản ghi nhật ký nào phù hợp.">Thử mở rộng khoảng ngày hoặc chọn “Tất cả hành động”.</EmptyState></td></tr>
              ) : (
                logs.map((log) => {
                  const formattedDate = new Date(log.createdAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
                  const lines = detailText(log.details);
                  return (
                    <tr key={log.logId}>
                      <td className="adm-mono adm-muted">#{log.logId}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>{formattedDate}</td>
                      <td><Badge tone={toneFor(log.action)}>{actionLabels[log.action] || log.action}</Badge><small className="adm-mono">{log.action}</small></td>
                      <td>{log.resourceType ? <><span>{log.resourceType}</span><small className="adm-mono" style={{ maxWidth: 220, overflowWrap: 'anywhere' }}>{log.resourceId || 'N/A'}</small></> : '—'}</td>
                      <td className="adm-cell-title">{log.actorName || log.userEmail || (log.userId ? `User #${log.userId}` : 'Hệ thống')}</td>
                      <td style={{ maxWidth: 320 }}>{lines.length ? <details><summary className="adm-link" style={{ cursor: 'pointer' }}>{lines.length} trường</summary><ul style={{ margin: '6px 0 0', paddingLeft: 16, fontSize: 12, overflowWrap: 'anywhere' }}>{lines.map(line => <li key={line}>{line}</li>)}</ul></details> : <span className="adm-muted">—</span>}</td>
                      <td className="adm-mono adm-muted" style={{ fontSize: 12 }}>{log.ipAddress || '—'}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <Pagination page={page} totalPages={totalPages} disabled={loading}
          summary={<>Tổng cộng <strong>{total}</strong> bản ghi</>} onChange={next => fetchLogs(next)} />
      </Card>
    </AdminPage>
  );
};
