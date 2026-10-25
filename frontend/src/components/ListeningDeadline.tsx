import { Icon } from './Icon';

export function ListeningDeadline({ expiresAt }: { expiresAt: string | null | undefined }) {
  const deadline = Date.parse(expiresAt || '');
  if (!Number.isFinite(deadline) || deadline <= Date.now()) return null;
  const date = new Date(deadline);
  const time = date.toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', hour12: false });
  const parts = new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit' }).formatToParts(date);
  const day = `${parts.find(part => part.type === 'day')!.value}/${parts.find(part => part.type === 'month')!.value}`;
  return <span className="garden-listening-deadline" aria-label="Thời hạn quyền nghe" title="Giờ Việt Nam">
    <Icon name="clock" /><span>Nghe đến <time dateTime={expiresAt!}>{time} · {day}</time></span>
  </span>;
}
