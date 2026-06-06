 import React, { useState, useEffect } from 'react';
import { Send, Mic } from 'lucide-react';

const ChatInput = ({ input, setInput, onSend, placeholder, onVoice, isListening }) => (
  <footer className="p-3 sm:p-5 bg-white border-t border-slate-100 shrink-0">
    <div className="flex items-center gap-2 bg-[#F1F5F9] rounded-[20px] px-3 sm:px-4 py-1 focus-within:ring-2 focus-within:ring-[#0B3C5D]/10 transition-all">
      
      {/* Mic */}
      <Mic 
        size={18} 
        onClick={onVoice}
        className={`cursor-pointer transition-all shrink-0 ${
          isListening 
            ? 'text-red-500 animate-pulse scale-125' 
            : 'text-slate-400 hover:text-[#0B3C5D]'
        }`} 
      />

      <input 
        type="text" 
        value={input} 
        onChange={(e) => setInput(e.target.value)} 
        onKeyDown={(e) => e.key === 'Enter' && onSend()} 
        placeholder={isListening ? "Listening..." : placeholder} 
        className="flex-1 bg-transparent border-none focus:outline-none text-[14px] py-3 text-slate-700 font-medium" 
      />

      <button 
        onClick={onSend} 
        disabled={!input.trim()}
        className={`p-2 rounded-xl transition-all shrink-0 ${
          input.trim() ? 'text-[#0B3C5D] scale-105' : 'text-slate-300'
        }`}
      >
        <Send size={20} fill={input.trim() ? "currentColor" : "none"} />
      </button>
    </div>
  </footer>
);

export default ChatInput; 