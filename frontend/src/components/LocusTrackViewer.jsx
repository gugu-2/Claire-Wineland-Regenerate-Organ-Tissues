import React, { useState } from 'react';
import { Eye, MapPin, ZoomIn, ZoomOut, RotateCcw, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function LocusTrackViewer({
  geneSymbol = 'CCR5',
  sequenceLength = 1059,
  variants = [],
  candidates = [],
  selectedGuide = null,
  onSelectGuide = () => {},
  coordinates = 'chr3:46,370,000-46,375,000'
}) {
  const [zoomLevel, setZoomLevel] = useState(1); // 1 = full view, 2 = 2x, 4 = 4x
  const [panOffset, setPanOffset] = useState(0);

  // Normalize position to percentage (0 to 100%)
  const posToPct = (pos) => {
    if (!sequenceLength || sequenceLength <= 0) return 0;
    const clamped = Math.max(0, Math.min(pos, sequenceLength));
    const basePct = (clamped / sequenceLength) * 100;
    // Apply zoom and pan
    const zoomedPct = (basePct - panOffset) * zoomLevel;
    return Math.max(0, Math.min(zoomedPct, 100));
  };

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev * 1.5, 4));
  const handleZoomOut = () => {
    setZoomLevel(prev => {
      const next = Math.max(prev / 1.5, 1);
      if (next === 1) setPanOffset(0);
      return next;
    });
  };
  const handleReset = () => {
    setZoomLevel(1);
    setPanOffset(0);
  };

  // Generate tick marks along the sequence axis
  const tickStep = zoomLevel > 2 ? 100 : zoomLevel > 1.5 ? 200 : 250;
  const ticks = [];
  for (let i = 0; i <= sequenceLength; i += tickStep) {
    ticks.push(i);
  }

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3 font-sans">
      {/* Track Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-xs font-bold text-slate-200">Interactive Genomic Locus Browser</span>
          <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-800/60 px-2 py-0.5 rounded">
            {coordinates} &bull; {geneSymbol} ({sequenceLength} bp)
          </span>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          <button
            onClick={handleZoomIn}
            className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded text-slate-300 hover:text-white transition-all text-xs"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded text-slate-300 hover:text-white transition-all text-xs"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleReset}
            className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded text-slate-300 hover:text-white transition-all text-xs"
            title="Reset View"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <span className="text-[10px] font-mono text-slate-500 ml-1">{Math.round(zoomLevel * 100)}%</span>
        </div>
      </div>

      {/* Main Track Display Area */}
      <div className="relative pt-2 pb-3 overflow-hidden select-none">
        {/* Track 1: Coordinate Axis / Ruler */}
        <div className="relative h-6 border-b border-slate-800 mb-2">
          {ticks.map(tick => {
            const left = posToPct(tick);
            if (left < 0 || left > 100) return null;
            return (
              <div
                key={tick}
                className="absolute top-0 flex flex-col items-center -translate-x-1/2"
                style={{ left: `${left}%` }}
              >
                <div className="h-2 w-px bg-slate-700" />
                <span className="text-[9px] font-mono text-slate-500 mt-0.5">{tick} bp</span>
              </div>
            );
          })}
        </div>

        {/* Track 2: Coding Exon / Locus Body */}
        <div className="mb-4">
          <div className="text-[10px] font-mono text-slate-400 mb-1 flex items-center justify-between">
            <span>Coding Locus (CDS)</span>
            <span className="text-slate-500 text-[9px]">Strand: (+) &rarr; 5' to 3'</span>
          </div>
          <div className="relative h-7 bg-slate-900 border border-slate-800 rounded flex items-center overflow-hidden">
            {/* Exon segments */}
            <div
              className="absolute top-0 bottom-0 bg-gradient-to-r from-indigo-950/80 via-cyan-950/80 to-indigo-950/80 border-x border-cyan-600/40 flex items-center justify-between px-3 text-[10px] font-mono text-cyan-300 font-semibold"
              style={{ left: `${posToPct(0)}%`, width: `${Math.min(100, 100 * zoomLevel)}%` }}
            >
              <span>Exon Coding Body</span>
              <span className="text-[9px] text-cyan-400/80">&gt;&gt;&gt;&gt;&gt;&gt;&gt;&gt;&gt;&gt;&gt;</span>
            </div>

            {/* Benchmark known domains */}
            {geneSymbol === 'CCR5' && (
              <div
                className="absolute top-1 bottom-1 bg-teal-500/20 border border-teal-500/40 rounded text-[9px] font-mono text-teal-300 flex items-center justify-center px-1"
                style={{ left: `${posToPct(570)}%`, width: `${posToPct(640) - posToPct(570)}%` }}
                title="Extracellular Loop 2 (ECL2) / HIV Coreceptor Interaction Domain"
              >
                ECL2 Domain
              </div>
            )}
          </div>
        </div>

        {/* Track 3: Patient Variant Pins */}
        <div className="mb-4">
          <div className="text-[10px] font-mono text-slate-400 mb-1">
            Personal Variants ({variants?.length || 0} Registered)
          </div>
          <div className="relative h-7 bg-slate-900/40 border border-slate-800/80 rounded flex items-center">
            {variants && variants.length > 0 ? (
              variants.map((v, i) => {
                const rawPos = v.position || 0;
                // Offset calculation relative to gene
                const codingStart = geneSymbol === 'CCR5' ? 46372544 : (geneSymbol === 'HBB' ? 5226983 : 0);
                const relPos = (codingStart && rawPos >= codingStart) ? rawPos - codingStart : rawPos % sequenceLength;
                const left = posToPct(relPos);
                const isPathogenic = v.clinical_significance?.toLowerCase().includes('pathogenic') || v.pathogenicity_level === 'PATHOGENIC';
                const isProtective = v.clinical_significance?.toLowerCase().includes('protective') || v.pathogenicity_level === 'PROTECTIVE';

                return (
                  <div
                    key={i}
                    className="absolute -translate-x-1/2 flex flex-col items-center group cursor-pointer z-10"
                    style={{ left: `${left}%` }}
                  >
                    <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-bold shadow-md ${
                      isProtective ? 'bg-emerald-500 text-white' :
                      isPathogenic ? 'bg-rose-500 text-white' : 'bg-amber-500 text-black'
                    }`}>
                      !
                    </div>
                    <div className="h-2 w-px bg-slate-500" />

                    {/* Hover Tooltip */}
                    <div className="hidden group-hover:block absolute bottom-full mb-2 bg-slate-900 border border-slate-700 text-slate-200 text-[10px] p-2 rounded shadow-2xl z-50 whitespace-nowrap">
                      <div className="font-bold text-cyan-400">{v.rsid || `Pos: ${rawPos}`}</div>
                      <div>Allele: {v.ref}&gt;{v.alt} ({v.variant_type})</div>
                      <div className="text-slate-400">{v.clinical_significance || 'VUS'}</div>
                    </div>
                  </div>
                );
              })
            ) : (
              <span className="text-[10px] text-slate-500 italic pl-3">Wildtype locus &bull; No personal variants detected</span>
            )}
          </div>
        </div>

        {/* Track 4: Candidate gRNAs */}
        <div>
          <div className="text-[10px] font-mono text-slate-400 mb-1 flex items-center justify-between">
            <span>Candidate Guide RNAs ({candidates?.length || 0} Evaluated)</span>
            <span className="text-[9px] text-slate-500">Click a guide bar to inspect biophysical scores</span>
          </div>
          <div className="relative h-12 bg-slate-900/60 border border-slate-800 rounded p-1">
            {candidates && candidates.map((c) => {
              const startPos = c.start_offset !== undefined ? c.start_offset : 500;
              const endPos = c.end_offset !== undefined ? c.end_offset : startPos + 23;
              const left = posToPct(startPos);
              const right = posToPct(endPos);
              const width = Math.max(right - left, 1.8); // minimum visual width
              const isSelected = selectedGuide?.guide_id === c.guide_id;
              const isCollision = c.is_personalized_different;
              const eff = c.on_target_efficiency_patient || 0.5;

              const bgClass = isCollision
                ? 'bg-rose-600 hover:bg-rose-500 border-rose-400'
                : eff >= 0.70
                ? 'bg-emerald-600 hover:bg-emerald-500 border-emerald-400'
                : eff >= 0.40
                ? 'bg-amber-600 hover:bg-amber-500 border-amber-400'
                : 'bg-rose-700 hover:bg-rose-600 border-rose-500';

              return (
                <button
                  key={c.guide_id}
                  onClick={() => onSelectGuide(c)}
                  className={`absolute top-2 h-7 rounded border transition-all flex items-center justify-between px-1.5 shadow group cursor-pointer ${bgClass} ${
                    isSelected ? 'ring-2 ring-cyan-300 ring-offset-2 ring-offset-slate-950 z-20 scale-105' : 'opacity-90 hover:opacity-100 z-10'
                  }`}
                  style={{
                    left: `${left}%`,
                    width: `${width}%`,
                    minWidth: '28px'
                  }}
                  title={`${c.guide_id} (${c.strand} strand) &bull; Predicted Cleavage: ${Math.round(eff * 100)}%`}
                >
                  <span className="text-[9px] font-mono font-bold text-white truncate">
                    {c.strand === '+' ? '>' : '<'}
                  </span>
                  <span className="text-[8px] font-mono text-white/90 truncate ml-0.5">
                    {Math.round(eff * 100)}%
                  </span>

                  {/* Tooltip */}
                  <div className="hidden group-hover:block absolute bottom-full mb-2 bg-slate-900 border border-slate-700 text-slate-200 text-[10px] p-2 rounded shadow-2xl z-50 whitespace-nowrap pointer-events-none">
                    <div className="font-bold text-cyan-400">{c.guide_id}</div>
                    <div>PAM: {c.pam_sequence} ({c.nuclease_type || 'SpCas9'})</div>
                    <div>On-Target: {Math.round(eff * 100)}% &bull; CFD Specificity: {c.off_target_cfd_score}</div>
                    {isCollision && <div className="text-rose-400 font-bold">SNP Collision Detected!</div>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Track Legend */}
      <div className="flex flex-wrap items-center gap-4 text-[10px] text-slate-400 pt-1 border-t border-slate-800/60">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-emerald-600" />
          <span>High Cleavage (&ge;70%)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-amber-600" />
          <span>Moderate (40-69%)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-rose-600" />
          <span>Personal SNP Collision / Low</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 text-white flex items-center justify-center text-[8px] font-bold">!</span>
          <span>Variant Site</span>
        </div>
      </div>
    </div>
  );
}
