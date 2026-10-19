import React, { useState, useEffect } from 'react';

export default function BindingAnimator({ guide20nt, target20nt, pam }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setStep(prev => {
        if (prev >= guide20nt.length + 3) return 0; // +3 for PAM scanning delay
        return prev + 1;
      });
    }, 400); // 400ms per base pair
    return () => clearInterval(timer);
  }, [guide20nt]);

  // Reverse guide for standard 5'-3' to 3'-5' pairing display
  const targetArray = target20nt.split('');
  const guideArray = guide20nt.split('');

  return (
    <div className="flex flex-col items-center max-w-4xl w-full">
      <div className="mb-8 text-center text-slate-400 font-mono text-sm">
        {step < 3 ? "1. PAM Interrogation (Scanning for NGG)" : "2. Directional R-Loop Formation (Strand Invasion)"}
      </div>

      <div className="relative font-mono text-xl md:text-3xl tracking-widest bg-slate-900 p-8 rounded-xl border border-slate-700 shadow-2xl">
        {/* Target DNA (+) */}
        <div className="flex text-slate-300 mb-2 items-center">
          <span className="text-sm text-slate-500 mr-4 font-sans font-bold">5'</span>
          {targetArray.map((base, i) => (
            <span key={i} className={`w-8 text-center transition-all duration-300 ${i >= (targetArray.length - step + 3) ? 'text-blue-400 scale-110 font-bold' : ''}`}>
              {base}
            </span>
          ))}
          {/* PAM */}
          <span className={`ml-2 px-1 text-emerald-400 font-bold rounded ${step >= 1 ? 'bg-emerald-900/50 ring-1 ring-emerald-500' : ''}`}>{pam}</span>
          <span className="text-sm text-slate-500 ml-4 font-sans font-bold">3'</span>
        </div>

        {/* Base Pairs (Hydrogen Bonds) */}
        <div className="flex text-slate-600 mb-2 h-4 items-center pl-10">
          {targetArray.map((_, i) => {
            const isPaired = i >= (targetArray.length - step + 3);
            return (
              <span key={i} className={`w-8 text-center transition-opacity duration-300 ${isPaired ? 'opacity-100 text-red-500 font-bold' : 'opacity-0'}`}>
                |
              </span>
            );
          })}
        </div>

        {/* sgRNA (-) */}
        <div className="flex text-red-400 items-center">
          <span className="text-sm text-slate-500 mr-4 font-sans font-bold">3'</span>
          {guideArray.map((base, i) => {
            const isPaired = i >= (guideArray.length - step + 3);
            return (
              <span key={i} className={`w-8 text-center transition-all duration-300 ${isPaired ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-30 blur-[1px]'}`}>
                {base}
              </span>
            );
          })}
          <span className="ml-2 px-1 text-transparent font-bold">NGG</span>
          <span className="text-sm text-slate-500 ml-4 font-sans font-bold">5'</span>
        </div>

        {/* Cas9 Cleavage Marker */}
        {step >= guideArray.length + 3 && (
          <div className="absolute top-0 bottom-0 right-[4.5rem] w-1 bg-gradient-to-b from-transparent via-yellow-400 to-transparent shadow-[0_0_10px_rgba(250,204,21,1)] animate-pulse"></div>
        )}
      </div>

      <div className="mt-8 flex gap-4">
        <div className="px-3 py-1 rounded bg-slate-800 text-xs font-mono text-slate-300 border border-slate-700">Seed Region: 1-10nt</div>
        <div className="px-3 py-1 rounded bg-slate-800 text-xs font-mono text-slate-300 border border-slate-700">Distal Region: 11-20nt</div>
      </div>
    </div>
  );
}
