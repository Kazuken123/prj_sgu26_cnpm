import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PoiDto } from '../api/content.ts';
import { fetchAudioBlob } from '../api/media.ts';
import { ApiError } from '../api/client.ts';

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

  // Truong hop POI khong co audio san sang
  if (poi.audio.status !== 'AVAILABLE' || !poi.audio.url) {
    return (
      <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--tcv-slate-200)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--tcv-slate-900)' }}>
            Âm thanh thuyết minh
          </h4>
          <span className="status-pill idle" style={{ fontSize: '0.72rem', padding: '2px 8px' }}>
            Âm thanh chưa sẵn sàng
          </span>
        </div>
        <p style={{ fontSize: '0.84rem', color: 'var(--tcv-slate-500)', fontStyle: 'italic' }}>
          Hiện chưa có tệp âm thanh thuyết minh cho điểm tham quan này. Bạn vẫn có thể đọc thông tin trong phần Giới thiệu.
        </p>
      </div>
    );
  }

  const isAudioFallback = poi.audio.isFallback;
  const audioLangText = poi.audio.languageCode ? poi.audio.languageCode.toUpperCase() : 'VI';
  const progressPercent = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;

  return (
    <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--tcv-slate-200)' }}>
      {/* THONG TIN AM THANH */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
        <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--tcv-green-950)' }}>
          Trình phát âm thanh thuyết minh
        </h4>

        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <span className={`status-pill ${playerState === 'PLAYING' ? 'ready' : playerState === 'ERROR' ? 'error' : 'unready'}`} style={{ fontSize: '0.72rem', padding: '2px 8px' }}>
            Trạng thái: {playerState}
          </span>
        </div>
      </div>

      {/* CANH BAO TRUNG THUC AM THU MOCK */}
      <div style={{ background: 'var(--tcv-status-warn-bg)', border: '1px solid #fde68a', borderRadius: 'var(--radius-sm)', padding: '10px 14px', marginBottom: '14px', fontSize: '0.8rem', color: '#92400e' }}>
        <strong>Giọng đọc tổng hợp.</strong> Âm thanh sử dụng giọng tổng hợp; chất lượng bản dịch và phát âm chưa được nghiệm thu độc lập bởi người bản ngữ.
      </div>

      {/* THONG SO AUDIO VA FALLBACK */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', fontSize: '0.82rem', marginBottom: '12px', color: 'var(--tcv-slate-700)' }}>
        <div>
          <span>Ngôn ngữ audio thực tế: </span>
          <strong style={{ color: 'var(--tcv-green-800)' }}>{audioLangText}</strong>
          {isAudioFallback && (
            <span style={{ color: '#b45309', marginLeft: '6px', fontSize: '0.76rem' }}>
              (Đang dùng bản thay thế, khác với ngôn ngữ yêu cầu {requestedLanguageCode.toUpperCase()})
            </span>
          )}
        </div>

        <div>
          <span>Thời lượng: </span>
          <strong style={{ fontFamily: 'var(--font-mono)' }}>
            {currentTime.toFixed(1)}s / {duration.toFixed(1)}s
          </strong>
        </div>
      </div>

      {/* THANH TIEN TRINH */}
      <div style={{ width: '100%', height: '6px', background: 'var(--tcv-slate-200)', borderRadius: '3px', overflow: 'hidden', marginBottom: '14px' }}>
        <div
          style={{
            width: `${progressPercent}%`,
            height: '100%',
            background: 'var(--tcv-green-600)',
            transition: 'width 0.1s linear'
          }}
        />
      </div>

      {/* CAC NUT DIEU KHIEN */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
        {playerState === 'PLAYING' ? (
          <button
            type="button"
            onClick={handlePlayAudio}
            className="btn-primary"
            style={{ backgroundColor: 'var(--tcv-earth-amber)', borderColor: '#d97706' }}
          >
            ⏸ Tạm dừng
          </button>
        ) : (
          <button
            type="button"
            onClick={handlePlayAudio}
            disabled={playerState === 'LOADING'}
            className="btn-primary"
          >
            {playerState === 'LOADING'
              ? 'Đang tải tệp âm thanh...'
              : playerState === 'PAUSED'
              ? '▶ Tiếp tục phát'
              : playerState === 'NEED_GESTURE'
              ? '▶ Bấm để phát'
              : '▶ Nghe thuyết minh'}
          </button>
        )}

        {(playerState === 'PLAYING' || playerState === 'PAUSED' || playerState === 'ENDED') && (
          <button
            type="button"
            onClick={handleReplay}
            className="btn-secondary"
          >
            ↺ Phát lại từ đầu
          </button>
        )}

        {playerState === 'ERROR' && (
          <button
            type="button"
            onClick={handlePlayAudio}
            className="btn-primary btn-sm"
          >
            Thử lại
          </button>
        )}
      </div>

      {/* THONG BAO LOI NGUYEN PHAT */}
      {errorMessage && (
        <div style={{ marginTop: '12px', fontSize: '0.82rem', color: '#b91c1c' }}>
          * Lỗi: {errorMessage}
        </div>
      )}
    </div>
  );
};
