import React, { useState, useEffect } from 'react';

export default function MolecularViewer({ guideSeq, targetSeq, mutationPos }) {
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setRotation(prev => (prev + 1) % 360);
    }, 50);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="w-full h-[400px] bg-slate-950 rounded-lg border border-slate-800 relative overflow-hidden flex items-center justify-center">
      {/* Abstract 3D Representation of Cas9 */}
      <div 
        className="relative w-64 h-64 transition-transform duration-75"
        style={{ transform: `rotateY(${rotation}deg) rotateX(15deg)` }}
      >
        {/* Cas9 Protein Blob */}
        <div className="absolute inset-0 bg-slate-700/40 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute inset-4 bg-slate-600/30 rounded-3xl blur-md"></div>
        <div className="absolute inset-8 bg-blue-500/10 rounded-full blur-sm shadow-[0_0_50px_rgba(59,130,246,0.3)]"></div>
        
        {/* DNA Helix Abstract Representation */}
        <svg className="absolute inset-0 w-full h-full overflow-visible" viewBox="0 0 100 100">
          {/* Target DNA Strand */}
          <path d="M 0 50 Q 25 20 50 50 T 100 50" fill="none" stroke="#64748b" strokeWidth="3" opacity="0.8" />
          {/* Non-target DNA Strand */}
          <path d="M 0 50 Q 25 80 50 50 T 100 50" fill="none" stroke="#94a3b8" strokeWidth="3" opacity="0.6" />
          
          {/* sgRNA Guide */}
          <path d="M 20 70 C 40 70 45 55 50 50 L 70 50" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeDasharray="2 2" />
          
          {/* Highlight Mutation Node */}
          <circle cx="65" cy="50" r="4" fill="#fbbf24" className="animate-ping" />
          <circle cx="65" cy="50" r="3" fill="#f59e0b" />
        </svg>

        {/* PAM interaction node */}
        <div className="absolute top-1/2 left-[75%] w-6 h-6 -mt-3 -ml-3 rounded-full bg-emerald-500/40 border border-emerald-400/80 animate-pulse shadow-[0_0_15px_rgba(16,185,129,0.5)]"></div>
      </div>
      
      {/* Legend / Overlay Text */}
      <div className="absolute bottom-4 left-4 text-xs font-mono text-slate-400 bg-slate-900/80 p-3 rounded border border-slate-700 backdrop-blur">
        <div className="flex items-center gap-2 mb-1"><span className="w-3 h-3 rounded-full bg-slate-500 inline-block"></span> Target DNA</div>
        <div className="flex items-center gap-2 mb-1"><span className="w-3 h-3 rounded-full border-t border-red-500 border-dashed inline-block"></span> sgRNA Guide ({guideSeq.substring(0,6)}...)</div>
        <div className="flex items-center gap-2 mb-1"><span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span> PAM Recognition (NGG)</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-amber-500 inline-block"></span> Somatic Mutation (G12D)</div>
      </div>
    </div>
  );
}
