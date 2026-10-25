import { VisitorText } from '../i18n/VisitorLanguage';
import { useVisitorLanguage } from '../i18n/VisitorLanguage';
import { useEffect, useState } from 'react';
import { getVisitSummary, VisitSummary as Summary } from '../api/visitSummary';
import { Icon } from './Icon';

export function VisitSummary({ baseUrl }: { baseUrl: string }) {
  const { t, language: locale } = useVisitorLanguage();
  const [reload, setReload] = useState(0);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setSummary(null);
    void getVisitSummary(baseUrl, controller.signal).then(data => {
      if (!controller.signal.aborted) setSummary(data);
    }).catch(() => { /* Failure stays unavailable, never an invented zero. */ }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [baseUrl, reload]);
  return <div className="garden-visit-summary">
    <Icon name="ticket" />
    <p aria-live="polite" title={summary ? t("Cập nhật lúc {0}", { 0: new Date(summary.generatedAt).toLocaleString(locale) }) : undefined}>
      {loading ? t("Đang cập nhật số vé…") : summary ? <VisitorText source="Cùng khám phá với {0} khách có vé còn hiệu lực" values={{ 0: <strong>{summary.activePaidVisits.toLocaleString(locale)}</strong> }} /> : t("Chưa cập nhật được số vé.")}
    </p>
    <button type="button" className="garden-visit-refresh" aria-label={t("Cập nhật số vé")} title={t("Cập nhật số vé")} disabled={loading} onClick={() => setReload(n => n + 1)}><Icon name="repeat" /></button>
  </div>;
}
