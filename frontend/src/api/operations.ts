import { requestApi } from './client.ts';

export interface RevenueTotal { currency: string; amount: string; count: number }
export interface OperationsTransaction {
  sessionId: string; paymentRef: string; amount: string; currency: string;
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED'; sessionStatus: string;
  createdAt: string; paidAt: string | null; expiresAt: string | null; accessClaimed: boolean | number; staffName: string;
}
export interface OperationsData {
  generatedAt: string; date: string; today: string; timeZone: string; scope: 'ALL_STAFF' | 'MY_PAYMENTS';
  window: { from: string; to: string };
  counts: { total: number; paid: number; pending: number; failed: number; unclaimed: number };
  totals: RevenueTotal[]; hourly: Array<RevenueTotal & { hour: number }>;
  staff: Array<RevenueTotal & { userId: number; name: string }>;
  content: Array<{ poiId: number; name: string; failedJobs: number }>;
  transactions: { items: OperationsTransaction[]; total: number; page: number; limit: number };
}
export type OperationStatus = 'ALL' | 'PAID' | 'PENDING' | 'UNCLAIMED' | 'FAILED';
export async function getOperations(query: { date?: string; status?: string; q?: string; page?: string }, token: string, baseUrl: string, signal?: AbortSignal) {
  const params = new URLSearchParams(Object.entries(query).filter(([, value]) => Boolean(value)) as [string, string][]);
  const result = await requestApi<{ data: OperationsData }>({ method: 'GET', path: `/api/admin/operations?${params}`, token, overrideBaseUrl: baseUrl, signal });
  return result.data.data;
}
export function businessDate(date = new Date()) {
  return new Date(date.getTime() + 7 * 3600000).toISOString().slice(0, 10);
}
export function money(amount: string, currency: string) {
  if (!/^\d+\.\d{2}$/.test(amount)) return 'Không khả dụng';
  const [whole, fraction] = amount.split('.');
  return `${BigInt(whole).toLocaleString('vi-VN')}${fraction !== '00' ? ',' + fraction : ''} ${currency === 'VND' ? '₫' : currency}`;
}
export function localTime(value: string | null) {
  if (!value || !Number.isFinite(Date.parse(value))) return '—';
  return new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}
export function operationsCsv(data: OperationsData) {
  const rows: Array<Array<string | number>> = [
    ['Báo cáo thu tiền thuyết minh', data.date, 'Asia/Ho_Chi_Minh'],
    ['Phạm vi', data.scope === 'ALL_STAFF' ? 'Toàn bộ nhân viên' : 'Giao dịch của tôi'],
    ['Cập nhật lúc', data.generatedAt], ['Chỉ gồm CASH đã được nhân viên xác nhận; không phải lợi nhuận hoặc doanh thu vé vào cổng'],
    ['Ngày', 'Tiền tệ', 'Đã thu', 'Giao dịch đã thu'],
    ...data.totals.map(row => [data.date, row.currency, row.amount, row.count]),
    ['Chờ thu tiền (tạo trong ngày)', data.counts.pending], ['Đã thu, chưa đổi mã, còn hạn tại lúc cập nhật', data.counts.unclaimed],
    [], ['Nhân viên xác nhận', 'Tiền tệ', 'Đã thu', 'Giao dịch'],
    ...data.staff.map(row => [row.name, row.currency, row.amount, row.count]),
    [], ['Giờ Việt Nam', 'Tiền tệ', 'Đã thu', 'Giao dịch'],
    ...data.hourly.map(row => [row.hour + ':00', row.currency, row.amount, row.count])
  ];
  return '\uFEFF' + rows.map(row => row.map(value => {
    const text = String(value); const safe = /^[=+\-@\t\r\n]/.test(text) ? "'" + text : text;
    return '"' + safe.replace(/"/g, '""') + '"';
  }).join(',')).join('\r\n');
}
