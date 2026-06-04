import React from 'react';

const LanguageModal = ({ languages, currentLang, onSelect }) => (
  <div className="absolute inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-6 backdrop-blur-sm">
    <div className="bg-white w-full sm:max-w-md rounded-t-[32px] sm:rounded-[32px] shadow-2xl overflow-hidden animate-in slide-in-from-bottom sm:zoom-in duration-300">
      <div className="p-5 border-b flex justify-between items-center bg-white sticky top-0">
        <h3 className="font-bold text-slate-800 text-sm sm:text-base">Select Language / भाषा चुनें</h3>
      </div>
      <div className="p-4 grid grid-cols-2 gap-3 max-h-[60vh] sm:max-h-[50vh] overflow-y-auto pb-10 sm:pb-4">
        {languages.map((l) => (
          <button 
            key={l.code} 
            onClick={() => onSelect(l.code)} 
            className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${currentLang === l.code ? 'border-[#0B3C5D] bg-blue-50/50' : 'border-gray-100 hover:border-gray-200 bg-gray-50'}`}
          >
            <span className="font-bold text-base sm:text-lg text-slate-800">{l.native}</span>
            <span className="text-[9px] text-slate-400 font-bold tracking-widest uppercase mt-1">{l.eng}</span>
          </button>
        ))}
      </div>
    </div>
  </div>
);

export default LanguageModal;