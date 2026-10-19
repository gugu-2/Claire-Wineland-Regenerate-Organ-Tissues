import React from 'react';

export default function TumorFingerprint({ fingerprintData }) {
  if (!fingerprintData || !fingerprintData.fingerprint_axes) return null;

  const { fingerprint_axes, glyph_seed, clinical_summary } = fingerprintData;

  // Render a polygon based on the 8 axes
  const size = 300;
  const center = size / 2;
  const radius = (size / 2) - 40;
  
  const getPoint = (value, index, total) => {
    const angle = (Math.PI * 2 * index) / total - Math.PI / 2;
    const distance = radius * value;
    return {
      x: center + Math.cos(angle) * distance,
      y: center + Math.sin(angle) * distance
    };
  };

  const points = fingerprint_axes.map((axis, i) => getPoint(axis.value, i, fingerprint_axes.length));
  const pointsString = points.map(p => `${p.x},${p.y}`).join(' ');

  // Background web points
  const levels = [0.25, 0.5, 0.75, 1];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl flex flex-col items-center">
      <h3 className="text-xl font-bold text-white mb-2">Tumor Identity Fingerprint</h3>
      <p className="text-sm text-slate-400 mb-6 text-center max-w-md">{clinical_summary}</p>
      
      <div className="relative w-[300px] h-[300px]">
        <svg width={size} height={size} className="overflow-visible drop-shadow-[0_0_15px_rgba(56,189,248,0.3)]">
          {/* Web grid */}
          {levels.map((level, lvlIdx) => {
            const levelPoints = fingerprint_axes.map((_, i) => getPoint(level, i, fingerprint_axes.length));
            return (
              <polygon 
                key={lvlIdx}
                points={levelPoints.map(p => `${p.x},${p.y}`).join(' ')}
                fill="none" 
                stroke="#334155" 
                strokeWidth="1"
                strokeDasharray={lvlIdx === 3 ? "0" : "4 4"}
              />
            );
          })}
          
          {/* Axis lines */}
          {fingerprint_axes.map((_, i) => {
            const outer = getPoint(1, i, fingerprint_axes.length);
            return (
              <line key={`axis-${i}`} x1={center} y1={center} x2={outer.x} y2={outer.y} stroke="#334155" strokeWidth="1" />
            );
          })}

          {/* Data Polygon */}
          <polygon 
            points={pointsString} 
            fill="rgba(56, 189, 248, 0.3)" 
            stroke="#38bdf8" 
            strokeWidth="3" 
          />
          
          {/* Data Points and Labels */}
          {fingerprint_axes.map((axis, i) => {
            const pt = getPoint(axis.value, i, fingerprint_axes.length);
            const labelPt = getPoint(1.2, i, fingerprint_axes.length);
            return (
              <g key={`pt-${i}`}>
                <circle cx={pt.x} cy={pt.y} r="4" fill="#0ea5e9" className="animate-pulse" />
                <text 
                  x={labelPt.x} 
                  y={labelPt.y} 
                  textAnchor="middle" 
                  alignmentBaseline="middle"
                  fill="#94a3b8" 
                  fontSize="11" 
                  className="font-mono"
                >
                  {axis.axis}
                </text>
                <text 
                  x={labelPt.x} 
                  y={labelPt.y + 14} 
                  textAnchor="middle" 
                  alignmentBaseline="middle"
                  fill="#cbd5e1" 
                  fontSize="10" 
                  fontWeight="bold"
                >
                  {axis.raw}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mt-8 pt-4 border-t border-slate-800 w-full text-center">
        <p className="text-xs font-mono text-slate-500 uppercase tracking-widest">Glyph Identity Hash</p>
        <p className="text-sm font-mono text-cyan-500 mt-1">{glyph_seed}</p>
      </div>
    </div>
  );
}
