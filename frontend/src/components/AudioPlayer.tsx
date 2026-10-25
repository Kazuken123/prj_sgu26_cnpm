import { useVisitorLanguage } from '../i18n/VisitorLanguage';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PoiDto } from '../api/content.ts';
import { fetchAudioBlob } from '../api/media.ts';
import { ApiError } from '../api/client.ts';
import { Icon } from './Icon';

export type PlayerState =
  | 'IDLE'
  | 'LOADING'
  | 'READY'
  | 'PLAYING'
  | 'PAUSED'
  | 'ENDED'
  | 'NEED_GESTURE'
  | 'ERROR';

export interface AudioPlayerProps {
  poi: PoiDto;
  requestedLanguageCode: string;
  token: string;
  onSessionExpired: () => void;
  autoPlayRequestId?: number | null;
  onPlaybackStarted?: (poiId: number) => void;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  poi,
  requestedLanguageCode,
  token,
  onSessionExpired,
  autoPlayRequestId = null,
  onPlaybackStarted
}) => {
  const { t, language: locale, message } = useVisitorLanguage();
  const [playerState, setPlayerState] = useState<PlayerState>('IDLE');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(poi.audio.duration || 1);

  const startedCallbackRef = useRef(onPlaybackStarted);
  startedCallbackRef.current = onPlaybackStarted;
  const currentPoiIdRef = useRef(poi.poiId);
  currentPoiIdRef.current = poi.poiId;
  const handledAutoRequest = useRef<number | null>(null);

  // Quan ly audio element va Blob URL
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const activeBlobUrlRef = useRef<string | null>(null);
  const activeSourceUrlRef = useRef<string | null>(null);

  // Chong race condition bang sequence number va AbortController
  const mediaSeqRef = useRef<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Khoi tao va don dep audio element
  useEffect(() => {
    const audio = new Audio();
    audioElementRef.current = audio;

    const handlePlaying = () => {
      if (!activeBlobUrlRef.current || audio.src !== activeBlobUrlRef.current) return;
      setPlayerState('PLAYING');
      startedCallbackRef.current?.(currentPoiIdRef.current);
    };

    const handlePause = () => {
      // Chi chuyen sang PAUSED neu khong phai trang thai ENDED hoac IDLE
      setPlayerState((prev) => (prev === 'PLAYING' ? 'PAUSED' : prev));
    };

    const handleEnded = () => {
      setPlayerState('ENDED');
      setCurrentTime(audio.duration || 0);
    };

    const handleTimeUpdate = () => {
      if (Number.isFinite(audio.currentTime)) {
        setCurrentTime(audio.currentTime);
      }
    };

    const handleLoadedMetadata = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
      }
    };

    const handleError = () => {
      // Chi ghi nhan loi neu audio dang co nguon hop le
      if (audio.src && audio.src.startsWith('blob:')) {
        setPlayerState('ERROR');
        setErrorMessage('Không thể giải mã hoặc phát tệp âm thanh này.');
      }
    };

    audio.addEventListener('playing', handlePlaying);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('error', handleError);

    return () => {
      mediaSeqRef.current += 1;
      handledAutoRequest.current = null;
      // Don dep khi component bi thao
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      audio.removeEventListener('playing', handlePlaying);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('error', handleError);

      audio.pause();
      audio.src = '';

      if (activeBlobUrlRef.current) {
        URL.revokeObjectURL(activeBlobUrlRef.current);
        activeBlobUrlRef.current = null;
      }
      activeSourceUrlRef.current = null;
    };
  }, []);

  // Khi doi POI hoac doi ngon ngu hoac audio.url thay doi:
  // Dung ngay am cu, huy request cu, reset state, khong tu phat am moi
  useEffect(() => {
    // Tang sequence de vo hieu moi callback dang cho
    mediaSeqRef.current += 1;

    // Huy request cu
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // Dung audio hien tai
    const audio = audioElementRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      audio.src = '';
    }

    // Giai phong Blob URL cu
    if (activeBlobUrlRef.current) {
      URL.revokeObjectURL(activeBlobUrlRef.current);
      activeBlobUrlRef.current = null;
    }
    activeSourceUrlRef.current = null;

    // Reset thong so
    setPlayerState('IDLE');
    setErrorMessage(null);
    setCurrentTime(0);
    setDuration(poi.audio.duration || 1);
  }, [poi.poiId, poi.audio.url, requestedLanguageCode, poi.audio.duration]);

  // Ham phat audio
  const handlePlayAudio = useCallback(async () => {
    if (poi.audio.status !== 'AVAILABLE' || !poi.audio.url) {
      return;
    }

    if (playerState === 'LOADING') return;

    // Neu dang o trang thai PLAYING thi tam dung
    if (playerState === 'PLAYING') {
      audioElementRef.current?.pause();
      return;
    }

    // Neu da co Blob URL cua dung tệp nay va dang tam dung hoac ket thuc: phat lai truc tiep
    if (
      audioElementRef.current &&
      activeBlobUrlRef.current &&
      activeSourceUrlRef.current === poi.audio.url &&
      (playerState === 'PAUSED' || playerState === 'READY' || playerState === 'ENDED' || playerState === 'NEED_GESTURE')
    ) {
      if (playerState === 'ENDED') {
        audioElementRef.current.currentTime = 0;
      }
      const currentSeq = mediaSeqRef.current;
      try {
        await audioElementRef.current.play();
      } catch (err: unknown) {
        if (currentSeq !== mediaSeqRef.current) return;
        if (err instanceof Error && err.name === 'NotAllowedError') {
          setPlayerState('NEED_GESTURE');
        } else {
          setPlayerState('ERROR');
          setErrorMessage('Trình duyệt chặn phát âm thanh tự động. Vui lòng bấm lại nút phát.');
        }
      }
      return;
    }

    // Chua co Blob URL: Bat dau tai tu backend
    setPlayerState('LOADING');
    setErrorMessage(null);

    // Quan ly thu tu request
    mediaSeqRef.current += 1;
    const currentSeq = mediaSeqRef.current;

    // Huy request dang chay
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const blob = await fetchAudioBlob({
        audioUrl: poi.audio.url,
        token,
        signal: controller.signal
      });

      // Kiem tra neu khong phai request moi nhat thi bo qua
      if (currentSeq !== mediaSeqRef.current) {
        return;
      }

      // Giai phong Blob URL cu neu co
      if (activeBlobUrlRef.current) {
        URL.revokeObjectURL(activeBlobUrlRef.current);
      }

      const newBlobUrl = URL.createObjectURL(blob);
      activeBlobUrlRef.current = newBlobUrl;
      activeSourceUrlRef.current = poi.audio.url;

      const audio = audioElementRef.current;
      if (!audio) return;

      audio.src = newBlobUrl;
      audio.load();

      // Goi play va bat loi quyen phat
      try {
        await audio.play();
      } catch (playErr: unknown) {
        if (currentSeq !== mediaSeqRef.current) return;
        if (playErr instanceof Error && playErr.name === 'NotAllowedError') {
          setPlayerState('NEED_GESTURE');
        } else {
          setPlayerState('ERROR');
          setErrorMessage('Trình duyệt cần thao tác người dùng trực tiếp để phát âm thanh.');
        }
      }
    } catch (err: unknown) {
      // Bo qua neu loi do chu dong huy request
      if (err instanceof ApiError && err.code === 'ABORT_ERROR') {
        return;
      }

      if (currentSeq !== mediaSeqRef.current) {
        return;
      }

      if (err instanceof ApiError) {
        if (err.status === 401) {
          setPlayerState('ERROR');
          setErrorMessage('Phiên khách tham quan đã hết hạn hoặc không hợp lệ (mã 401).');
          onSessionExpired();
          return;
        }

        if (err.status === 404) {
          setPlayerState('ERROR');
          setErrorMessage('Tệp âm thanh không còn được công bố trên máy chủ (mã 404).');
          return;
        }

        setPlayerState('ERROR');
        setErrorMessage(err.message);
      } else {
        setPlayerState('ERROR');
        setErrorMessage('Không thể tải tệp âm thanh. Vui lòng kiểm tra kết nối mạng.');
      }
    }
  }, [poi.audio.status, poi.audio.url, playerState, token, onSessionExpired]);

  // Consume each explicit request once; blocked playback waits for a manual gesture.
  useEffect(() => {
    if (autoPlayRequestId === null) {
      if (handledAutoRequest.current !== null) {
        mediaSeqRef.current += 1;
        abortControllerRef.current?.abort();
        audioElementRef.current?.pause();
        setPlayerState(prev => prev === 'LOADING' ? 'IDLE' : prev);
      }
      handledAutoRequest.current = null;
      return;
    }
    if (handledAutoRequest.current === autoPlayRequestId) return;
    handledAutoRequest.current = autoPlayRequestId;
    if (playerState !== 'PLAYING' && playerState !== 'LOADING') void handlePlayAudio();
  }, [autoPlayRequestId, handlePlayAudio, playerState]);

  // Ham phat lai tu dau
  const handleReplay = () => {
    const audio = audioElementRef.current;
    if (audio && activeBlobUrlRef.current) {
      audio.currentTime = 0;
      audio.play().catch(() => {
        setPlayerState('NEED_GESTURE');
      });
    } else {
      handlePlayAudio();
    }
  };

  if (poi.audio.status !== 'AVAILABLE' || !poi.audio.url) {
    return <div className="garden-audio-unavailable" role="status">{t("Âm thanh chưa sẵn sàng. Bạn vẫn có thể đọc giới thiệu.")}</div>;
  }
  const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
  const languageName = (code: string | null) => {
    try { return code ? new Intl.DisplayNames([locale], { type: 'language' }).of(code) || code : t("Chưa có"); } catch { return code || t("Chưa có"); }
  };
  const labels: Record<PlayerState, string> = { IDLE: t("Nghe thuyết minh"), LOADING: t("Đang tải âm thanh…"), READY: t("Bấm để nghe"), PLAYING: t("Tạm dừng"), PAUSED: t("Tiếp tục nghe"), ENDED: t("Nghe lại"), NEED_GESTURE: t("Bấm để phát"), ERROR: t("Thử lại") };
  return <div className="garden-player">
    <div className="garden-player-actions">
      <button type="button" onClick={handlePlayAudio} disabled={playerState === 'LOADING'} className="btn-primary garden-play-button"><Icon name={playerState === 'PLAYING' ? 'pause' : playerState === 'ERROR' ? 'repeat' : 'play'} />{labels[playerState]}</button>
      {(playerState === 'PLAYING' || playerState === 'PAUSED' || playerState === 'ENDED') && <button type="button" className="garden-icon-button" onClick={handleReplay} aria-label={t("Phát lại từ đầu")}><Icon name="repeat" /></button>}
    </div>
    <div className="garden-player-timeline"><time>{clock(currentTime)}</time><input aria-label={t("Tiến trình nghe")} type="range" min={0} max={duration} step={0.1} value={Math.min(currentTime, duration)} disabled={!activeBlobUrlRef.current || playerState === 'LOADING'} onChange={e => { const time = Number(e.target.value); if (audioElementRef.current && activeBlobUrlRef.current) { audioElementRef.current.currentTime = time; setCurrentTime(time); } }} /><time>{clock(duration)}</time></div>
    <div className="garden-player-feedback" aria-live="polite">
      {playerState === 'LOADING' && <span>{t("Đang chuẩn bị câu chuyện của bạn.")}</span>}
      {playerState === 'NEED_GESTURE' && <span>{t("Chạm nút phát để cho phép trình duyệt phát âm thanh.")}</span>}
      {playerState === 'ERROR' && <span role="alert">{t("Chưa phát được âm thanh. Hãy thử lại. ")}<details><summary>{t("Thông tin hỗ trợ")}</summary>{message(errorMessage)}</details></span>}
      {poi.audio.isFallback && <span>{t("Âm thanh dùng {0}, thay cho {1}.", { 0: languageName(poi.audio.languageCode), 1: languageName(requestedLanguageCode) })}</span>}
    </div>
  </div>;
};
