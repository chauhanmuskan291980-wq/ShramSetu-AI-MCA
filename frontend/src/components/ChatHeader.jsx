import React from 'react';
import {Bot, Globe } from 'lucide-react';

const ChatHeader = ({ welcome, sub, lang, onLangClick }) => (
  <header className="bg-[#0B3C5D] text-white p-4 sm:p-5 flex items-center justify-between shrink-0 shadow-md z-10">
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 sm:w-10 sm:h-10 bg-green-600 rounded-full flex items-center justify-center border border-white/20 text-lg shadow-inner">
      <Bot size={20} className="text-white -rotate-3" />
      </div>
      <div className="text-left">
        <h1 className="font-bold text-[14px] sm:text-[15px] tracking-tight leading-none">{welcome}</h1>
        <p className="text-[8px] sm:text-[9px] text-green-300 font-black uppercase tracking-[0.1em] mt-1 opacity-80">{sub}</p>
      </div>
    </div>
    
    <div className="flex items-center gap-2">
      <button onClick={onLangClick} className="bg-white/10 px-3 py-1.5 rounded-xl border border-white/20 flex items-center gap-1.5 hover:bg-white/20 transition-all active:scale-95">
        <Globe size={14} className="text-orange-400" />
        <span className="text-[10px] font-bold uppercase tracking-wider">{lang}</span>
      </button>
    </div>
  </header>
);

export default ChatHeader;