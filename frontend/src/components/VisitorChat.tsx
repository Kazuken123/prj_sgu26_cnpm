import { useVisitorLanguage } from '../i18n/VisitorLanguage';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError } from '../api/client';
import { askChat, ChatAnswer, safeSourceUrl } from '../api/rag';

export function VisitorChat({ token, baseUrl, open, onSessionExpired }: {
  token: string | null; baseUrl: string; open: boolean; onSessionExpired: () => void;
}) {
  const { t, message } = useVisitorLanguage();
  const [question, setQuestion] = useState('');
  const [turns, setTurns] = useState<Array<{ question: string; result: ChatAnswer }>>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const request = useRef<AbortController | null>(null);
  const generation = useRef(0);
  const inFlight = useRef(false);
  const mounted = useRef(true);
  const transcript = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (open && transcript.current) transcript.current.scrollTop = transcript.current.scrollHeight;
  }, [open, turns, busy]);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; generation.current++; request.current?.abort(); }; }, []);
  useEffect(() => {
    generation.current++; request.current?.abort(); inFlight.current = false;
    setTurns([]); setQuestion(''); setBusy(false); setError('');
  }, [token, baseUrl]);
  useEffect(() => {
    if (!open) { generation.current++; request.current?.abort(); inFlight.current = false; setBusy(false); }
  }, [open]);
  const send = async (event: FormEvent) => {
    event.preventDefault();
    const value = question.trim();
    if (!token || !open || inFlight.current || !value || value.length > 1000) return;
    const sequence = ++generation.current;
    const controller = new AbortController(); request.current = controller;
    inFlight.current = true; setBusy(true); setError('');
    try {
      const result = await askChat(value, token, baseUrl, controller.signal);
      if (!mounted.current || sequence !== generation.current || controller.signal.aborted) return;
      setTurns(previous => [...previous, { question: value, result }]); setQuestion('');
    } catch (e) {
      if (!mounted.current || sequence !== generation.current || controller.signal.aborted) return;
      if (e instanceof ApiError && e.status === 401) { onSessionExpired(); return; }
      setError(e instanceof ApiError && e.status === 429 ? 'Bạn hỏi hơi nhanh. Chờ một lúc rồi gửi lại nhé.' :
        'Hỏi đáp tạm thời gián đoạn. Câu hỏi vẫn được giữ để bạn thử lại; bản đồ và thuyết minh vẫn sử dụng được.');
    } finally {
      if (mounted.current && sequence === generation.current) { inFlight.current = false; setBusy(false); }
    }
  };
  if (!open) return null;
  if (!token) return <div className="garden-chat garden-chat-gate"><span className="garden-chat-welcome-icon" aria-hidden="true">✦</span><h3>{t("Mình có thể giúp gì cho bạn?")}</h3><p>{t("Kích hoạt vé để hỏi thêm về động vật, cây xanh và các điểm tham quan.")}</p><Link className="btn-primary" to="/payment">{t("Mở vé thuyết minh")}</Link></div>;
  return <div className="garden-chat">
    <div ref={transcript} className="garden-chat-turns" role="log" aria-live="polite" aria-label={t("Cuộc trò chuyện")}>
      <div className="garden-chat-welcome"><span aria-hidden="true">✦</span><p>{t("Chào bạn! Bạn muốn biết thêm về con vật, cây xanh hay điểm tham quan nào?")}</p></div>
      {turns.some(turn => turn.result.mode === 'MOCK') && <p className="garden-chat-mode" role="status">{t("Đang mô phỏng hỏi đáp để kiểm tra luồng, chưa phải câu trả lời từ AI thật.")}</p>}
      {turns.map((turn, index) => <article className="garden-chat-turn" key={index}>
        <p className="garden-chat-question"><strong>{t("Bạn")}</strong><span>{turn.question}</span></p>
        <div className="garden-chat-answer"><strong>{turn.result.mode === 'MOCK' ? t("Phản hồi mô phỏng") : t("Hỏi đáp khu vườn")}</strong><p>{turn.result.answer}</p>
          {!!turn.result.sources.length && <details><summary>{t("Nguồn tham khảo")}</summary><ul>{[...new Map(turn.result.sources.map(s => [`${s.documentId}:${s.sourceVersion}`, s])).values()].map(source => {
            const url = safeSourceUrl(source.source);
            return <li key={`${source.documentId}:${source.sourceVersion}`}><strong>{source.title}</strong>{source.source && (url ? <a href={url} target="_blank" rel="noreferrer">{source.source}</a> : <span>{source.source}</span>)}</li>;
          })}</ul></details>}
        </div>
      </article>)}
      {busy && <p className="garden-chat-thinking" role="status">{t("Đang tìm thông tin…")}</p>}
    </div>
    <form onSubmit={send} className="garden-chat-form">
      {error && <p className="garden-chat-error" role="alert">{message(error)}</p>}
      <label className="garden-field"><span className="garden-chat-input-label">{t("Câu hỏi của bạn")}</span><textarea aria-label={t("Câu hỏi của bạn")} maxLength={1000} rows={2} value={question} disabled={busy} onChange={e => setQuestion(e.target.value)} placeholder={t("Nhập điều bạn muốn hỏi…")} /></label>
      <div className="garden-chat-send"><small>{question.length}/1000</small><button type="submit" className="btn-primary" disabled={busy || !question.trim()}>{busy ? t("Đang tìm thông tin…") : t("Gửi câu hỏi")}</button></div>
    </form>
  </div>;
}
