import React from 'react';
import { Globe } from 'lucide-react';

interface FooterProps {
  onSelectCategory: (cat: any) => void;
}

export const Footer: React.FC<FooterProps> = ({ onSelectCategory }) => {
  return (
    <footer className="border-t border-zinc-800/80 bg-[#101010] text-zinc-500 text-xs py-12 px-4 sm:px-8 md:px-12 mt-16 select-none">
      <div className="max-w-[1700px] mx-auto">
        <p className="mb-6 hover:text-zinc-400 transition-colors">
          Dúvidas? Entre em contato pelo atendimento ao cliente 0800-888-0199
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 mb-8 text-[11px] sm:text-xs">
          <div className="space-y-2.5">
            <button onClick={() => onSelectCategory('all')} className="block hover:underline hover:text-zinc-300">
              Início
            </button>
            <button onClick={() => onSelectCategory('Ação')} className="block hover:underline hover:text-zinc-300">
              Filmes de Ação
            </button>
            <button onClick={() => onSelectCategory('Drama')} className="block hover:underline hover:text-zinc-300">
              Dramas Selecionados
            </button>
            <a href="#termos" className="block hover:underline hover:text-zinc-300">
              Termos de Uso
            </a>
          </div>

          <div className="space-y-2.5">
            <button onClick={() => onSelectCategory('Ficção Científica')} className="block hover:underline hover:text-zinc-300">
              Ficção Científica
            </button>
            <button onClick={() => onSelectCategory('Comédia')} className="block hover:underline hover:text-zinc-300">
              Comédias Populares
            </button>
            <button onClick={() => onSelectCategory('Minha Lista')} className="block hover:underline hover:text-zinc-300">
              Minha Lista
            </button>
            <a href="#privacidade" className="block hover:underline hover:text-zinc-300">
              Privacidade
            </a>
          </div>

          <div className="space-y-2.5">
            <button onClick={() => onSelectCategory('Terror')} className="block hover:underline hover:text-zinc-300">
              Terror e Suspense
            </button>
            <button onClick={() => onSelectCategory('Animação')} className="block hover:underline hover:text-zinc-300">
              Animações
            </button>
            <a href="#imprensa" className="block hover:underline hover:text-zinc-300">
              Imprensa
            </a>
            <a href="#carreiras" className="block hover:underline hover:text-zinc-300">
              Carreiras
            </a>
          </div>

          <div className="space-y-2.5">
            <a href="#ajuda" className="block hover:underline hover:text-zinc-300">
              Central de Ajuda
            </a>
            <a href="#dispositivos" className="block hover:underline hover:text-zinc-300">
              Dispositivos Compatíveis
            </a>
            <a href="#preferencias" className="block hover:underline hover:text-zinc-300">
              Preferências de Cookies
            </a>
            <a href="#corporativo" className="block hover:underline hover:text-zinc-300">
              Informações Corporativas
            </a>
          </div>
        </div>

        {/* Language selector mock */}
        <div className="inline-flex items-center gap-2 border border-zinc-700 rounded px-3 py-1.5 text-zinc-300 text-xs mb-6">
          <Globe className="w-3.5 h-3.5" />
          <span>Português (Brasil)</span>
        </div>

        <p className="text-[11px] text-zinc-600">
          OtimFlix Brasil © 2026. Todos os direitos reservados. Imagens promocionais sob Creative Commons e TMDB para demonstração de interface.
        </p>
      </div>
    </footer>
  );
};
