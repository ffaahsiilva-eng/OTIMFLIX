import React, { useState, useRef, useEffect } from 'react';
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
  ExternalLink,
  Tv,
} from 'lucide-react';
import { M3UItem } from '../types/m3u';
import { openInVlc } from '../utils/playerUtils';

interface VideoPlayerProps {
  item: M3UItem;
  onClose: () => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ item, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.9);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [useProxy, setUseProxy] = useState<boolean>(() => {
    // If the app is on HTTPS and the video link is insecure HTTP, default to proxy
    if (typeof window !== 'undefined' && window.location.protocol === 'https:' && item.url.startsWith('http://')) {
      return true;
    }
    return false;
  });
  const [copied, setCopied] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPosition, setHoverPosition] = useState<number>(0);

  const idleTimerRef = useRef<any>(null);

  // Auto-hide controls
  const handleMouseMove = () => {
    setShowControls(true);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3500);
  };

  const getEffectiveUrl = (rawUrl: string, proxyEnabled: boolean) => {
    if (!rawUrl) return '';
    if (proxyEnabled) {
      return `/api/proxy-stream?url=${encodeURIComponent(rawUrl)}`;
    }
    return rawUrl;
  };

  // Video Stream Setup with HLS and Native support
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !item.url) return;

    setErrorMessage(null);
    setIsLoading(true);

    const targetUrl = getEffectiveUrl(item.url, useProxy);
    const isHlsStream = item.url.includes('.m3u8') || item.url.includes('.ts');

    // Clean up any previous Hls instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (Hls.isSupported() && isHlsStream && !useProxy) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
      });
      hlsRef.current = hls;

      hls.loadSource(targetUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLoading(false);
        video.play().catch(() => setIsPlaying(false));
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              if (!useProxy && item.url.startsWith('http://')) {
                setUseProxy(true);
                return;
              }
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              setErrorMessage('Falha ao reproduzir fluxo de transmissão (Erro de rede ou codec).');
              setIsLoading(false);
              hls.destroy();
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl') && isHlsStream && !useProxy) {
      // Native Safari HLS
      video.src = targetUrl;
      video.load();
      video.addEventListener('loadeddata', () => {
        setIsLoading(false);
        video.play().catch(() => setIsPlaying(false));
      }, { once: true });
    } else {
      // Direct MP4 / MKV or Proxied Stream
      video.src = targetUrl;
      video.load();
      video.addEventListener('loadeddata', () => {
        setIsLoading(false);
        video.play().catch(() => setIsPlaying(false));
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
    };
  }, [item.url, useProxy]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (document.fullscreenElement) {
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
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, isMuted, isFullscreen, duration]);

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
    if (!videoRef.current || isNaN(duration)) return;
    videoRef.current.currentTime = Math.max(0, Math.min(videoRef.current.currentTime + seconds, duration || 0));
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration || 0);
      setIsLoading(false);
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

  const handleVideoError = () => {
    setIsLoading(false);
    // If not tried proxy yet, try once
    if (!useProxy && item.url.startsWith('http://')) {
      setUseProxy(true);
      return;
    }
    setErrorMessage(
      'Este filme ou série utiliza um formato ou codec (como MKV ou áudio Dolby AC3) que navegadores web não conseguem reproduzir nativamente.'
    );
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

  const handleOpenNewTab = () => {
    const targetUrl = getEffectiveUrl(item.url, useProxy);
    window.open(targetUrl, '_blank');
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
    if (!progressBarRef.current || !videoRef.current || !duration) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newProgress = Math.max(0, Math.min(clickX / rect.width, 1));
    videoRef.current.currentTime = newProgress * duration;
    setCurrentTime(newProgress * duration);
  };

  const handleProgressMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || !duration) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(clickX / rect.width, 1));
    setHoverPosition(clickX);
    setHoverTime(percentage * duration);
  };

  const handleProgressMouseLeave = () => {
    setHoverTime(null);
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="fixed inset-0 z-50 bg-black flex flex-col justify-between overflow-hidden select-none cursor-default"
      style={{ cursor: showControls ? 'default' : 'none' }}
    >
      {/* Top Bar */}
      <div
        className={`absolute top-0 left-0 right-0 z-30 flex items-center justify-between p-4 sm:p-6 bg-gradient-to-b from-black/90 via-black/40 to-transparent transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center transition-all cursor-pointer border border-white/10"
            title="Voltar ao catálogo"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h2 className="text-white font-bold text-base sm:text-xl drop-shadow line-clamp-1">
              {item.rawTitle || item.title}
            </h2>
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <span>{item.group}</span>
              {item.year && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{item.year}</span>
                </>
              )}
              <span aria-hidden="true">·</span>
              <span className="text-[#46d369] font-medium">{item.isSeries ? 'Série' : 'Filme'}</span>
              {useProxy && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-amber-400 text-[10px] uppercase font-mono">Proxy Ativo</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenVlc}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded bg-zinc-800/80 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 border border-zinc-700 cursor-pointer transition-colors"
            title="Abrir no aplicativo VLC ou player do sistema"
          >
            <Tv className="w-3.5 h-3.5 text-amber-400" />
            <span>Abrir no VLC</span>
          </button>

          <div className="text-xs font-bold text-[#e50914] tracking-widest uppercase hidden md:block">
            OtimFlix Player
          </div>
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
          onWaiting={() => setIsLoading(true)}
          onPlaying={() => {
            setIsLoading(false);
            setIsPlaying(true);
          }}
          onError={handleVideoError}
          onEnded={() => setIsPlaying(false)}
          className="w-full h-full object-contain"
        />

        {/* Loading Spinner */}
        {isLoading && !errorMessage && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 backdrop-blur-xs z-10 pointer-events-none">
            <div className="w-14 h-14 border-4 border-zinc-700 border-t-[#e50914] rounded-full animate-spin mb-4" />
            <span className="text-zinc-300 text-sm font-medium">Carregando transmissão...</span>
          </div>
        )}

        {/* Error message / Fallback options */}
        {errorMessage && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/92 z-20 p-4 sm:p-6 text-center animate-in fade-in">
            <AlertTriangle className="w-12 h-12 text-[#e50914] mb-3" />
            <h3 className="text-lg sm:text-xl font-bold text-white mb-2">
              Formato de vídeo não suportado pelo navegador
            </h3>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-lg mb-6 leading-relaxed">
              Muitos filmes sob demanda (VOD) utilizam áudio <strong>Dolby Digital (AC3/EAC3)</strong> ou container <strong>MKV</strong>, que não possuem suporte nativo nos navegadores web modernos (Chrome/Firefox).
              <br />
              <span className="text-zinc-200 font-medium">Você pode assistir perfeitamente usando as opções abaixo:</span>
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-3 flex-wrap justify-center mb-6 max-w-xl">
              {/* Recommended: VLC / System Player */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenVlc();
                }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 bg-[#e50914] hover:bg-[#b20710] text-white font-bold text-xs sm:text-sm uppercase tracking-wider rounded-lg shadow-xl cursor-pointer transition-all active:scale-95"
              >
                <Tv className="w-4 h-4" />
                <span>Abrir no VLC / Player do Dispositivo</span>
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenNewTab();
                }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white font-bold text-xs uppercase tracking-wider rounded-lg cursor-pointer transition-all border border-zinc-700"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Abrir em Nova Aba</span>
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setUseProxy(!useProxy);
                }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white font-bold text-xs uppercase tracking-wider rounded-lg cursor-pointer transition-all border border-zinc-700"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{useProxy ? 'Conexão Direta' : 'Modo Proxy'}</span>
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
        {/* Progress Bar (if duration known) */}
        {duration > 0 && (
          <div
            ref={progressBarRef}
            onClick={handleProgressClick}
            onMouseMove={handleProgressMouseMove}
            onMouseLeave={handleProgressMouseLeave}
            className="relative w-full h-2 group/progress cursor-pointer mb-4 flex items-center"
          >
            <div className="w-full h-1.5 bg-zinc-700/60 rounded-full overflow-hidden group-hover/progress:h-2.5 transition-all">
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
        )}

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

            {duration > 0 && (
              <>
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
              </>
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

            {duration > 0 && (
              <div className="text-xs sm:text-sm font-mono text-zinc-300 tabular-nums">
                <span>{formatTime(currentTime)}</span>
                <span className="text-zinc-600 mx-1">/</span>
                <span>{formatTime(duration)}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
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
    </div>
  );
};
