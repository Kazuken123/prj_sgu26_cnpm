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
  return <section className="visitor-analytics adm-card" aria-label="Phân tích khách tham quan">
    <div className="adm-card__head">
      <div><h2 className="adm-card__title">Khách tham quan & mức độ quan tâm</h2><p className="adm-card__desc">Hiện diện trong vườn, thời điểm đông nhất và điểm khách thường ghé.</p></div>
      <div className="adm-card__actions">
        <div className="adm-segmented" role="group" aria-label="Khoảng thống kê">{Object.entries(periods).map(([value,label])=><button type="button" key={value} aria-pressed={period===value} onClick={()=>setPeriod(value as AnalyticsPeriod)}>{label}</button>)}</div>
        <label className="sr-only" htmlFor="analytics-day">Ngày trong kỳ</label>
        <input id="analytics-day" type="date" value={date} max={businessDate()} onChange={e=>{if(e.target.value)setDate(e.target.value);}} style={{width:'auto'}}/>
        <button type="button" className="adm-btn adm-btn--ghost adm-btn--sm" onClick={()=>setDate(businessDate())}>Hiện tại</button>
        <button type="button" className="adm-btn adm-btn--secondary adm-btn--sm" onClick={()=>setReload(n=>n+1)} disabled={loading}><Icon name="refresh"/>Làm mới thống kê</button>
        <button type="button" className="adm-btn adm-btn--secondary adm-btn--sm" onClick={exportCsv} disabled={!data||!!error||loading}>Xuất thống kê CSV</button>
      </div>
    </div>
    {error&&<div role="alert" className="adm-alert adm-alert--danger"><Icon name="info" className="adm-alert__icon"/><div className="adm-alert__body">{error} {data?'Số liệu bên dưới chưa được cập nhật.':'Số liệu không khả dụng.'}</div></div>}
    {!data&&!error&&<div role="status" className="adm-loading"><span className="adm-spinner" aria-hidden="true"/>Đang tải hoạt động tham quan…</div>}
    {data&&<div className="adm-stack" style={{gap:20}}>
      <div className="analytics-scoreboard">
        <div className="analytics-live"><span><i/> Trong khuôn viên lúc này</span><strong>{data.activeNow}</strong><small>Lượt ứng dụng có GPS trong {data.freshnessSeconds/60} phút gần nhất</small></div>
        <div><span>Cao điểm đồng thời trong kỳ</span><strong>{data.hasCoverage?data.peak:'—'}</strong><small>{data.hasCoverage?stamp(data.peakAt):'Chưa có dữ liệu cho kỳ này'}</small></div>
        <div><span>Lượt ứng dụng trong kỳ</span><strong>{data.hasCoverage?data.visitors:'—'}</strong><small>{data.hasCoverage?`${data.entries} lần vào vùng theo dõi`:'Chưa có dữ liệu cho kỳ này'}</small></div>
      </div>
      <p className="adm-small adm-muted" style={{margin:0}}>Ước tính từ thiết bị đồng ý gửi GPS trong ranh giới vườn; không phải tổng vé vào cổng hay toàn bộ khách. Mỗi trình duyệt được nhận diện tối đa 30 ngày. Cập nhật {stamp(data.generatedAt)}.</p>
      <div className="adm-grid adm-grid--2" style={{alignItems:'start'}}>
        <div>
          <div className="adm-row adm-row--between"><h3 className="adm-card__title" style={{fontSize:14}}>Cao điểm theo {period==='day'?'giờ':period==='year'?'tháng':'ngày'}</h3><span className="adm-small adm-muted">Giờ Việt Nam · Tuần bắt đầu thứ Hai</span></div>
          <div className="analytics-chart" role="group" aria-label="Biểu đồ cao điểm khách đồng thời">{data.buckets.map((b,i)=><button type="button" key={b.from} aria-pressed={selected===i} aria-label={`${b.label}: ${b.peak===null?'chưa có dữ liệu':b.peak+' lượt đồng thời'}`} title={`${b.label}: ${b.peak??'chưa có dữ liệu'}`} onClick={()=>setSelected(i)}><span className={b.peak===null?'unobserved':''} style={{height:`${b.peak===null?3:Math.max(1,b.peak/maxPeak*100)}%`}}/><small>{data.buckets.length<=12||i%3===0?b.label:''}</small></button>)}</div>
          <p className="analytics-chart-detail" aria-live="polite">{focused?`${focused.label}: ${focused.peak===null?'chưa có dữ liệu':`cao điểm ${focused.peak} lượt ứng dụng đồng thời`}.`:'Chọn một cột để xem mức cao điểm trong khoảng đó.'}</p>
          <p className="adm-small adm-muted">Ghi nhận từ {stamp(data.trackingStartedAt)}. {data.partialCoverage?'Kỳ này chỉ có một phần dữ liệu. ':''}Khoảng tương lai hoặc trước khi bật thống kê hiển thị “chưa có dữ liệu”. Cao điểm là số lượt hiện diện cùng lúc, không cộng các cột với nhau.</p>
        </div>
        <div className="analytics-ranking" style={{marginTop:0}}>
          <div className="adm-row adm-row--between"><h3 className="adm-card__title" style={{fontSize:14}}>Điểm được ghé thăm</h3><Link className="adm-link" to="/internal/pois">Quản lý điểm <Icon name="arrow"/></Link></div>
          <p className="adm-small adm-muted">Ghi nhận khi GPS ở gần cùng một điểm ít nhất {data.dwellSeconds} giây. Mỗi lượt ứng dụng chỉ tính một lần cho mỗi điểm trong kỳ.</p>
          <div className="adm-row adm-row--between" style={{margin:'8px 0 12px'}}>
            <div className="adm-segmented" role="group" aria-label="Xếp hạng điểm tham quan"><button type="button" aria-pressed={sort==='most'} onClick={()=>setSort('most')}>Nhiều lượt nhất</button><button type="button" aria-pressed={sort==='least'} onClick={()=>setSort('least')}>Ít lượt nhất</button></div>
            <label className="analytics-search"><span className="sr-only">Tìm điểm</span><span className="adm-search" style={{minWidth:200}}><Icon name="search"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Tìm tên điểm tham quan"/></span></label>
          </div>
          {!data.hasCoverage?<div className="adm-empty"><strong>Chưa có dữ liệu cho kỳ này.</strong><p>Không thể kết luận điểm nào ít được ghé.</p></div>:<div className="adm-table-wrap" style={{maxHeight:360,border:'1px solid var(--adm-border)',borderRadius:'var(--adm-r-md)'}}><table className="adm-table"><caption className="sr-only">Xếp hạng điểm tham quan theo lượt ứng dụng có GPS</caption><thead><tr><th>Điểm tham quan</th><th className="adm-num">Lượt ứng dụng</th><th className="adm-num">Số lần ghé</th><th><span className="sr-only">Thao tác</span></th></tr></thead><tbody>{rows.map(p=><tr key={p.poiId}><td><span className="adm-cell-title">{p.name}</span>{p.status!=='ACTIVE'&&<small>Hiện đang ngừng hoạt động</small>}<span className="analytics-rank-track"><span style={{width:`${p.visitors/maxVisitors*100}%`}}/></span></td><td className="adm-num ops-money">{p.visitors}</td><td className="adm-num">{p.visits}</td><td className="adm-actions-cell"><Link className="adm-btn adm-btn--ghost adm-btn--sm" to={`/internal/pois/${p.poiId}`}>Xem điểm <Icon name="arrow"/></Link></td></tr>)}</tbody></table>{!rows.length&&<div className="adm-empty"><strong>Không có điểm khớp tìm kiếm.</strong></div>}</div>}
          <p className="adm-small adm-muted">0 nghĩa là chưa ghi nhận lượt GPS hợp lệ trong kỳ, không khẳng định không có khách ghé. Các điểm đang mở vẫn được liệt kê khi chưa có lượt. Chỉ ghi nhận điểm gần nhất khi nhiều vùng kích hoạt chồng nhau.</p>
        </div>
      </div>
    </div>}
  </section>;
};
