import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import Hls from 'hls.js';
import {
  ArrowLeft,
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Volume1,
  Maximize,
  Minimize,
  AlertTriangle,
  RefreshCw,
  Copy,
  Check,
  Tv,
  Sparkles,
  Sliders,
  SkipForward,
  SkipBack,
  Flame,
  ListVideo,
} from 'lucide-react';
import { M3UItem } from '../types/m3u';
import { openInVlc } from '../utils/playerUtils';
import {
  parseEpisodeInfo,
  findNextEpisode,
  findPreviousEpisode,
  getSeriesEpisodes,
} from '../utils/seriesUtils';
import { NextEpisodeOverlay } from './NextEpisodeOverlay';
import { EpisodeDrawer } from './EpisodeDrawer';

type PlaybackMode = 'web-hls' | 'web-hls-transcode' | 'proxy' | 'direct';

interface VideoPlayerProps {
  item: M3UItem;
  onClose: () => void;
  playlist?: M3UItem[];
  onPlayItem?: (item: M3UItem) => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  item,
  onClose,
  playlist = [],
  onPlayItem,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  // Series & Episode Navigation
  const currentEpisodeInfo = useMemo(() => parseEpisodeInfo(item), [item]);
  const seriesEpisodes = useMemo(
    () => (playlist.length > 0 ? getSeriesEpisodes(item, playlist) : [item]),
    [item, playlist]
  );
  const nextEpisode = useMemo(
    () => (playlist.length > 0 ? findNextEpisode(item, playlist) : null),
    [item, playlist]
  );
  const prevEpisode = useMemo(
    () => (playlist.length > 0 ? findPreviousEpisode(item, playlist) : null),
    [item, playlist]
  );

  // Auto-play state (persisted in localStorage, default true for binge-watching)
  const [autoPlayEnabled, setAutoPlayEnabled] = useState<boolean>(() => {
    return localStorage.getItem('otimflix_autoplay_next') !== 'false';
  });

  const [showNextOverlay, setShowNextOverlay] = useState(false);
  const [showEpisodeDrawer, setShowEpisodeDrawer] = useState(false);

  const toggleAutoPlay = () => {
    setAutoPlayEnabled((prev) => {
      const next = !prev;
      localStorage.setItem('otimflix_autoplay_next', String(next));
      return next;
    });
  };

  // Reset next overlay whenever the active playing item changes
  useEffect(() => {
    setShowNextOverlay(false);
    setShowEpisodeDrawer(false);
  }, [item.url, item.id]);

  // Default to our dynamic in-browser HLS engine powered by Hls.js
  const [playbackMode, setPlaybackMode] = useState<PlaybackMode>('web-hls');

