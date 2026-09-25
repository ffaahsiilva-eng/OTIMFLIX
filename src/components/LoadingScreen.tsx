import React from 'react';
import { Film, ArrowLeft } from 'lucide-react';

interface LoadingScreenProps {
  text: string;
  progress: number;
  total: number;
  onCancel?: () => void;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ text, progress, total, onCancel }) => {
  const percent = total > 0 ? Math.min(100, Math.round((progress / total) * 100)) : 0;

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center select-none">
      <div className="relative mb-6">
        <div className="w-16 h-16 border-4 border-zinc-800 border-t-[#e50914] rounded-full animate-spin" />
        <Film className="w-6 h-6 text-zinc-400 absolute inset-0 m-auto" />
      </div>

      <h3 className="text-xl font-bold text-white mb-2">{text}</h3>
      <p className="text-xs text-zinc-400 font-mono mb-4">
        {total > 0 ? `${progress} de ${total} títulos analisados (${percent}%)` : 'Aguarde um momento...'}
      </p>

      {total > 0 && (
        <div className="w-72 max-w-full h-2 bg-zinc-800 rounded-full overflow-hidden mb-6">
          <div
            className="h-full bg-[#e50914] transition-all duration-300"
            style={{ width: `${percent}%` }}
          />
        </div>
      )}

      {onCancel && (
        <button
          onClick={onCancel}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Cancelar e Voltar</span>
        </button>
      )}
    </div>
  );
};
