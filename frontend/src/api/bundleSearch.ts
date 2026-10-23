import type { PoiDto } from './content.ts';

// Return only literal bundle text. This is a local keyword lookup, not RAG.
export function searchBundleText(question: string, pois: PoiDto[]): string {
  const query = question.trim().toLocaleLowerCase('vi');
  const matches = query ? pois.filter(poi =>
    poi.text.status === 'READY' && poi.text.description &&
    [poi.text.name, poi.originalName].some(name => name && name.toLocaleLowerCase('vi').includes(query))
  ) : [];
  if (!matches.length) {
    return 'Không tìm thấy nội dung theo tên điểm tham quan. Chưa tích hợp chatbot RAG; không có thông tin đã xác minh để trả lời về giờ mở cửa, giá vé hoặc cho thú ăn. Vui lòng kiểm tra với nhân viên phụ trách.';
  }
  return 'Nội dung trong gói đang tải (chưa xác minh thông tin thực địa hiện hành):\n' +
    matches.map(poi => (poi.text.name || poi.originalName) + ': ' + poi.text.description).join('\n\n');
}
