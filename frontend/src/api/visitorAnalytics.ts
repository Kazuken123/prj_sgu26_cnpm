import { requestApi } from './client';
export type AnalyticsPeriod = 'day' | 'week' | 'month' | 'year';
export interface VisitorReport {
  generatedAt: string; trackingStartedAt: string; timeZone: string;
  period: AnalyticsPeriod; date: string; from: string; to: string;
  hasCoverage: boolean; partialCoverage: boolean;
  activeNow: number; visitors: number; entries: number;
  peak: number; peakAt: string | null; freshnessSeconds: number; dwellSeconds: number;
  buckets: Array<{ label: string; from: string; to: string; peak: number | null }>;
  pois: Array<{ poiId: number; name: string; status: string; visitors: number; visits: number }>;
}
export async function getVisitorReport(period: AnalyticsPeriod, date: string, token: string, baseUrl: string, signal?: AbortSignal) {
  const result = await requestApi<{data: VisitorReport}>({path:`/api/admin/visitor-analytics?${new URLSearchParams({period,date})}`,token,overrideBaseUrl:baseUrl,signal});
  const data=result.data.data;
  if(!data || !Array.isArray(data.buckets) || !Array.isArray(data.pois) || !['activeNow','visitors','entries','peak'].every(k=>Number.isSafeInteger(data[k as 'activeNow'])&&data[k as 'activeNow']>=0) || !Number.isFinite(Date.parse(data.generatedAt)) || !Number.isFinite(Date.parse(data.trackingStartedAt))) throw new Error('Dữ liệu thống kê không hợp lệ; chưa thể hiển thị số liệu.');
  return data;
}
export interface AnalyticsPosition { latitude: number; longitude: number; accuracy: number; observedAt: number }
export async function sendPresence(token: string, position: AnalyticsPosition | null, baseUrl: string) {
  const body = position ? {latitude:position.latitude,longitude:position.longitude,accuracy:position.accuracy,sampleAgeMs:Math.max(0,Date.now()-position.observedAt)} : {exit:true};
  await requestApi({method:'POST',path:'/api/analytics/heartbeat',token,body,overrideBaseUrl:baseUrl});
}
const pending = new Map<string, Promise<string>>();
export const analyticsKey = (baseUrl: string) => 'tcv_analytics_token:' + baseUrl;
export async function getAnalyticsToken(baseUrl: string) {
  const create = async () => {
    const saved = window.localStorage.getItem(analyticsKey(baseUrl));
    if (saved && /^[a-f0-9]{64}$/.test(saved)) return saved;
    const result = await requestApi<{data:{token:string}}>({method:'POST',path:'/api/analytics/sessions',body:{},overrideBaseUrl:baseUrl});
    window.localStorage.setItem(analyticsKey(baseUrl),result.data.data.token);
    return result.data.data.token;
  };
  if (!pending.has(baseUrl)) {
    const job = (async()=>typeof navigator !== 'undefined' && navigator.locks ? await navigator.locks.request(analyticsKey(baseUrl),create) : await create())();
    pending.set(baseUrl,job.finally(()=>pending.delete(baseUrl)));
  }
  return pending.get(baseUrl)!;
}
export function analyticsCsv(data: VisitorReport) {
  const rows: Array<Array<string|number>> = [
    ['Thống kê lượt ứng dụng có GPS','Asia/Ho_Chi_Minh'],['Từ',data.from],['Đến (không gồm)',data.to],['Bắt đầu ghi nhận',data.trackingStartedAt],
    ['Cập nhật',data.generatedAt],['Đang trong khuôn viên (ước tính)',data.activeNow],['Lượt ứng dụng trong kỳ',data.hasCoverage?data.visitors:'Chưa có dữ liệu'],
    ['Cao điểm đồng thời',data.hasCoverage?data.peak:'Chưa có dữ liệu'],['Lúc cao điểm',data.peakAt||''],
    [],['Khoảng bắt đầu','Khoảng kết thúc','Cao điểm đồng thời'],...data.buckets.map(b=>[b.from,b.to,b.peak??'Chưa có dữ liệu']),
    [],['Điểm tham quan','Lượt ứng dụng khác nhau','Số lần ghé'],...data.pois.map(p=>[p.name,data.hasCoverage?p.visitors:'Chưa có dữ liệu',data.hasCoverage?p.visits:'Chưa có dữ liệu'])
  ];
  return '\uFEFF'+rows.map(row=>row.map(v=>{const text=String(v);return '"'+(/^[=+\-@\t\r\n]/.test(text)?"'":'')+text.replace(/"/g,'""')+'"';}).join(',')).join('\r\n');
}
