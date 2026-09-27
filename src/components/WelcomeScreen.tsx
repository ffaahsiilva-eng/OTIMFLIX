import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  Link as LinkIcon,
  Sparkles,
  Trash2,
  Clock,
  Film,
  ShieldCheck,
  KeyRound,
  FileText,
  AlertCircle,
  HelpCircle,
  Copy,
  Download,
  Flame,
  Play,
} from 'lucide-react';
import { SavedListEntry } from '../types/m3u';
import { DEFAULT_M3U_URL } from '../utils/fetchPlaylist';

interface WelcomeScreenProps {
  onLoadFile: (content: string, name: string) => void;
  onLoadUrl: (url: string) => void;
  savedLists: SavedListEntry[];
  onRemoveSaved: (id: string) => void;
  tmdbApiKey: string;
  onSaveTmdbKey: (key: string) => void;
  onLoadDemo: () => void;
  errorMessage?: string | null;
  onClearError?: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  onLoadFile,
  onLoadUrl,
  savedLists,
  onRemoveSaved,
  tmdbApiKey,
  onSaveTmdbKey,
  onLoadDemo,
  errorMessage,
  onClearError,
}) => {
  const [activeTab, setActiveTab] = useState<'url-file' | 'paste-text'>('url-file');
  const [urlInput, setUrlInput] = useState(DEFAULT_M3U_URL);
  const [pastedText, setPastedText] = useState('');
  const [pastedName, setPastedName] = useState('Minha Lista Colada');
  const [isDragOver, setIsDragOver] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [showCorsHelp, setShowCorsHelp] = useState(false);
  const [tempKey, setTempKey] = useState(tmdbApiKey);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (text) {
          onLoadFile(text, file.name);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (text) {
          onLoadFile(text, file.name);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (urlInput.trim()) {
      if (onClearError) onClearError();
      onLoadUrl(urlInput.trim());
    }
  };

  const handleDownloadDirectly = () => {
    if (urlInput.trim()) {
      window.open(urlInput.trim(), '_blank');
    }
  };

  const handlePasteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pastedText.trim()) return;
    onLoadFile(pastedText.trim(), pastedName.trim() || 'Minha Lista Colada');
  };

  return (
    <div className="min-h-[90vh] flex flex-col items-center justify-center px-4 sm:px-8 py-12 max-w-4xl mx-auto select-none">
      {/* Title & Description */}
      <div className="text-center max-w-2xl mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-950/60 border border-red-800/60 text-[#e50914] text-xs font-bold uppercase tracking-wider mb-4">
          <Film className="w-3.5 h-3.5" />
          <span>Netflix Clone + Leitor M3U Inteligente</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white mb-3">
          OtimFlix — Filmes & Séries
        </h1>

        <p className="text-zinc-400 text-sm sm:text-base leading-relaxed">
          Carregue sua lista M3U e assista seus filmes e séries favoritos com interface estilo Netflix.
          <br className="hidden sm:inline" />
          <strong className="text-zinc-200"> Canais ao vivo e transmissões de TV são filtrados automaticamente.</strong>
        </p>
      </div>

      {/* Error Callout if any */}
      {errorMessage && (
        <div className="w-full max-w-xl mb-6 p-4 sm:p-5 rounded-xl bg-red-950/80 border border-red-800 text-white flex flex-col gap-3 animate-in fade-in shadow-xl">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-[#e50914] shrink-0 mt-0.5" />
            <div className="flex-1 text-xs sm:text-sm">
              <p className="font-bold text-red-200 text-sm">Não foi possível baixar diretamente desta URL</p>
              <p className="text-zinc-300 mt-1 leading-relaxed">{errorMessage}</p>
            </div>
            {onClearError && (
              <button
                onClick={onClearError}
                className="text-zinc-400 hover:text-white text-xs p-1 cursor-pointer"
                title="Fechar aviso"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-red-900/60 text-xs">
            <button
              onClick={handleDownloadDirectly}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-white text-black font-bold hover:bg-zinc-200 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Baixar Lista no Dispositivo</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('paste-text');
                if (onClearError) onClearError();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-white font-semibold transition-colors cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-[#e50914]" />
              <span>Colar Conteúdo M3U</span>
            </button>

            <button
              onClick={() => handleUrlSubmit({ preventDefault: () => {} } as any)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-red-900/60 hover:bg-red-900 text-white font-semibold transition-colors cursor-pointer ml-auto"
            >
              <span>Tentar Novamente</span>
            </button>
          </div>
        </div>
      )}

      {/* Tabs Selector */}
      <div className="flex items-center bg-zinc-900 border border-zinc-800 p-1 rounded-xl mb-6">
        <button
          onClick={() => setActiveTab('url-file')}
          className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'url-file'
              ? 'bg-[#e50914] text-white shadow-md'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <UploadCloud className="w-4 h-4" />
          <span>Arquivo / Link URL</span>
        </button>

        <button
          onClick={() => setActiveTab('paste-text')}
          className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'paste-text'
              ? 'bg-[#e50914] text-white shadow-md'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Colar Conteúdo M3U</span>
        </button>
      </div>

      {activeTab === 'url-file' ? (
        <>
          {/* Main Configured Playlist Quick Access */}
          <div className="w-full max-w-xl mb-4 p-4 rounded-xl bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-950 border border-red-800/80 flex items-center justify-between gap-3 shadow-xl">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-lg bg-[#e50914]/20 border border-[#e50914]/40 flex items-center justify-center shrink-0 text-[#e50914]">
                <Flame className="w-5 h-5 fill-current" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-white font-bold text-sm truncate">Lista Principal (Clipper)</h4>
                  <span className="px-1.5 py-0.5 rounded bg-[#e50914] text-[10px] font-black uppercase text-white shadow-sm">
                    Principal
                  </span>
                </div>
                <p className="text-zinc-400 text-xs truncate mt-0.5">
                  Catálogo completo com mais de 300.000 filmes, séries e novelas
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onLoadUrl(DEFAULT_M3U_URL)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#e50914] hover:bg-[#b20710] text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-all shadow-md shrink-0 cursor-pointer active:scale-95"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Abrir Catálogo</span>
            </button>
          </div>

          {/* Main Drop Zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`w-full max-w-xl rounded-2xl border-2 border-dashed p-8 sm:p-10 text-center cursor-pointer transition-all duration-300 relative group ${
              isDragOver
                ? 'border-[#e50914] bg-red-950/20 scale-[1.01]'
                : 'border-zinc-700 bg-zinc-900/60 hover:border-zinc-500 hover:bg-zinc-900'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".m3u,.m3u8,.txt"
              onChange={handleFileChange}
              className="hidden"
            />

            <div className="w-14 h-14 rounded-full bg-zinc-800/80 group-hover:bg-[#e50914]/20 flex items-center justify-center mx-auto mb-3 transition-colors">
              <UploadCloud className="w-7 h-7 text-zinc-300 group-hover:text-[#e50914] transition-colors" />
            </div>

            <h2 className="text-lg sm:text-xl font-bold text-white mb-1">
              Arraste seu arquivo .m3u aqui
            </h2>
            <p className="text-zinc-400 text-xs sm:text-sm">
              ou clique para selecionar do seu dispositivo (.m3u, .m3u8, .txt)
            </p>

            <div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-zinc-500">
              <ShieldCheck className="w-3.5 h-3.5 text-[#46d369]" />
              <span>Filtro inteligente: canais de TV ao vivo são excluídos automaticamente</span>
            </div>
          </div>

          {/* URL Input Row */}
          <form onSubmit={handleUrlSubmit} className="w-full max-w-xl flex flex-col sm:flex-row gap-2 mt-4">
            <div className="relative flex-1">
              <LinkIcon className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="Ou cole a URL da lista M3U (ex: http://... ou https://...)"
                className="w-full pl-10 pr-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#e50914] transition-colors"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-3 bg-[#e50914] hover:bg-[#b20710] active:scale-95 text-white font-bold text-sm rounded-lg transition-all cursor-pointer whitespace-nowrap"
            >
              Carregar URL
            </button>
          </form>
        </>
      ) : (
        /* Paste M3U Raw Text Option */
        <form onSubmit={handlePasteSubmit} className="w-full max-w-xl flex flex-col gap-3">
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">
              Nome de identificação da lista (opcional):
            </label>
            <input
              type="text"
              value={pastedName}
              onChange={(e) => setPastedName(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-sm text-white focus:outline-none focus:border-[#e50914]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1 flex items-center justify-between">
              <span>Cole as linhas do arquivo M3U:</span>
              <span className="text-[11px] text-zinc-500">Comece com #EXTM3U ou cole os blocos #EXTINF</span>
            </label>
            <textarea
              rows={8}
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder="#EXTM3U&#10;#EXTINF:-1 tvg-logo=&quot;...&quot; group-title=&quot;Filmes&quot;,Nome do Filme (2024)&#10;http://exemplo.com/stream.mp4"
              className="w-full p-3 bg-zinc-900 border border-zinc-700 rounded-md text-xs font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-[#e50914] leading-relaxed resize-y"
            />
          </div>

          <button
            type="submit"
            disabled={!pastedText.trim()}
            className="w-full py-3 bg-[#e50914] hover:bg-[#b20710] disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-bold text-sm rounded-lg transition-all cursor-pointer shadow-lg"
          >
            Processar Conteúdo M3U
          </button>
        </form>
      )}

      {/* Quick Actions & Help */}
      <div className="w-full max-w-xl flex items-center justify-between gap-4 mt-6 pt-6 border-t border-zinc-800 text-xs">
        <button
          onClick={onLoadDemo}
          className="flex items-center gap-1.5 text-zinc-300 hover:text-white bg-zinc-800/80 hover:bg-zinc-800 px-3 py-1.5 rounded transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Catálogo Demo (com Séries & Maratona)</span>
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCorsHelp(true)}
            className="flex items-center gap-1 text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Ajuda com URL</span>
          </button>

          <button
            onClick={() => setShowKeyModal(true)}
            className="flex items-center gap-1 text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>{tmdbApiKey ? 'TMDb ✓' : 'Chave TMDb'}</span>
          </button>
        </div>
      </div>

      {/* Saved / Recent Lists */}
      {savedLists.length > 0 && (
        <div className="w-full max-w-xl mt-8">
          <div className="flex items-center justify-between mb-2 text-xs text-zinc-400 font-semibold uppercase tracking-wider">
            <span>Listas salvas recentemente</span>
            <span>{savedLists.length} histórico</span>
          </div>

          <div className="space-y-2">
            {savedLists.map((list) => (
              <div
                key={list.id}
                onClick={() => {
                  if (list.content) {
                    onLoadFile(list.content, list.name);
                  } else if (list.url) {
                    onLoadUrl(list.url);
                  }
                }}
                className="w-full flex items-center justify-between p-3 bg-zinc-900/80 hover:bg-zinc-800/90 border border-zinc-800/80 rounded-lg cursor-pointer transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-[#e50914] transition-colors">
                    <Film className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <h4 className="text-xs sm:text-sm font-bold text-zinc-200 group-hover:text-white transition-colors">
                      {list.name}
                    </h4>
                    <p className="text-[11px] text-zinc-500 flex items-center gap-1.5 mt-0.5">
                      <span>{list.count} títulos</span>
                      <span>·</span>
                      <Clock className="w-3 h-3" />
                      <span>{list.date}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveSaved(list.id);
                    }}
                    className="p-1.5 text-zinc-500 hover:text-red-500 hover:bg-zinc-800 rounded transition-colors"
                    title="Excluir do histórico"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CORS / URL Help Modal */}
      {showCorsHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-lg w-full text-white shadow-2xl">
            <h3 className="text-base sm:text-lg font-bold mb-2 flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-[#e50914]" />
              <span>Por que algumas URLs falham ao carregar?</span>
            </h3>
            <div className="text-xs text-zinc-300 space-y-3 leading-relaxed">
              <p>
                Muitos provedores de IPTV bloqueiam requisições de navegadores por segurança (política de <strong>CORS</strong>) ou utilizam conexões <strong>HTTP não criptografadas</strong> que navegadores modernos bloqueiam.
              </p>
              <div className="bg-zinc-950 p-3 rounded border border-zinc-800 space-y-2">
                <p className="font-semibold text-white">Como resolver em 10 segundos:</p>
                <ol className="list-decimal pl-4 space-y-1.5 text-zinc-400">
                  <li>Abra a URL da sua lista M3U em uma nova aba do navegador.</li>
                  <li>O navegador irá baixar o arquivo <strong>.m3u</strong> automaticamente ou exibir o texto.</li>
                  <li>Arraste esse arquivo para cá ou copie o texto e cole na aba <strong>"Colar Conteúdo M3U"</strong>.</li>
                </ol>
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <button
                onClick={() => setShowCorsHelp(false)}
                className="px-4 py-2 bg-[#e50914] text-white text-xs font-bold rounded"
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TMDb Key Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-md w-full text-white shadow-2xl">
            <h3 className="text-base sm:text-lg font-bold mb-2">Chave de API do TMDb</h3>
            <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
              Opcional. Se você possuir uma chave do The Movie Database (v3), informe-a abaixo para buscar sinopses e pôsteres em alta definição de filmes e séries da sua lista M3U. Se não possuir, os logos do próprio M3U serão usados.
            </p>
            <input
              type="text"
              value={tempKey}
              onChange={(e) => setTempKey(e.target.value)}
              placeholder="Cole sua API Key v3 aqui..."
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded text-sm text-white mb-4 focus:outline-none focus:border-[#e50914]"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowKeyModal(false)}
                className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  onSaveTmdbKey(tempKey.trim());
                  setShowKeyModal(false);
                }}
                className="px-4 py-2 bg-[#e50914] text-white text-xs font-bold rounded"
              >
                Salvar Chave
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