  useEffect(() => {
    setPlaybackMode('web-hls');
  }, [item.url]);

  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [bufferedTime, setBufferedTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [mediaDuration, setMediaDuration] = useState(0);
  const [volume, setVolume] = useState(0.9);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showModeMenu, setShowModeMenu] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loadingTime, setLoadingTime] = useState(0);
  const [copied, setCopied] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPosition, setHoverPosition] = useState<number>(0);

  const idleTimerRef = useRef<any>(null);
  const networkErrorsRef = useRef<number>(0);

  // Monitor loading time
  useEffect(() => {
    let interval: any = null;
    if (isLoading && !errorMessage) {
      interval = setInterval(() => {
        setLoadingTime((prev) => prev + 1);
      }, 1000);
    } else {
      setLoadingTime(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isLoading, errorMessage]);

  // Probe real total duration of the movie from backend
  useEffect(() => {
    if (!item.url) return;
    setMediaDuration(0);
    let isMounted = true;

    fetch(`/api/media-duration?url=${encodeURIComponent(item.url)}`)
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data?.duration && data.duration > 0) {
          setMediaDuration(data.duration);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [item.url]);

  // Auto-hide controls
  const handleMouseMove = () => {
    setShowControls(true);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
        setShowModeMenu(false);
      }
    }, 3500);
  };

  const getTargetUrl = useCallback((mode: PlaybackMode) => {
    const rawUrl = item.url;
    if (!rawUrl) return '';

    if (mode === 'web-hls') {
      return `/api/live-hls/master.m3u8?url=${encodeURIComponent(rawUrl)}`;
    }

    if (mode === 'web-hls-transcode') {
      return `/api/live-hls/master.m3u8?url=${encodeURIComponent(rawUrl)}&transcode=1`;
    }

    if (mode === 'proxy') {
      return `/api/proxy-stream?url=${encodeURIComponent(rawUrl)}`;
    }

    return rawUrl;
  }, [item.url]);

  // Video Stream Setup with HLS and Native support
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !item.url) return;

    setErrorMessage(null);
    setIsLoading(true);

    const targetUrl = getTargetUrl(playbackMode);
    const usesHlsJs = playbackMode === 'web-hls' || playbackMode === 'web-hls-transcode' || item.url.includes('.m3u8');

    // Clean up any previous Hls instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (Hls.isSupported() && usesHlsJs) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false, // Desliga modo live para permitir buffer profundo de filmes
        maxBufferLength: 180, // Mantém até 3 minutos adiantados constantemente
        maxMaxBufferLength: 3600, // Permite carregar até 1 hora de filme na memória
        maxBufferSize: 512 * 1024 * 1024, // 512 MB de cache de vídeo
        backBufferLength: 120, // 2 minutos para voltar instantaneamente
        highBufferWatchdogPeriod: 2,
        progressive: true,
      });
      hlsRef.current = hls;

      hls.loadSource(targetUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLoading(false);
        video.play().catch(() => setIsPlaying(false));
      });

      // Update stream duration as segments load
      hls.on(Hls.Events.LEVEL_UPDATED, (_, data) => {
        if (data?.details?.totalduration && isFinite(data.details.totalduration)) {
          setDuration((prev) => Math.max(prev, data.details.totalduration));
        }
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              networkErrorsRef.current++;
              if (playbackMode === 'web-hls') {
                setPlaybackMode('web-hls-transcode');
                return;
              }
              if (networkErrorsRef.current > 2) {
                setErrorMessage('O servidor de IPTV demorou para responder ou rejeitou o stream em nuvem.');
                setIsLoading(false);
                hls.destroy();
                return;
              }
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              if (playbackMode === 'web-hls') {
                setPlaybackMode('web-hls-transcode');
              } else {
                setErrorMessage('Não foi possível inicializar a transmissão deste filme no navegador.');
                setIsLoading(false);
              }
              hls.destroy();
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl') && usesHlsJs) {
      // Safari Native HLS
      video.src = targetUrl;
      video.load();
      video.addEventListener('loadeddata', () => {
        setIsLoading(false);
        video.play().catch(() => setIsPlaying(false));
      }, { once: true });
    } else {
      // Native high-speed proxy stream (HTML5 Video with Range seeking)
      video.src = targetUrl;
      video.load();

      const handleReady = () => {
        setIsLoading(false);
        video.play().catch(() => setIsPlaying(false));
      };

      video.addEventListener('canplay', handleReady, { once: true });
      video.addEventListener('loadeddata', handleReady, { once: true });
      video.addEventListener('loadedmetadata', handleReady, { once: true });

      video.addEventListener('error', () => {
        console.warn('Native stream error, falling back to HLS transcode...');
        if (playbackMode === 'proxy') {
          setPlaybackMode('web-hls-transcode');
        } else {
          setErrorMessage('Erro ao carregar vídeo na janela.');
          setIsLoading(false);
        }
      }, { once: true });
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      if (video) {
        video.pause();
        video.removeAttribute('src');
        video.load();
      }
      // Notify backend to clean up transcode session
      if (item.url) {
        fetch(`/api/live-hls/stop?url=${encodeURIComponent(item.url)}`, { keepalive: true }).catch(() => {});
      }
    };
  }, [item.url, playbackMode, getTargetUrl]);

  const handlePlayNext = useCallback(() => {
    if (nextEpisode && onPlayItem) {
      setShowNextOverlay(false);
      onPlayItem(nextEpisode);
    }
  }, [nextEpisode, onPlayItem]);

  const handlePlayPrev = useCallback(() => {
    if (prevEpisode && onPlayItem) {
      setShowNextOverlay(false);
      onPlayItem(prevEpisode);
    }
  }, [prevEpisode, onPlayItem]);

  const handleVideoEnded = () => {
    setIsPlaying(false);
    if (nextEpisode && autoPlayEnabled && onPlayItem) {
      setShowNextOverlay(true);
    }
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showEpisodeDrawer) {
          setShowEpisodeDrawer(false);
        } else if (showNextOverlay) {
          setShowNextOverlay(false);
        } else if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        } else {
          onClose();
        }
      } else if (e.code === 'Space' || e.key === 'k') {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 'ArrowLeft') {
        skipTime(-10);
      } else if (e.key === 'ArrowRight') {
        skipTime(10);
      } else if (e.key === 'm' || e.key === 'M') {
        toggleMute();
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      } else if ((e.key === 'n' || e.key === 'N') && nextEpisode) {
        handlePlayNext();
      } else if ((e.key === 'p' || e.key === 'P') && prevEpisode) {
        handlePlayPrev();
      } else if (e.key === 'e' || e.key === 'E') {
        if (seriesEpisodes.length > 1) {
          setShowEpisodeDrawer((prev) => !prev);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isPlaying,
    isMuted,
    isFullscreen,
    duration,
    mediaDuration,
    nextEpisode,
    prevEpisode,
    seriesEpisodes.length,
    showEpisodeDrawer,
    showNextOverlay,
    handlePlayNext,
    handlePlayPrev,
    onClose,
  ]);

  // Effective duration calculation: prioritize real movie duration
  const effectiveDuration = mediaDuration > 0
    ? mediaDuration
    : duration > 0
    ? Math.max(duration, currentTime)
    : Math.max(currentTime, 1);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const skipTime = (seconds: number) => {
    if (!videoRef.current) return;
    const target = Math.max(0, Math.min(currentTime + seconds, effectiveDuration));
    videoRef.current.currentTime = target;
    setCurrentTime(target);
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const cur = videoRef.current.currentTime;
      setCurrentTime(cur);
      if (isLoading && cur > 0) {
        setIsLoading(false);
      }
      // Read actual downloaded buffer from video element
      const buf = videoRef.current.buffered;
      if (buf && buf.length > 0) {
        for (let i = 0; i < buf.length; i++) {
          if (buf.start(i) <= cur && cur <= buf.end(i)) {
            setBufferedTime(buf.end(i));
            break;
          }
        }
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current && isFinite(videoRef.current.duration)) {
      setDuration(videoRef.current.duration);
      setIsLoading(false);
    }
  };

  const handleDurationChange = () => {
    if (videoRef.current && isFinite(videoRef.current.duration)) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      videoRef.current.muted = newVolume === 0;
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    if (isMuted) {
      videoRef.current.muted = false;
      setIsMuted(false);
      videoRef.current.volume = volume || 0.5;
    } else {
      videoRef.current.muted = true;
      setIsMuted(true);
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const handleCopyUrl = () => {
    if (item.url) {
      navigator.clipboard.writeText(item.url).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  const handleOpenVlc = () => {
    openInVlc(item.url, item.title);
  };

  const formatTime = (timeInSeconds: number) => {
    if (isNaN(timeInSeconds) || timeInSeconds <= 0) return '00:00';
    const hours = Math.floor(timeInSeconds / 3600);
    const minutes = Math.floor((timeInSeconds % 3600) / 60);
    const seconds = Math.floor(timeInSeconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || !videoRef.current || !effectiveDuration) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newProgress = Math.max(0, Math.min(clickX / rect.width, 1));
    const targetTime = newProgress * effectiveDuration;

    videoRef.current.currentTime = targetTime;
    setCurrentTime(targetTime);
  };

  const handleProgressMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || !effectiveDuration) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(clickX / rect.width, 1));
    setHoverPosition(clickX);
    setHoverTime(percentage * effectiveDuration);
  };

  const handleProgressMouseLeave = () => {
    setHoverTime(null);
  };

  // Accurate progress percentage matching the real movie duration
  const progressPercent = effectiveDuration > 0
    ? Math.min(100, Math.max(0, (currentTime / effectiveDuration) * 100))
    : 0;

  // Percentage of movie downloaded and stored in buffer
  const bufferedPercent = effectiveDuration > 0
    ? Math.min(100, Math.max(0, (bufferedTime / effectiveDuration) * 100))
    : 0;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="fixed inset-0 z-50 bg-black flex flex-col justify-between overflow-hidden select-none cursor-default"
      style={{ cursor: showControls ? 'default' : 'none' }}
    >
      {/* Top Bar */}
      <div
        className={`absolute top-0 left-0 right-0 z-30 flex items-center justify-between p-4 sm:p-6 bg-gradient-to-b from-black/95 via-black/50 to-transparent transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center transition-all cursor-pointer border border-white/10"
            title="Voltar ao catálogo"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-white font-bold text-base sm:text-xl drop-shadow line-clamp-1">
                {currentEpisodeInfo ? currentEpisodeInfo.seriesName : (item.rawTitle || item.title)}
              </h2>
              {currentEpisodeInfo && (
                <span className="px-2 py-0.5 rounded bg-[#e50914] text-[11px] font-black uppercase tracking-wider text-white shadow-sm">
                  {currentEpisodeInfo.formattedTag}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-400 flex-wrap mt-0.5">
              {currentEpisodeInfo?.episodeTitle ? (
                <span className="text-zinc-200 font-medium line-clamp-1">{currentEpisodeInfo.episodeTitle}</span>
              ) : (
                <span>{item.group}</span>
              )}
              {item.year && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{item.year}</span>
                </>
              )}
              <span aria-hidden="true">·</span>
              <span className="text-[#46d369] font-medium">{item.isSeries ? 'Série' : 'Filme'}</span>

              {item.isSeries && (
                <>
                  <span aria-hidden="true">·</span>
                  <button
                    onClick={toggleAutoPlay}
                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold cursor-pointer transition-colors ${
                      autoPlayEnabled
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-zinc-800 text-zinc-400 hover:text-zinc-300'
                    }`}
                    title="Alternar reprodução automática de maratona"
                  >
                    <Flame className={`w-3 h-3 ${autoPlayEnabled ? 'fill-amber-400 text-amber-400' : 'text-zinc-400'}`} />
                    <span>{autoPlayEnabled ? 'Maratona Ativa' : 'Maratona Pausada'}</span>
                  </button>
                </>
              )}

              {/* Mode indicator badge */}
              <span aria-hidden="true">·</span>
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-800/90 text-[11px] font-medium border border-zinc-700">
                <Sparkles className="w-3 h-3 text-[#e50914]" />
                <span className="text-zinc-200">
                  {playbackMode === 'proxy' && 'Player Nativo (Alta Velocidade)'}
                  {playbackMode === 'web-hls' && 'Web Player HLS (Chunks)'}
                  {playbackMode === 'web-hls-transcode' && 'Web Player (H.264 Total)'}
                  {playbackMode === 'direct' && 'Conexão Direta'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Mode Switcher Button */}
          <div className="relative">
            <button
              onClick={() => setShowModeMenu(!showModeMenu)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-zinc-800/90 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 border border-zinc-700 cursor-pointer transition-colors shadow"
              title="Trocar modo de reprodução de vídeo"
            >
              <Sliders className="w-3.5 h-3.5 text-zinc-400" />
              <span className="hidden sm:inline">Modo Player</span>
            </button>

            {showModeMenu && (
              <div
                className="absolute right-0 top-10 w-64 bg-zinc-900 border border-zinc-700 rounded-lg p-2 shadow-2xl z-40 text-xs flex flex-col gap-1 text-white"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-2 py-1 font-bold text-zinc-400 border-b border-zinc-800 text-[10px] uppercase">
                  Modo de Reprodução Web
                </div>

                <button
                  onClick={() => {
                    setPlaybackMode('proxy');
                    setShowModeMenu(false);
                  }}
                  className={`text-left px-2.5 py-2 rounded flex flex-col transition-colors cursor-pointer ${
                    playbackMode === 'proxy' ? 'bg-[#e50914] text-white font-bold' : 'hover:bg-zinc-800 text-zinc-200'
                  }`}
                >
                  <span>⚡ Player Nativo (Recomendado)</span>
                  <span className="text-[10px] opacity-75 font-normal">Início imediato em MP4/VOD com aceleração gráfica.</span>
                </button>

                <button
                  onClick={() => {
                    setPlaybackMode('web-hls');
                    setShowModeMenu(false);
                  }}
                  className={`text-left px-2.5 py-2 rounded flex flex-col transition-colors cursor-pointer ${
                    playbackMode === 'web-hls' ? 'bg-[#e50914] text-white font-bold' : 'hover:bg-zinc-800 text-zinc-200'
                  }`}
                >
                  <span>🔄 Web Player HLS</span>
                  <span className="text-[10px] opacity-75 font-normal">Streaming em chunks com áudio AAC estéreo.</span>
                </button>

                <button
                  onClick={() => {
                    setPlaybackMode('web-hls-transcode');
                    setShowModeMenu(false);
                  }}
                  className={`text-left px-2.5 py-2 rounded flex flex-col transition-colors cursor-pointer ${
                    playbackMode === 'web-hls-transcode' ? 'bg-[#e50914] text-white font-bold' : 'hover:bg-zinc-800 text-zinc-200'
                  }`}
                >
                  <span>🖥️ Modo H.264 Total</span>
                  <span className="text-[10px] opacity-75 font-normal">Re-codificação de vídeo para formatos antigos.</span>
                </button>
              </div>
            )}
          </div>

          <button
            onClick={handleOpenVlc}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded bg-zinc-800/80 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 border border-zinc-700 cursor-pointer transition-colors"
            title="Abrir no aplicativo VLC ou player do sistema"
          >
            <Tv className="w-3.5 h-3.5 text-amber-400" />
            <span>Abrir no VLC</span>
          </button>
        </div>
      </div>

      {/* Main Video View */}
      <div
        className="relative w-full h-full flex items-center justify-center bg-black"
        onClick={togglePlay}
      >
        <video
          ref={videoRef}
          playsInline
          autoPlay
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onDurationChange={handleDurationChange}
          onWaiting={() => setIsLoading(true)}
          onPlaying={() => {
            setIsLoading(false);
            setIsPlaying(true);
          }}
          onEnded={handleVideoEnded}
          className="w-full h-full object-contain"
        />

        {/* Skip to Next Episode prompt (Netflix style: bottom right floating during ending / credits) */}
        {nextEpisode && !showNextOverlay && effectiveDuration > 25 && effectiveDuration - currentTime <= 15 && currentTime > 10 && (
          <div
            className="absolute bottom-24 right-4 sm:right-8 z-30 animate-in fade-in slide-in-from-bottom-3 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={handlePlayNext}
              className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-black font-extrabold text-xs uppercase tracking-wider shadow-2xl transition-all active:scale-95 cursor-pointer border border-white/40 ring-4 ring-black/40"
              title="Pular créditos e assistir próximo episódio agora"
            >
              <SkipForward className="w-4 h-4 fill-black" />
              <span>Próximo Episódio ({Math.max(1, Math.ceil(effectiveDuration - currentTime))}s)</span>
            </button>
          </div>
        )}

        {/* Auto-play Next Episode Countdown Overlay */}
        {showNextOverlay && nextEpisode && (
          <NextEpisodeOverlay
            nextItem={nextEpisode}
            countdownSeconds={5}
            onPlayNext={handlePlayNext}
            onCancel={() => setShowNextOverlay(false)}
            onOpenEpisodesList={() => {
              setShowNextOverlay(false);
              setShowEpisodeDrawer(true);
            }}
          />
        )}

        {/* Loading Spinner & Helper Controls */}
        {isLoading && !errorMessage && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 backdrop-blur-xs z-10 p-4 text-center">
            <div className="w-14 h-14 border-4 border-zinc-700 border-t-[#e50914] rounded-full animate-spin mb-4" />
            <span className="text-zinc-200 text-sm font-semibold">
              {loadingTime > 6 ? 'O servidor de IPTV está demorando para entregar o vídeo...' : 'Carregando filme...'}
            </span>
            <span className="text-zinc-400 text-xs mt-1">
              {playbackMode === 'proxy' && 'Transmitindo arquivo de vídeo diretamente (alta velocidade)'}
              {playbackMode === 'web-hls' && 'Convertendo áudio e preparando blocos de reprodução'}
              {playbackMode === 'web-hls-transcode' && 'Re-codificando vídeo e áudio em tempo real'}
            </span>

            {loadingTime > 6 && (
              <div
                className="mt-5 flex flex-wrap items-center justify-center gap-2 max-w-md animate-in fade-in"
                onClick={(e) => e.stopPropagation()}
              >
                {playbackMode !== 'proxy' && (
                  <button
                    onClick={() => setPlaybackMode('proxy')}
                    className="px-3 py-1.5 rounded bg-[#e50914] hover:bg-[#b20710] text-xs font-semibold text-white transition-colors cursor-pointer shadow"
                  >
                    ⚡ Player Nativo (Proxy)
                  </button>
                )}
                {playbackMode !== 'web-hls' && (
                  <button
                    onClick={() => setPlaybackMode('web-hls')}
                    className="px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-white border border-zinc-700 transition-colors cursor-pointer"
                  >
                    🔄 Modo HLS
                  </button>
                )}
                {playbackMode !== 'web-hls-transcode' && (
                  <button
                    onClick={() => setPlaybackMode('web-hls-transcode')}
                    className="px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-white border border-zinc-700 transition-colors cursor-pointer"
                  >
                    🖥️ Modo H.264 Total
                  </button>
                )}
                <button
                  onClick={handleOpenVlc}
                  className="px-3 py-1.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-xs font-semibold text-amber-300 border border-amber-500/30 transition-colors cursor-pointer"
                >
                  <Tv className="w-3 h-3 inline mr-1" />
                  Abrir no VLC
                </button>
              </div>
            )}
          </div>
        )}

        {/* Error message / Fallback options */}
        {errorMessage && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/95 z-20 p-4 sm:p-6 text-center animate-in fade-in">
            <AlertTriangle className="w-12 h-12 text-[#e50914] mb-3" />
            <h3 className="text-lg sm:text-xl font-bold text-white mb-2">
              Erro ao carregar o fluxo no navegador
            </h3>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-lg mb-6 leading-relaxed">
              {errorMessage}
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-3 flex-wrap justify-center mb-6 max-w-xl">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setPlaybackMode(playbackMode === 'web-hls' ? 'web-hls-transcode' : 'web-hls');
                }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 bg-[#e50914] hover:bg-[#b20710] text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-xl cursor-pointer transition-all active:scale-95"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{playbackMode === 'web-hls' ? 'Tentar Modo H.264 Total' : 'Tentar Modo Rápido'}</span>
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenVlc();
                }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white font-bold text-xs uppercase tracking-wider rounded-lg cursor-pointer transition-all border border-zinc-700"
              >
                <Tv className="w-3.5 h-3.5 text-amber-400" />
                <span>Abrir no VLC</span>
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopyUrl();
                }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white font-bold text-xs uppercase tracking-wider rounded-lg cursor-pointer transition-all border border-zinc-700"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-[#46d369]" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copiado!' : 'Copiar URL'}</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="text-xs text-zinc-500 hover:text-white underline cursor-pointer"
            >
              Voltar ao Catálogo de Filmes
            </button>
          </div>
        )}

        {/* Play/Pause indicator */}
        {!isPlaying && !isLoading && !errorMessage && showControls && (
          <div className="absolute w-20 h-20 rounded-full bg-black/60 border border-white/20 backdrop-blur-sm flex items-center justify-center pointer-events-none">
            <Play className="w-10 h-10 fill-white text-white ml-1.5" />
          </div>
        )}
      </div>

      {/* Bottom Controls Bar */}
      <div
        className={`absolute bottom-0 left-0 right-0 z-30 px-4 sm:px-8 pb-4 sm:pb-6 pt-12 bg-gradient-to-t from-black via-black/80 to-transparent transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Progress Bar with Accurate Movie Time */}
        <div
          ref={progressBarRef}
          onClick={handleProgressClick}
          onMouseMove={handleProgressMouseMove}
          onMouseLeave={handleProgressMouseLeave}
          className="relative w-full h-3 group/progress cursor-pointer mb-3 flex items-center"
        >
          <div className="w-full h-1.5 bg-zinc-700/60 rounded-full overflow-hidden group-hover/progress:h-2.5 transition-all relative">
            {/* Gray Buffered Bar (downloading movie ahead at full speed) */}
            <div
              className="h-full bg-white/30 rounded-full absolute top-0 left-0 transition-all duration-300 pointer-events-none"
              style={{ width: `${bufferedPercent}%` }}
              title={`Carregado na memória: ${formatTime(bufferedTime)}`}
            />
            {/* Red Current Playback Bar */}
            <div
              className="h-full bg-[#e50914] transition-all relative"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div
            className="absolute w-3.5 h-3.5 bg-[#e50914] rounded-full shadow -ml-1.5 opacity-0 group-hover/progress:opacity-100 transition-opacity"
            style={{ left: `${progressPercent}%` }}
          />
          {hoverTime !== null && (
            <div
              className="absolute -top-8 px-2 py-0.5 bg-black/90 border border-zinc-700 text-white text-[11px] font-mono rounded -translate-x-1/2 pointer-events-none"
              style={{ left: `${hoverPosition}px` }}
            >
              {formatTime(hoverTime)}
            </div>
          )}
        </div>

        {/* Controls Row */}
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-3 sm:gap-5">
            <button
              onClick={togglePlay}
              className="hover:text-zinc-300 transition-colors p-1 focus:outline-none cursor-pointer"
              title={isPlaying ? "Pausar" : "Reproduzir"}
            >
              {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current" />}
            </button>

            <button
              onClick={() => skipTime(-10)}
              className="hover:text-zinc-300 transition-colors p-1 flex items-center justify-center relative group cursor-pointer"
              title="Voltar 10s"
            >
              <RotateCcw className="w-5 h-5" />
              <span className="text-[9px] font-bold absolute top-1.5">10</span>
            </button>

            <button
              onClick={() => skipTime(10)}
              className="hover:text-zinc-300 transition-colors p-1 flex items-center justify-center relative group cursor-pointer"
              title="Avançar 10s"
            >
              <RotateCw className="w-5 h-5" />
              <span className="text-[9px] font-bold absolute top-1.5">10</span>
            </button>

            {prevEpisode && (
              <button
                onClick={handlePlayPrev}
                className="hover:text-white text-zinc-300 transition-colors p-1 flex items-center justify-center cursor-pointer"
                title={`Episódio Anterior: ${prevEpisode.rawTitle || prevEpisode.title}`}
              >
                <SkipBack className="w-5 h-5" />
              </button>
            )}

            {nextEpisode && (
              <button
                onClick={handlePlayNext}
                className="hover:text-white text-[#ff5a5f] transition-colors p-1 flex items-center justify-center cursor-pointer group"
                title={`Próximo Episódio: ${nextEpisode.rawTitle || nextEpisode.title}`}
              >
                <SkipForward className="w-5 h-5 fill-current" />
              </button>
            )}

            <div className="flex items-center gap-2">
              <button
                onClick={toggleMute}
                className="hover:text-zinc-300 transition-colors p-1 focus:outline-none cursor-pointer"
                title={isMuted ? "Ativar som" : "Silenciar"}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-6 h-6" />
                ) : volume < 0.5 ? (
                  <Volume1 className="w-6 h-6" />
                ) : (
                  <Volume2 className="w-6 h-6" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="w-16 sm:w-24 h-1 bg-zinc-700 accent-[#e50914] cursor-pointer"
              />
            </div>

            {/* Time display: shows exact current position and full movie duration */}
            <div className="text-xs sm:text-sm font-mono text-zinc-300 tabular-nums">
              <span>{formatTime(currentTime)}</span>
              <span className="text-zinc-600 mx-1">/</span>
              <span>{formatTime(effectiveDuration)}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Episodes List Drawer Button if series has multiple episodes */}
            {seriesEpisodes.length > 1 && (
              <button
                onClick={() => setShowEpisodeDrawer(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 border border-zinc-700 cursor-pointer transition-colors shadow-sm"
                title="Abrir lista de episódios da série"
              >
                <ListVideo className="w-3.5 h-3.5 text-zinc-300" />
                <span className="hidden sm:inline">Episódios</span>
                <span className="text-[10px] text-zinc-400 font-mono">({seriesEpisodes.length})</span>
              </button>
            )}

            {/* Auto-play Marathon Toggle */}
            {(nextEpisode || item.isSeries) && (
              <button
                onClick={toggleAutoPlay}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                  autoPlayEnabled
                    ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/40 shadow-sm'
                    : 'bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 border-zinc-700'
                }`}
                title={
                  autoPlayEnabled
                    ? 'Maratona Ativa: Próximo episódio inicia automaticamente ao final'
                    : 'Maratona Pausada: Clique para ativar reprodução contínua'
                }
              >
                <Flame className={`w-3.5 h-3.5 ${autoPlayEnabled ? 'fill-amber-400 text-amber-400' : 'text-zinc-500'}`} />
                <span className="hidden sm:inline">Maratona</span>
                <span className="text-[10px] font-bold uppercase tracking-wider">
                  {autoPlayEnabled ? 'ON' : 'OFF'}
                </span>
              </button>
            )}

            <button
              onClick={toggleFullscreen}
              className="hover:text-zinc-300 transition-colors p-1 focus:outline-none cursor-pointer"
              title={isFullscreen ? "Sair da tela cheia" : "Tela cheia"}
            >
              {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Episodes Drawer */}
      <EpisodeDrawer
        isOpen={showEpisodeDrawer}
        onClose={() => setShowEpisodeDrawer(false)}
        currentItem={item}
        episodes={seriesEpisodes}
        onSelectEpisode={(ep) => onPlayItem && onPlayItem(ep)}
        autoPlayEnabled={autoPlayEnabled}
        onToggleAutoPlay={toggleAutoPlay}
      />
    </div>
  );
};
