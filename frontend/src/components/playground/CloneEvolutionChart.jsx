import React, { useMemo } from 'react';

export default function CloneEvolutionChart({ timeline }) {
  if (!timeline || timeline.length === 0) return null;

  // Find max cells across all time steps for Y axis scaling
  const maxCells = Math.max(...timeline.map(t => t.total_cells));
  
  const colors = {
    "Clone A (KRAS G12D)": "bg-red-500",
    "Clone B (TP53 null)": "bg-blue-500",
    "Clone C (Wildtype)": "bg-slate-400"
  };

  return (
    <div className="w-full h-full flex flex-col relative">
      {/* Chart Area */}
      <div className="flex-1 flex items-end gap-1 px-4 pb-8 pt-4 relative">
        {timeline.map((t, idx) => (
          <div key={idx} className="flex-1 flex flex-col justify-end gap-1 h-full relative group">
            {t.clones.map(clone => {
              const heightPct = maxCells > 0 ? (clone.cell_count / maxCells) * 100 : 0;
              const color = colors[clone.clone_id] || "bg-indigo-500";
              // Check for resistance mutations
              const hasResistance = clone.mutations.some(m => m.startsWith("RESISTANCE"));
              
              if (heightPct < 1) return null; // Don't render tiny bars
              
              return (
                <div 
                  key={clone.clone_id}
                  className={`${color} w-full rounded-sm transition-all duration-300 relative ${hasResistance ? 'ring-2 ring-yellow-400 ring-inset' : ''}`}
                  style={{ height: `${heightPct}%`, minHeight: '2px' }}
                >
                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-900 text-xs p-2 rounded shadow-xl border border-slate-700 opacity-0 group-hover:opacity-100 pointer-events-none z-10 whitespace-nowrap transition-opacity">
                    <div className="font-bold text-white">{clone.clone_id}</div>
                    <div className="text-slate-300">Cells: {clone.cell_count.toLocaleString()}</div>
                    <div className="text-slate-400">Fitness: {clone.fitness.toFixed(2)}</div>
                    {hasResistance && <div className="text-yellow-400">Resistance Acquired!</div>}
                  </div>
                </div>
              );
            })}
            
            {/* Treatment Marker */}
            {t.treatment_active && t.step === 5 && (
              <div className="absolute top-0 w-px h-full bg-red-500/50 -left-px">
                <div className="absolute -top-6 -left-4 text-xs font-bold text-red-400 whitespace-nowrap bg-red-950/80 px-2 py-1 rounded border border-red-500/30">
                  Targeted Therapy
                </div>
              </div>
            )}
            
            {/* X Axis Label */}
            <div className="absolute -bottom-6 text-xs text-slate-500 text-center w-full">
              {idx % 5 === 0 ? `t=${t.step}` : ''}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
