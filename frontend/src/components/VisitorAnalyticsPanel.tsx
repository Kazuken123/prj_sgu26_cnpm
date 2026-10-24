import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { executeAuthenticatedInternalRequest } from '../api/auth';
import { getApiBaseUrl } from '../api/client';
import { businessDate } from '../api/operations';
import { AnalyticsPeriod, analyticsCsv, getVisitorReport, VisitorReport } from '../api/visitorAnalytics';
import { Icon } from './Icon';
const periods:Record<AnalyticsPeriod,string>={day:'Ngày',week:'Tuần',month:'Tháng',year:'Năm'};
const stamp=(value:string|null)=>value?new Intl.DateTimeFormat('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(value)):'Chưa ghi nhận';
export const VisitorAnalyticsPanel:React.FC=()=>{
  const baseUrl=getApiBaseUrl();
  const [period,setPeriod]=useState<AnalyticsPeriod>('day'),[date,setDate]=useState(businessDate);
  const [data,setData]=useState<VisitorReport|null>(null),[error,setError]=useState<string|null>(null),[loading,setLoading]=useState(true);
  const [reload,setReload]=useState(0),[sort,setSort]=useState<'most'|'least'>('most'),[selected,setSelected]=useState<number|null>(null),[search,setSearch]=useState('');
  const seq=useRef(0);
  useEffect(()=>{
    let controller:AbortController|null=null,disposed=false;
    setData(null);setSelected(null);
    const load=async()=>{
      if(disposed)return;const id=++seq.current;controller?.abort();controller=new AbortController();setLoading(true);
      try{const report=await executeAuthenticatedInternalRequest(baseUrl,token=>getVisitorReport(period,date,token,baseUrl,controller!.signal));if(id===seq.current){setData(report);setError(null);}}
      catch(e){if(id===seq.current)setError(e instanceof Error?e.message:'Chưa tải được thống kê.');}
      finally{if(id===seq.current)setLoading(false);}
    };
    void load();const timer=window.setInterval(()=>{if(document.visibilityState!=='hidden')void load();},30000);
    return()=>{disposed=true;seq.current++;controller?.abort();window.clearInterval(timer);};
  },[baseUrl,period,date,reload]);
  const exportCsv=()=>{if(!data||error)return;const url=URL.createObjectURL(new Blob([analyticsCsv(data)],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=`luot-tham-quan-${period}-${date}.csv`;a.click();window.setTimeout(()=>URL.revokeObjectURL(url),1000);};
  const rows=data?.pois.filter(p=>p.name.toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi'))).slice().sort((a,b)=>(sort==='most'?b.visitors-a.visitors:a.visitors-b.visitors)||a.name.localeCompare(b.name,'vi'))||[];
  const maxVisitors=Math.max(1,...(data?.pois.map(p=>p.visitors)||[])),maxPeak=Math.max(1,...(data?.buckets.map(b=>b.peak||0)||[]));
  const focused=selected!==null?data?.buckets[selected]:null;
  return <section className="visitor-analytics" aria-label="Phân tích khách tham quan">
    <div className="ops-section-title"><div><h2>Khách tham quan & mức độ quan tâm</h2><p>Hiện diện trong vườn, thời điểm đông nhất và điểm khách thường ghé.</p></div><button className="ops-secondary" onClick={()=>setReload(n=>n+1)} disabled={loading}>Làm mới thống kê</button></div>
    <div className="ops-toolbar"><div className="ops-filters" role="group" aria-label="Khoảng thống kê">{Object.entries(periods).map(([value,label])=><button key={value} aria-pressed={period===value} onClick={()=>setPeriod(value as AnalyticsPeriod)}>{label}</button>)}</div><div className="ops-date-control"><label htmlFor="analytics-day">Ngày trong kỳ</label><input id="analytics-day" type="date" value={date} max={businessDate()} onChange={e=>{if(e.target.value)setDate(e.target.value);}}/><button onClick={()=>setDate(businessDate())}>Hiện tại</button><button onClick={exportCsv} disabled={!data||!!error||loading}>Xuất thống kê CSV</button></div></div>
    {error&&<div role="alert" className="ops-alert">{error} {data?'Số liệu bên dưới chưa được cập nhật.':'Số liệu không khả dụng.'}</div>}
    {!data&&!error&&<p role="status" className="ops-empty">Đang tải hoạt động tham quan…</p>}
    {data&&<>
      <div className="analytics-scoreboard">
        <div className="analytics-live"><span><i/> Trong khuôn viên lúc này</span><strong>{data.activeNow}</strong><small>Lượt ứng dụng có GPS trong {data.freshnessSeconds/60} phút gần nhất</small></div>
        <div><span>Cao điểm đồng thời trong kỳ</span><strong>{data.hasCoverage?data.peak:'—'}</strong><small>{data.hasCoverage?stamp(data.peakAt):'Chưa có dữ liệu cho kỳ này'}</small></div>
        <div><span>Lượt ứng dụng trong kỳ</span><strong>{data.hasCoverage?data.visitors:'—'}</strong><small>{data.hasCoverage?`${data.entries} lần vào vùng theo dõi`:'Chưa có dữ liệu cho kỳ này'}</small></div>
      </div>
      <p className="ops-meta">Ước tính từ thiết bị đồng ý gửi GPS trong ranh giới vườn; không phải tổng vé vào cổng hay toàn bộ khách. Mỗi trình duyệt được nhận diện tối đa 30 ngày. Cập nhật {stamp(data.generatedAt)}.</p>
      <div className="ops-panel"><div className="ops-panel-inner"><div className="ops-section-title"><h3>Cao điểm theo {period==='day'?'giờ':period==='year'?'tháng':'ngày'}</h3><span>Giờ Việt Nam · Tuần bắt đầu thứ Hai</span></div>
        <div className="analytics-chart" role="group" aria-label="Biểu đồ cao điểm khách đồng thời">{data.buckets.map((b,i)=><button key={b.from} aria-pressed={selected===i} aria-label={`${b.label}: ${b.peak===null?'chưa có dữ liệu':b.peak+' lượt đồng thời'}`} title={`${b.label}: ${b.peak??'chưa có dữ liệu'}`} onClick={()=>setSelected(i)}><span className={b.peak===null?'unobserved':''} style={{height:`${b.peak===null?3:Math.max(1,b.peak/maxPeak*100)}%`}}/><small>{data.buckets.length<=12||i%3===0?b.label:''}</small></button>)}</div>
        <p className="analytics-chart-detail" aria-live="polite">{focused?`${focused.label}: ${focused.peak===null?'chưa có dữ liệu':`cao điểm ${focused.peak} lượt ứng dụng đồng thời`}.`:'Chọn một cột để xem mức cao điểm trong khoảng đó.'}</p>
        <p className="ops-meta">Ghi nhận từ {stamp(data.trackingStartedAt)}. {data.partialCoverage?'Kỳ này chỉ có một phần dữ liệu. ':''}Khoảng tương lai hoặc trước khi bật thống kê hiển thị “chưa có dữ liệu”. Cao điểm là số lượt hiện diện cùng lúc, không cộng các cột với nhau.</p>
      </div></div>
      <div className="ops-panel analytics-ranking"><div className="ops-panel-inner"><div className="ops-section-title"><div><h3>Điểm được ghé thăm</h3><p>Ghi nhận khi GPS ở gần cùng một điểm ít nhất {data.dwellSeconds} giây. Mỗi lượt ứng dụng chỉ tính một lần cho mỗi điểm trong kỳ.</p></div><Link to="/internal/pois">Quản lý điểm <Icon name="arrow"/></Link></div>
        <div className="ops-transaction-tools"><div className="ops-filters" role="group" aria-label="Xếp hạng điểm tham quan"><button aria-pressed={sort==='most'} onClick={()=>setSort('most')}>Nhiều lượt nhất</button><button aria-pressed={sort==='least'} onClick={()=>setSort('least')}>Ít lượt nhất</button></div><label className="analytics-search">Tìm điểm<input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Tên điểm tham quan"/></label></div>
        {!data.hasCoverage?<p className="ops-empty">Chưa có dữ liệu cho kỳ này. Không thể kết luận điểm nào ít được ghé.</p>:<div className="ops-table-scroll"><table className="ops-table"><caption className="sr-only">Xếp hạng điểm tham quan theo lượt ứng dụng có GPS</caption><thead><tr><th>Điểm tham quan</th><th>Lượt ứng dụng</th><th>Số lần ghé</th><th><span className="sr-only">Thao tác</span></th></tr></thead><tbody>{rows.map(p=><tr key={p.poiId}><td><strong>{p.name}</strong>{p.status!=='ACTIVE'&&<small>Hiện đang ngừng hoạt động</small>}<span className="analytics-rank-track"><span style={{width:`${p.visitors/maxVisitors*100}%`}}/></span></td><td className="ops-money">{p.visitors}</td><td>{p.visits}</td><td><Link className="ops-row-action" to={`/internal/pois/${p.poiId}`}>Xem điểm <Icon name="arrow"/></Link></td></tr>)}</tbody></table>{!rows.length&&<p className="ops-empty">Không có điểm khớp tìm kiếm.</p>}</div>}
        <p className="ops-meta">0 nghĩa là chưa ghi nhận lượt GPS hợp lệ trong kỳ, không khẳng định không có khách ghé. Các điểm đang mở vẫn được liệt kê khi chưa có lượt. Chỉ ghi nhận điểm gần nhất khi nhiều vùng kích hoạt chồng nhau.</p>
      </div></div>
    </>}
  </section>;
};
