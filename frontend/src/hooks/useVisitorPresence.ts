import { useEffect, useRef, useState } from 'react';
import { ApiError } from '../api/client';
import { AnalyticsPosition, analyticsKey, getAnalyticsToken, sendPresence } from '../api/visitorAnalytics';
export function useVisitorPresence(baseUrl: string, position: AnalyticsPosition | null) {
  const consentKey='tcv_analytics_consent:'+baseUrl;
  const [enabled,setEnabled]=useState(()=>{try{return window.localStorage.getItem(consentKey)==='yes';}catch{return false;}});
  const [status,setStatus]=useState('');
  const latest=useRef(position); latest.current=position;
  const previous=useRef(false);
  useEffect(()=>{
    const sync=()=>{try{setEnabled(window.localStorage.getItem(consentKey)==='yes');}catch{setEnabled(false);}};
    window.addEventListener('storage',sync);return()=>window.removeEventListener('storage',sync);
  },[consentKey]);
  useEffect(()=>{
    let disposed=false,busy=false;
    if(!enabled){
      if(previous.current){try{const token=window.localStorage.getItem(analyticsKey(baseUrl));if(token)void sendPresence(token,null,baseUrl).catch(()=>{});}catch{/* Stale presence expires on the server. */}}
      previous.current=false;setStatus('');return;
    }
    previous.current=true;
    const tick=async()=>{
      if(disposed || busy || document.visibilityState==='hidden')return;
      const current=latest.current;
      if(!current || !Number.isFinite(current.accuracy) || current.accuracy>40 || !Number.isFinite(current.observedAt) || Date.now()-current.observedAt>45000){setStatus('Đợi vị trí GPS mới và chính xác (sai số tối đa 40 m).');return;}
      busy=true;
      try{const token=await getAnalyticsToken(baseUrl);if(disposed)return;await sendPresence(token,current,baseUrl);if(!disposed)setStatus('Đang đóng góp thống kê lượt tham quan.');}
      catch(error){if(error instanceof ApiError && error.status===401){try{window.localStorage.removeItem(analyticsKey(baseUrl));}catch{/* Retry once storage is available. */}}if(!disposed)setStatus('Thống kê tạm gián đoạn; bản đồ vẫn sử dụng bình thường.');}
      finally{busy=false;}
    };
    void tick(); const timer=window.setInterval(()=>void tick(),30000);
    const visible=()=>void tick();document.addEventListener('visibilitychange',visible);
    return()=>{disposed=true;window.clearInterval(timer);document.removeEventListener('visibilitychange',visible);};
  },[enabled,baseUrl]);
  const toggle=(value:boolean)=>{try{window.localStorage.setItem(consentKey,value?'yes':'no');setEnabled(value);}catch{setStatus('Không lưu được lựa chọn. Chưa gửi dữ liệu thống kê.');}};
  return {enabled,toggle,status};
}
