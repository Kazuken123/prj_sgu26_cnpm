import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { executeAuthenticatedInternalRequest } from '../api/auth';
import { ApiError, getApiBaseUrl } from '../api/client';
import { businessDate, getOperations, localTime, money, operationsCsv, OperationsData, OperationStatus } from '../api/operations';
import { Icon } from '../components/Icon';
import { VisitorAnalyticsPanel } from '../components/VisitorAnalyticsPanel';
import { OnlineVisitorsCard } from '../components/OnlineVisitorsCard';
import { AdminPage, PageHeader, Card, Alert, Badge, StatusBadge, Field, EmptyState, LoadingState, Pagination } from '../components/admin/AdminUI';

const labels: Record<OperationStatus, string> = { ALL: 'Tất cả', PAID: 'Đã thu tiền', PENDING: 'Chờ thu tiền', UNCLAIMED: 'Chưa đổi mã', FAILED: 'Thanh toán lỗi' };
export const InternalDashboardPage: React.FC = () => {
  const baseUrl = getApiBaseUrl();
  const [params, setParams] = useSearchParams();
  const queryKey = params.toString();
  const [data, setData] = useState<OperationsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [draftSearch, setDraftSearch] = useState(params.get('q') || '');
  const [exportError, setExportError] = useState<string | null>(null);
  const seq = useRef(0); const controller = useRef<AbortController | null>(null);
  const refresh = useCallback(async () => {
    const id = ++seq.current; controller.current?.abort();
    const abort = new AbortController(); controller.current = abort;
    setLoading(true); setError(null);
    const selected = new URLSearchParams(queryKey);
    try {
      const report = await executeAuthenticatedInternalRequest(baseUrl, token => getOperations({
        date: selected.get('date') || undefined, status: selected.get('status') || 'ALL',
        q: selected.get('q') || undefined, page: selected.get('page') || '1'
      }, token, baseUrl, abort.signal));
      if (id === seq.current) setData(report);
    } catch (e) {
      if (id === seq.current && !(e instanceof ApiError && e.code === 'ABORT_ERROR')) setError(e instanceof Error ? e.message : 'Không thể tải báo cáo.');
    } finally { if (id === seq.current) setLoading(false); }
  }, [baseUrl, queryKey]);
  useEffect(() => {
    setData(null); setDraftSearch(new URLSearchParams(queryKey).get('q') || ''); void refresh();
    const timer = window.setInterval(() => { if (typeof document === 'undefined' || document.visibilityState !== 'hidden') void refresh(); }, 30000);
    return () => { seq.current++; controller.current?.abort(); window.clearInterval(timer); };
  }, [refresh, queryKey]);
  const select = (updates: Record<string, string>) => {
    const next = new URLSearchParams(params); next.delete('page');
    for (const [key, value] of Object.entries(updates)) { if (value) next.set(key, value); else next.delete(key); }
    setParams(next);
  };
  const exportReport = () => {
    if (!data || error) return;
    try {
      const url = URL.createObjectURL(new Blob([operationsCsv(data)], { type: 'text/csv;charset=utf-8' }));
      const link = document.createElement('a'); link.href = url; link.download = `thu-ngan-${data.date}.csv`;
      link.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000); setExportError(null);
    } catch { setExportError('Không tải được tệp CSV. Vui lòng thử lại.'); }
  };
  const currentStatus = (params.get('status') || 'ALL') as OperationStatus;
  const admin = data?.scope === 'ALL_STAFF';
  const hourly = Array.from({ length: 24 }, (_, hour) => ({ hour, count: data?.hourly.filter(r => Number(r.hour) === hour).reduce((n, r) => n + Number(r.count), 0) || 0 }));
  const peak = Math.max(1, ...hourly.map(r => r.count));
  const totals = data?.totals.length ? data.totals.map(r => money(r.amount, r.currency)).join(' + ') : data ? '0 ₫' : 'Chưa có dữ liệu';

  return <AdminPage>
    <PageHeader eyebrow={admin ? 'Bảng điều khiển · Quản trị' : 'Bảng điều khiển'} title={admin ? 'Tổng quan kinh doanh' : 'Công việc hôm nay'}
      description={admin ? 'Theo dõi tiền đã thu và những việc cần xử lý tại quầy.' : 'Các giao dịch bạn tạo hoặc xác nhận, cùng việc phục vụ khách tiếp theo.'}
      actions={<Link className="adm-btn adm-btn--primary" to="/internal/cash"><Icon name="ticket" /> Phục vụ khách mới</Link>} />

    <Card flush>
      <div className="adm-toolbar" style={{ borderBottom: 0 }}>
        <Field label="Ngày làm việc" htmlFor="business-day"><input id="business-day" type="date" max={data?.today || businessDate()} value={params.get('date') || data?.date || businessDate()} onChange={e => select({ date: e.target.value })} /></Field>
        <button type="button" className="adm-btn adm-btn--ghost" onClick={() => select({ date: '' })}>Hôm nay</button>
        <span className="adm-toolbar__spacer" />
        <button type="button" className="adm-btn adm-btn--secondary" onClick={() => void refresh()} disabled={loading}>{loading ? 'Đang cập nhật…' : 'Làm mới'}</button>
        <button type="button" className="adm-btn adm-btn--secondary" onClick={exportReport} disabled={!data || Boolean(error) || loading}>Xuất tổng hợp CSV</button>
      </div>
      <p className="adm-small adm-muted" style={{ margin: 0, padding: '0 24px 16px' }}>Giờ Việt Nam (UTC+7). {data ? `${data.scope === 'ALL_STAFF' ? 'Toàn bộ nhân viên' : 'Chỉ giao dịch của bạn'}. Cập nhật ${localTime(data.generatedAt)}; tự làm mới mỗi 30 giây.` : 'Đang kết nối sổ thu ngân…'}</p>
    </Card>

    {error && <Alert tone="danger" action={<button type="button" className="adm-btn adm-btn--secondary adm-btn--sm" onClick={() => void refresh()} disabled={loading}>Thử lại</button>}>{error} {data ? 'Đang hiển thị bản ghi từ lần tải thành công trước; chưa có số liệu mới.' : 'Số liệu không khả dụng; không được xem là doanh thu bằng 0.'}</Alert>}
    {exportError && <Alert tone="danger">{exportError}</Alert>}
    {!data && !error && <LoadingState label="Đang tải doanh thu và giao dịch…" />}

    {data && <>
      <section className="adm-grid adm-grid--4" aria-label="Tổng hợp ngày">
        <div className="ops-revenue"><span>Tiền thuyết minh đã thu</span><strong>{totals}</strong><small>Chỉ tiền mặt đã được nhân viên xác nhận. Không gồm vé vào cổng.</small></div>
        {([['PAID', data.counts.paid, 'Đã thu tiền', 'check', 'success'], ['PENDING', data.counts.pending, 'Chờ thu tiền', 'clock', 'warning'], ['UNCLAIMED', data.counts.unclaimed, 'Chưa đổi mã', 'ticket', 'info']] as const).map(([status, count, label, icon, tone]) =>
          <button key={status} type="button" className={`adm-stat adm-stat--${tone}`} onClick={() => select({ status })} aria-pressed={currentStatus === status}>
            <span className="adm-stat__top"><span className="adm-stat__label">{label}</span><span className="adm-stat__icon"><Icon name={icon} /></span></span>
            <strong className="adm-stat__value">{count}</strong><span className="adm-stat__hint">Bấm để lọc sổ giao dịch</span>
          </button>)}
      </section>

      {admin && <div className="adm-grid adm-grid--4"><OnlineVisitorsCard /></div>}

      <div className="adm-grid adm-grid--main-aside">
        <Card title="Nhịp phục vụ trong ngày" description="Tính theo giờ xác nhận thu tiền, không phải số khách đang ở trong vườn." actions={<Badge tone="brand">{data.counts.paid} giao dịch đã thu</Badge>}>
          {data.counts.paid === 0 ? <EmptyState icon="ticket" title="Chưa ghi nhận tiền thu trong ngày này." action={<Link className="adm-btn adm-btn--secondary adm-btn--sm" to="/internal/cash">Mở quầy thu ngân</Link>} />
            : <div className="ops-hourly" role="list" aria-label="Số giao dịch theo giờ Việt Nam">{hourly.map(row => <div role="listitem" key={row.hour} className="ops-hour" aria-label={`${row.hour} giờ: ${row.count} giao dịch`} title={`${row.hour}:00 — ${row.count} giao dịch`}><span style={{ height: `${row.count / peak * 100}%` }} /><small>{row.hour % 3 === 0 ? `${row.hour}h` : ''}</small></div>)}</div>}
        </Card>
        <Card title="Cần xử lý" description="Giao dịch ngày đã chọn">
          {data.counts.pending > 0 && <button type="button" className="ops-task" onClick={() => select({ status: 'PENDING' })}><Icon name="ticket" /><span><strong>{data.counts.pending} yêu cầu chưa thu tiền</strong><small>Mở giao dịch để tiếp tục phục vụ.</small></span><Icon name="arrow" /></button>}
          {data.counts.unclaimed > 0 && <button type="button" className="ops-task" onClick={() => select({ status: 'UNCLAIMED' })}><Icon name="lock" /><span><strong>{data.counts.unclaimed} lượt chưa đổi mã</strong><small>Đã thu tiền, quyền còn hạn; kiểm tra khách đã nhận mã.</small></span><Icon name="arrow" /></button>}
          {data.counts.failed > 0 && <button type="button" className="ops-task" onClick={() => select({ status: 'FAILED' })}><Icon name="info" /><span><strong>{data.counts.failed} thanh toán lỗi</strong><small>Kiểm tra trước khi tạo yêu cầu mới.</small></span><Icon name="arrow" /></button>}
          {!data.counts.pending && !data.counts.unclaimed && !data.counts.failed && <EmptyState icon="check" title="Không có giao dịch cần xử lý trong ngày này." />}
          <hr className="adm-divider" />
          <Link className="adm-link" to="/internal/pois">Kiểm tra nội dung thuyết minh <Icon name="arrow" /></Link>
        </Card>
      </div>

      <Card flush title="Sổ giao dịch" description="Đã thu: theo ngày nhận tiền. Chưa thu / lỗi: theo ngày tạo yêu cầu." actions={<Badge>{data.transactions.total} kết quả</Badge>}>
        <div className="adm-toolbar" id="transactions">
          <div className="adm-segmented" role="group" aria-label="Trạng thái giao dịch">{Object.entries(labels).map(([status, label]) => <button type="button" key={status} aria-pressed={currentStatus === status} onClick={() => select({ status })}>{label}</button>)}</div>
          <span className="adm-toolbar__spacer" />
          <form className="adm-input-group" onSubmit={e => { e.preventDefault(); select({ q: draftSearch.trim() }); }} role="search">
            <label className="sr-only" htmlFor="payment-search">Tìm mã giao dịch hoặc mã phiên</label>
            <span className="adm-search"><Icon name="search" /><input id="payment-search" value={draftSearch} onChange={e => setDraftSearch(e.target.value)} maxLength={100} placeholder="Mã giao dịch hoặc mã phiên" /></span>
            <button type="submit" className="adm-btn adm-btn--secondary" aria-label="Tìm giao dịch">Tìm</button>
          </form>
        </div>
        <div className="adm-table-wrap"><table className="adm-table"><caption className="sr-only">Giao dịch thu tiền thuyết minh ngày {data.date}</caption><thead><tr><th>Giao dịch</th><th>Thời gian</th><th className="adm-num">Số tiền</th><th>Nhân viên xác nhận</th><th>Trạng thái</th><th><span className="sr-only">Thao tác</span></th></tr></thead><tbody>
          {data.transactions.items.map(row => <tr key={row.sessionId}><td><span className="ops-reference adm-cell-title">{row.paymentRef}</span><small title={row.sessionId}>Phiên {row.sessionId.slice(0, 8)}</small></td><td>{localTime(row.paidAt || row.createdAt)}<small>{row.paidAt ? 'Đã thu lúc' : 'Tạo lúc'}</small></td><td className="adm-num ops-money">{money(row.amount, row.currency)}</td><td>{row.staffName}</td><td><StatusBadge status={row.paymentStatus} label={labels[row.paymentStatus]} />{row.paymentStatus === 'PAID' && <small>{row.sessionStatus === 'EXPIRED' ? 'Quyền nghe hết hạn' : row.sessionStatus === 'REVOKED' ? 'Quyền nghe đã thu hồi' : row.accessClaimed ? 'Khách đã đổi mã' : 'Khách chưa đổi mã'}</small>}</td><td className="adm-actions-cell"><Link className="adm-btn adm-btn--ghost adm-btn--sm" to={`/internal/cash?session=${encodeURIComponent(row.sessionId)}`} aria-label={`Mở giao dịch ${row.paymentRef}`}>Mở <Icon name="arrow" /></Link></td></tr>)}
        </tbody></table></div>
        {!data.transactions.items.length && <EmptyState title="Không có giao dịch khớp bộ lọc." action={<button type="button" className="adm-btn adm-btn--secondary adm-btn--sm" onClick={() => { setDraftSearch(''); select({ status: 'ALL', q: '' }); }}>Xóa bộ lọc</button>} />}
        <Pagination page={data.transactions.page} totalPages={Math.max(1, Math.ceil(data.transactions.total / data.transactions.limit))} disabled={loading}
          summary={<>{data.transactions.total} giao dịch</>} prevLabel="Trước" nextLabel="Tiếp" onChange={page => select({ page: String(page) })} />
      </Card>

      <div className={admin ? 'adm-grid adm-grid--2' : 'adm-stack'}>
        {admin && <Card flush title="Thu tiền theo nhân viên" description="Ghi nhận cho người xác nhận thu tiền; không phải chấm công hoặc tiền mặt kiểm đếm cuối ca." actions={<Link className="adm-btn adm-btn--secondary adm-btn--sm" to="/internal/staff/new"><Icon name="plus" />Thêm nhân viên</Link>}>
          <div className="adm-table-wrap"><table className="adm-table"><thead><tr><th>Nhân viên</th><th className="adm-num">Giao dịch</th><th className="adm-num">Đã thu</th></tr></thead><tbody>{data.staff.map(row => <tr key={`${row.userId}-${row.currency}`}><td className="adm-cell-title">{row.name}</td><td className="adm-num">{row.count}</td><td className="adm-num ops-money">{money(row.amount, row.currency)}</td></tr>)}</tbody></table></div>
          {!data.staff.length && <EmptyState icon="users" title="Chưa có nhân viên xác nhận thu tiền trong ngày." />}
        </Card>}
        <Card title="Nội dung cần kiểm tra" description="Điểm đang mở có tác vụ lỗi hoặc thiếu bản ghi audio hiện hành." actions={<Badge tone={data.content.length ? 'warning' : 'success'}>{data.content.length} điểm</Badge>}>
          {data.content.slice(0, 8).map(poi => <Link className="ops-task" key={poi.poiId} to={`/internal/pois/${poi.poiId}`}><Icon name="headphones" /><span><strong>{poi.name}</strong><small>{Number(poi.failedJobs) > 0 ? `${poi.failedJobs} tác vụ cần thử lại` : 'Chưa có bản ghi audio hiện hành'}</small></span><Icon name="arrow" /></Link>)}
          {data.content.length > 8 && <Link className="adm-link" style={{ marginTop: 12 }} to="/internal/pois">Xem toàn bộ điểm tham quan <Icon name="arrow" /></Link>}
          {!data.content.length && <EmptyState icon="check" title="Nội dung đầy đủ">Không ghi nhận lỗi tác vụ hoặc thiếu bản ghi audio hiện hành.</EmptyState>}
        </Card>
      </div>
    </>}

    <VisitorAnalyticsPanel />
  </AdminPage>;
};
