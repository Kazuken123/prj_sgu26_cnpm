import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { executeAuthenticatedInternalRequest } from '../api/auth';
import { ApiError, getApiBaseUrl } from '../api/client';
import { businessDate, getOperations, localTime, money, operationsCsv, OperationsData, OperationStatus } from '../api/operations';
import { Icon } from '../components/Icon';
import { VisitorAnalyticsPanel } from '../components/VisitorAnalyticsPanel';
import { OnlineVisitorsCard } from '../components/OnlineVisitorsCard';

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

  return <div className="ops-page">
    <header className="ops-heading">
      <div><h1>{admin ? 'Tổng quan kinh doanh' : 'Công việc hôm nay'}</h1><p>{admin ? 'Theo dõi tiền đã thu và những việc cần xử lý tại quầy.' : 'Các giao dịch bạn tạo hoặc xác nhận, cùng việc phục vụ khách tiếp theo.'}</p></div>
      <Link className="ops-primary" to="/internal/cash"><Icon name="ticket" /> Phục vụ khách mới <span><Icon name="arrow" /></span></Link>
    </header>
    {admin && <OnlineVisitorsCard />}
    <VisitorAnalyticsPanel />
    <h2 className="ops-revenue-heading">Thu ngân & doanh thu</h2>
    <div className="ops-toolbar">
      <div className="ops-date-control"><label htmlFor="business-day">Ngày làm việc</label><input id="business-day" type="date" max={data?.today || businessDate()} value={params.get('date') || data?.date || businessDate()} onChange={e => select({ date: e.target.value })} /><button type="button" onClick={() => select({ date: '' })}>Hôm nay</button></div>
      <div className="ops-actions"><button onClick={() => void refresh()} disabled={loading}>{loading ? 'Đang cập nhật…' : 'Làm mới'}</button><button onClick={exportReport} disabled={!data || Boolean(error) || loading}>Xuất tổng hợp CSV</button></div>
    </div>
    <p className="ops-meta">Giờ Việt Nam (UTC+7). {data ? `${data.scope === 'ALL_STAFF' ? 'Toàn bộ nhân viên' : 'Chỉ giao dịch của bạn'}. Cập nhật ${localTime(data.generatedAt)}; tự làm mới mỗi 30 giây.` : 'Đang kết nối sổ thu ngân…'}</p>
    {error && <div className="ops-alert" role="alert">{error} {data ? 'Đang hiển thị bản ghi từ lần tải thành công trước; chưa có số liệu mới.' : 'Số liệu không khả dụng; không được xem là doanh thu bằng 0.'}<button onClick={() => void refresh()} disabled={loading}>Thử lại</button></div>}
    {exportError && <p role="alert" className="ops-alert">{exportError}</p>}
    {!data && !error && <p role="status" className="ops-empty">Đang tải doanh thu và giao dịch…</p>}
    {data && <>
      <section className="ops-ledger" aria-label="Tổng hợp ngày">
        <div className="ops-revenue"><span>Tiền thuyết minh đã thu</span><strong>{totals}</strong><small>Chỉ tiền mặt đã được nhân viên xác nhận. Không gồm vé vào cổng.</small></div>
        <div className="ops-counters">
          {([['PAID', data.counts.paid, 'Đã thu tiền'], ['PENDING', data.counts.pending, 'Chờ thu tiền'], ['UNCLAIMED', data.counts.unclaimed, 'Chưa đổi mã']] as const).map(([status, count, label]) => <button key={status} type="button" onClick={() => select({ status })} aria-pressed={currentStatus === status}><strong>{count}</strong><span>{label}</span><Icon name="arrow" /></button>)}
        </div>
      </section>
      <div className="ops-overview-grid">
        <section className="ops-panel"><div className="ops-panel-inner">
          <div className="ops-section-title"><h2>Nhịp phục vụ trong ngày</h2><span>{data.counts.paid} giao dịch đã thu</span></div>
          {data.counts.paid === 0 ? <div className="ops-empty"><Icon name="ticket" /><p>Chưa ghi nhận tiền thu trong ngày này.</p><Link to="/internal/cash">Mở quầy thu ngân</Link></div> : <div className="ops-hourly" role="list" aria-label="Số giao dịch theo giờ Việt Nam">{hourly.map(row => <div role="listitem" key={row.hour} className="ops-hour" aria-label={`${row.hour} giờ: ${row.count} giao dịch`} title={`${row.hour}:00 — ${row.count} giao dịch`}><span style={{ height: `${row.count / peak * 100}%` }} /><small>{row.hour % 3 === 0 ? `${row.hour}h` : ''}</small></div>)}</div>}
          <p className="ops-meta">Tính theo giờ xác nhận thu tiền, không phải số khách đang ở trong vườn.</p>
        </div></section>
        <section className="ops-panel"><div className="ops-panel-inner">
          <div className="ops-section-title"><h2>Cần xử lý</h2><span>Giao dịch ngày đã chọn</span></div>
          {data.counts.pending > 0 && <button className="ops-task" onClick={() => select({ status: 'PENDING' })}><Icon name="ticket" /><span><strong>{data.counts.pending} yêu cầu chưa thu tiền</strong><small>Mở giao dịch để tiếp tục phục vụ.</small></span><Icon name="arrow" /></button>}
          {data.counts.unclaimed > 0 && <button className="ops-task" onClick={() => select({ status: 'UNCLAIMED' })}><Icon name="lock" /><span><strong>{data.counts.unclaimed} lượt chưa đổi mã</strong><small>Đã thu tiền, quyền còn hạn; kiểm tra khách đã nhận mã.</small></span><Icon name="arrow" /></button>}
          {data.counts.failed > 0 && <button className="ops-task" onClick={() => select({ status: 'FAILED' })}><Icon name="info" /><span><strong>{data.counts.failed} thanh toán lỗi</strong><small>Kiểm tra trước khi tạo yêu cầu mới.</small></span><Icon name="arrow" /></button>}
          {!data.counts.pending && !data.counts.unclaimed && !data.counts.failed && <p className="ops-empty">Không có giao dịch cần xử lý trong ngày này.</p>}
          <Link className="ops-text-link" to="/internal/pois">Kiểm tra nội dung thuyết minh <Icon name="arrow" /></Link>
        </div></section>
      </div>
      <section className="ops-panel" id="transactions"><div className="ops-panel-inner">
        <div className="ops-section-title"><div><h2>Sổ giao dịch</h2><p>Đã thu: theo ngày nhận tiền. Chưa thu / lỗi: theo ngày tạo yêu cầu.</p></div><span>{data.transactions.total} kết quả</span></div>
        <div className="ops-transaction-tools"><div className="ops-filters" role="group" aria-label="Trạng thái giao dịch">{Object.entries(labels).map(([status, label]) => <button key={status} aria-pressed={currentStatus === status} onClick={() => select({ status })}>{label}</button>)}</div>
          <form className="ops-search" onSubmit={e => { e.preventDefault(); select({ q: draftSearch.trim() }); }}><label className="sr-only" htmlFor="payment-search">Tìm mã giao dịch hoặc mã phiên</label><input id="payment-search" value={draftSearch} onChange={e => setDraftSearch(e.target.value)} maxLength={100} placeholder="Mã giao dịch hoặc mã phiên" /><button type="submit" aria-label="Tìm giao dịch"><Icon name="search" /></button></form>
        </div>
        <div className="ops-table-scroll"><table className="ops-table"><caption className="sr-only">Giao dịch thu tiền thuyết minh ngày {data.date}</caption><thead><tr><th>Giao dịch</th><th>Thời gian</th><th>Số tiền</th><th>Nhân viên xác nhận</th><th>Trạng thái</th><th><span className="sr-only">Thao tác</span></th></tr></thead><tbody>
          {data.transactions.items.map(row => <tr key={row.sessionId}><td><strong className="ops-reference">{row.paymentRef}</strong><small title={row.sessionId}>Phiên {row.sessionId.slice(0, 8)}</small></td><td>{localTime(row.paidAt || row.createdAt)}<small>{row.paidAt ? 'Đã thu lúc' : 'Tạo lúc'}</small></td><td className="ops-money">{money(row.amount, row.currency)}</td><td>{row.staffName}</td><td><span className={`ops-status ${row.paymentStatus.toLowerCase()}`}>{labels[row.paymentStatus]}</span>{row.paymentStatus === 'PAID' && <small>{row.sessionStatus === 'EXPIRED' ? 'Quyền nghe hết hạn' : row.sessionStatus === 'REVOKED' ? 'Quyền nghe đã thu hồi' : row.accessClaimed ? 'Khách đã đổi mã' : 'Khách chưa đổi mã'}</small>}</td><td><Link className="ops-row-action" to={`/internal/cash?session=${encodeURIComponent(row.sessionId)}`} aria-label={`Mở giao dịch ${row.paymentRef}`}>Mở <Icon name="arrow" /></Link></td></tr>)}
        </tbody></table></div>
        {!data.transactions.items.length && <div className="ops-empty">Không có giao dịch khớp bộ lọc.<button onClick={() => { setDraftSearch(''); select({ status: 'ALL', q: '' }); }}>Xóa bộ lọc</button></div>}
        <div className="ops-pagination"><span>Trang {data.transactions.page} / {Math.max(1, Math.ceil(data.transactions.total / data.transactions.limit))}</span><button disabled={loading || data.transactions.page <= 1} onClick={() => select({ page: String(data.transactions.page - 1) })}>Trước</button><button disabled={loading || data.transactions.page * data.transactions.limit >= data.transactions.total} onClick={() => select({ page: String(data.transactions.page + 1) })}>Tiếp</button></div>
      </div></section>
      <div className="ops-overview-grid">
        {admin && <section className="ops-panel"><div className="ops-panel-inner"><div className="ops-section-title"><h2>Thu tiền theo nhân viên</h2><Link to="/internal/staff/new">Thêm nhân viên</Link></div><p className="ops-meta">Ghi nhận cho người xác nhận thu tiền; không phải chấm công hoặc tiền mặt kiểm đếm cuối ca.</p><div className="ops-table-scroll"><table className="ops-table"><thead><tr><th>Nhân viên</th><th>Giao dịch</th><th>Đã thu</th></tr></thead><tbody>{data.staff.map(row => <tr key={`${row.userId}-${row.currency}`}><td>{row.name}</td><td>{row.count}</td><td className="ops-money">{money(row.amount, row.currency)}</td></tr>)}</tbody></table></div>{!data.staff.length && <p className="ops-empty">Chưa có nhân viên xác nhận thu tiền trong ngày.</p>}</div></section>}
        <section className="ops-panel"><div className="ops-panel-inner"><div className="ops-section-title"><h2>Nội dung cần kiểm tra</h2><span>Hiện tại · {data.content.length} điểm</span></div><p className="ops-meta">Điểm đang mở có tác vụ lỗi hoặc thiếu bản ghi audio hiện hành. Mở từng điểm để nghe kiểm tra và cập nhật.</p>{data.content.slice(0, 8).map(poi => <Link className="ops-task" key={poi.poiId} to={`/internal/pois/${poi.poiId}`}><Icon name="headphones" /><span><strong>{poi.name}</strong><small>{Number(poi.failedJobs) > 0 ? `${poi.failedJobs} tác vụ cần thử lại` : 'Chưa có bản ghi audio hiện hành'}</small></span><Icon name="arrow" /></Link>)}{data.content.length > 8 && <Link to="/internal/pois">Xem toàn bộ điểm tham quan</Link>}{!data.content.length && <p className="ops-empty">Không ghi nhận lỗi tác vụ hoặc thiếu bản ghi audio hiện hành.</p>}</div></section>
      </div>
    </>}
  </div>;
};
