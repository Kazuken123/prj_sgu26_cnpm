import { requestApi } from './client';

export type RagMode = 'MOCK' | 'AI';
export interface KnowledgeDocument {
  documentId: number; title: string; content?: string; source: string | null;
  status: 'ACTIVE' | 'INACTIVE'; contentVersion: number;
  processingStatus: 'READY' | 'PENDING' | 'FAILED' | 'DEACTIVATED';
  lastError: string | null; chunkCount: number; embeddingModel: string | null;
  createdAt: string; updatedAt: string;
}
export interface KnowledgeInput { title: string; content: string; source: string | null; expectedVersion?: number }
export interface KnowledgeResult {
  document: KnowledgeDocument;
  processing: { result: 'PUBLISHED' | 'FAILED' | 'SUPERSEDED'; code?: string; chunkCount?: number; mode: RagMode };
}
export interface KnowledgeList { items: KnowledgeDocument[]; total: number; page: number; limit: number }
const root = '/api/admin/knowledge-documents';
export async function listKnowledge(token: string, baseUrl: string, page: number, status: string, signal?: AbortSignal) {
  const params = new URLSearchParams({ page: String(page), limit: '20' });
  if (status) params.set('status', status);
  const r = await requestApi<{ data: KnowledgeList }>({ path: root + '?' + params, token, overrideBaseUrl: baseUrl, signal });
  if (!r.data.data || !Array.isArray(r.data.data.items)) throw new Error('Chưa đọc được danh sách tài liệu.');
  return r.data.data;
}
export async function getKnowledge(id: number, token: string, baseUrl: string, signal?: AbortSignal) {
  return (await requestApi<{ data: KnowledgeDocument }>({ path: `${root}/${id}`, token, overrideBaseUrl: baseUrl, signal })).data.data;
}
export async function saveKnowledge(id: number | null, input: KnowledgeInput, token: string, baseUrl: string) {
  return (await requestApi<{ data: KnowledgeResult }>({ path: id === null ? root : `${root}/${id}`, method: id === null ? 'POST' : 'PUT',
    body: input, token, overrideBaseUrl: baseUrl, timeoutMs: 65000 })).data.data;
}
export async function reprocessKnowledge(id: number, token: string, baseUrl: string) {
  return (await requestApi<{ data: KnowledgeResult }>({ path: `${root}/${id}/reprocess`, method: 'POST', body: {}, token, overrideBaseUrl: baseUrl, timeoutMs: 65000 })).data.data;
}
export async function deactivateKnowledge(id: number, token: string, baseUrl: string) {
  return (await requestApi<{ data: KnowledgeDocument }>({ path: `${root}/${id}/deactivate`, method: 'POST', body: {}, token, overrideBaseUrl: baseUrl })).data.data;
}
export interface ChatSource { documentId: number; chunkId: string; sourceVersion: number; title: string; source: string | null }
export interface ChatAnswer { status: 'SUCCESS' | 'NO_CONTEXT'; answer: string; sources: ChatSource[]; mode: RagMode }
export async function askChat(question: string, token: string, baseUrl: string, signal?: AbortSignal): Promise<ChatAnswer> {
  const r = await requestApi<{ data: ChatAnswer }>({ path: '/api/chat/questions', method: 'POST', body: { question }, token,
    overrideBaseUrl: baseUrl, signal, timeoutMs: 35000 });
  const d = r.data.data;
  if (!d || !['SUCCESS', 'NO_CONTEXT'].includes(d.status) || !['MOCK', 'AI'].includes(d.mode) || typeof d.answer !== 'string' ||
    !d.answer.trim() || d.answer.length > 4000 || !Array.isArray(d.sources) || d.sources.length > 20 ||
    !d.sources.every(s => Number.isSafeInteger(s.documentId) && s.documentId > 0 && typeof s.chunkId === 'string' && /^[1-9]\d*$/.test(s.chunkId) &&
      Number.isSafeInteger(s.sourceVersion) && s.sourceVersion > 0 && typeof s.title === 'string' && (s.source === null || typeof s.source === 'string')) ||
    (d.status === 'SUCCESS' && !d.sources.length) || (d.status === 'NO_CONTEXT' && d.sources.length)) throw new Error('Phản hồi hỏi đáp chưa hợp lệ. Vui lòng thử lại sau.');
  return d;
}
export function safeSourceUrl(source: string | null) {
  if (!source) return null;
  try { const url = new URL(source); return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : null; }
  catch { return null; }
}
