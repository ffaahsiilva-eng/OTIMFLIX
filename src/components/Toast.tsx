import React from 'react';
import { CheckCircle2, Heart, Info } from 'lucide-react';

interface ToastProps {
  message: string | null;
  type?: 'success' | 'info';
}

export const Toast: React.FC<ToastProps> = ({ message, type = 'success' }) => {
  if (!message) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 bg-zinc-900/95 border border-zinc-700/80 text-white px-4 py-3 rounded-lg shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-4 duration-200">
      {type === 'success' ? (
        <CheckCircle2 className="w-5 h-5 text-[#46d369] shrink-0" />
      ) : (
        <Info className="w-5 h-5 text-blue-400 shrink-0" />
      )}
      <span className="text-xs sm:text-sm font-medium">{message}</span>
    </div>
  );
};
