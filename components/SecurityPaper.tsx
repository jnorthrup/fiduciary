
import React from 'react';

interface Props {
  title: string;
  children: React.ReactNode;
  watermarkText?: string;
  serialNumber?: string;
  type?: 'Bond' | 'Indenture' | 'Certificate';
}

export const SecurityPaper: React.FC<Props> = ({ title, children, watermarkText = "ORIGINAL DOCUMENT", serialNumber, type = 'Bond' }) => {
  return (
    <div className="relative w-full h-full bg-[#fdfbf7] p-8 overflow-hidden shadow-2xl font-serif text-slate-900 border border-[#d4c5a9]">
      
      {/* Guilloche Pattern Background (Simulated via CSS) */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-10" 
        style={{ 
            backgroundImage: `repeating-linear-gradient(45deg, #b8860b 0, #b8860b 1px, transparent 0, transparent 50%)`,
            backgroundSize: '20px 20px' 
        }} 
      />
      
      {/* Intricate Border */}
      <div className="absolute inset-4 border-[4px] border-double border-[#8b7355] pointer-events-none">
          <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-[#b8860b]"></div>
          <div className="absolute top-0 right-0 w-16 h-16 border-t-2 border-r-2 border-[#b8860b]"></div>
          <div className="absolute bottom-0 left-0 w-16 h-16 border-b-2 border-l-2 border-[#b8860b]"></div>
          <div className="absolute bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-[#b8860b]"></div>
      </div>

      {/* Watermark */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5 rotate-45">
          <span className="text-6xl font-black uppercase text-slate-900 tracking-widest">{watermarkText}</span>
      </div>

      {/* Header */}
      <div className="relative z-10 text-center mb-8 border-b-2 border-[#8b7355] pb-4 mx-8">
          <h1 className="text-3xl font-bold uppercase tracking-[0.2em] text-[#5c4033] mb-2">{title}</h1>
          <div className="flex justify-between text-xs font-bold text-[#8b7355] uppercase tracking-widest px-4">
              <span>{type} Instrument</span>
              {serialNumber && <span>No. {serialNumber}</span>}
              <span>United States of America</span>
          </div>
      </div>

      {/* Content */}
      <div className="relative z-10 px-12 py-4 text-sm leading-relaxed text-justify">
          {children}
      </div>

      {/* Footer / Seal Area */}
      <div className="absolute bottom-12 left-12 right-12 flex justify-between items-end z-10">
          <div className="text-center">
              <div className="w-48 border-b border-[#5c4033] mb-1"></div>
              <div className="text-[10px] font-bold uppercase text-[#8b7355]">Authorized Signature</div>
          </div>
          
          {/* Faux Seal */}
          <div className="w-24 h-24 rounded-full border-4 border-[#b8860b] flex items-center justify-center opacity-80 rotate-12">
              <div className="w-20 h-20 rounded-full border border-dashed border-[#b8860b] flex items-center justify-center text-[10px] font-bold text-[#b8860b] text-center p-2 uppercase leading-tight">
                  Seal of the<br/>Fiduciary<br/>Trust
              </div>
          </div>

          <div className="text-center">
              <div className="w-48 border-b border-[#5c4033] mb-1"></div>
              <div className="text-[10px] font-bold uppercase text-[#8b7355]">Attesting Witness</div>
          </div>
      </div>
    </div>
  );
};
