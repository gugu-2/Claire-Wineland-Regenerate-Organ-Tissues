import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { Layers, Dna, Activity, Shield, AlertTriangle, CheckCircle, ArrowRight, RefreshCw, BarChart2, Eye, Grid } from 'lucide-react';

const CLUSTER_COLORS = [
  '#3b82f6', // Cluster 0: Blue (Ductal)
  '#10b981', // Cluster 1: Emerald (Proliferating)
  '#f59e0b', // Cluster 2: Amber (Hypoxic)
  '#ef4444', // Cluster 3: Rose/Red (Resistant CSC)
  '#8b5cf6', // Cluster 4: Purple (CAFs)
  '#06b6d4', // Cluster 5: Cyan (Macrophages)
  '#ec4899', // Cluster 6: Pink
  '#64748b'  // Cluster 7: Slate
];

export default function ScRnaView({ selectedSample, onProceedToCrisprWithGene }) {
  const [activeSubView, setActiveSubView] = useState('umap'); // 'umap' | 'spatial'
  const [loading, setLoading] = useState(false);
  const [scrnaData, setScrnaData] = useState(null);
  const [selectedCluster, setSelectedCluster] = useState(null);
  const [colorBy, setColorBy] = useState('cluster'); // 'cluster' | 'csc_score'
  
  // Spatial state
  const [spatialData, setSpatialData] = useState(null);
  const [spatialGene, setSpatialGene] = useState('kras_tpm'); // 'kras_tpm' | 'cd44_tpm' | 'cd8a_tpm'

  // Load benchmark on initial mount
  useEffect(() => {
    loadBenchmark();
    loadSpatial();
  }, []);

  const loadBenchmark = async () => {
    setLoading(true);
    try {
      const res = await api.loadScRnaBenchmark({
        sample_id: selectedSample?.sample_id || 'TCGA_PDAC_BIOPSY',
        benchmark_key: 'PDAC_SUBCLONES'
      });
      setScrnaData(res);
      if (res.clusters_summary?.length > 0) {
        // Default to the resistant CSC cluster if present
        const resistant = res.clusters_summary.find(c => c.risk_badge === 'CRITICAL_RESISTANT') || res.clusters_summary[0];
        setSelectedCluster(resistant);
      }
    } catch (err) {
      console.error('Failed to load scRNA benchmark:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadSpatial = async () => {
    try {
      const res = await api.getSpatialVisium(24, 18);
      setSpatialData(res);
    } catch (err) {
      console.error('Failed to load spatial Visium:', err);
    }
  };

  // Helper to map CSC score to heat gradient
  const getCscHeatColor = (score) => {
    if (score >= 0.75) return '#ef4444'; // Red (High CSC)
    if (score >= 0.50) return '#f97316'; // Orange
    if (score >= 0.30) return '#eab308'; // Yellow
    return '#3b82f6'; // Blue (Low)
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 max-w-5xl">
          <div>
            <div className="inline-flex items-center gap-2 bg-purple-950/60 text-purple-400 border border-purple-800/60 px-2.5 py-1 rounded-full text-xs font-mono mb-3">
              <Layers className="w-3.5 h-3.5" /> Module 5: Single-Cell RNA-seq & Spatial Transcriptomics
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Tumor Subclone Dissection & Chemo-Resistant Niche Discovery
            </h2>
            <p className="text-sm text-slate-300 mt-2 leading-relaxed">
              Standard bulk sequencing masks rare 1%–2% therapy-resistant subclones. Single-cell UMAP embeddings isolate 
              <strong className="text-rose-400"> Cancer Stem Cells (CSCs)</strong> to design subclone-targeted CRISPR therapies before relapse occurs.
            </p>
          </div>

          <div className="flex bg-slate-950 border border-slate-800 p-1 rounded-xl shrink-0">
            <button
              onClick={() => setActiveSubView('umap')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeSubView === 'umap' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Activity className="w-3.5 h-3.5" /> Single-Cell UMAP
            </button>
            <button
              onClick={() => setActiveSubView('spatial')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeSubView === 'spatial' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Grid className="w-3.5 h-3.5" /> 10x Visium Spatial
            </button>
          </div>
        </div>
      </div>

      {/* VIEW 1: SINGLE-CELL UMAP EMBEDDING & SUBCLONE EXPLORER */}
      {activeSubView === 'umap' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Interactive UMAP Scatter Canvas */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3 mb-4">
                <div className="flex items-center gap-3">
                  <h3 className="text-sm font-bold text-white">
                    UMAP 2D Manifold &bull; {scrnaData ? `${scrnaData.total_cells} Single Cells` : 'Loading...'}
                  </h3>
                  {scrnaData?.has_resistant_csc_clone && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-800 flex items-center gap-1 animate-pulse">
                      <AlertTriangle className="w-3 h-3" /> Resistant CSC Clone Detected
                    </span>
                  )}
                </div>

                {/* Color By Selector */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-semibold">Color By:</span>
                  <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
                    <button
                      onClick={() => setColorBy('cluster')}
                      className={`px-2.5 py-1 rounded transition-all ${
                        colorBy === 'cluster' ? 'bg-purple-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Clusters
                    </button>
                    <button
                      onClick={() => setColorBy('csc_score')}
                      className={`px-2.5 py-1 rounded transition-all ${
                        colorBy === 'csc_score' ? 'bg-rose-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      CSC Stemness Score
                    </button>
                  </div>
                </div>
              </div>

              {/* UMAP SVG Canvas */}
              <div className="bg-[#050811] border border-slate-800/80 rounded-xl p-4 h-[440px] relative flex items-center justify-center overflow-hidden">
                {loading ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-8 h-8 rounded-full border-2 border-purple-500 border-t-transparent animate-spin"></div>
                    <span className="text-xs text-slate-400">Computing 2D UMAP Projection...</span>
                  </div>
                ) : scrnaData && scrnaData.cell_points ? (
                  <svg className="w-full h-full" viewBox="-12 -12 24 24" preserveAspectRatio="xMidYMid meet">
                    {/* Grid lines */}
                    <line x1="-12" y1="0" x2="12" y2="0" stroke="#1e293b" strokeWidth="0.1" strokeDasharray="0.5 0.5" />
                    <line x1="0" y1="-12" x2="0" y2="12" stroke="#1e293b" strokeWidth="0.1" strokeDasharray="0.5 0.5" />

                    {/* Cell Dots */}
                    {scrnaData.cell_points.map((pt, i) => {
                      const isHighlighted = selectedCluster ? pt.cluster === selectedCluster.cluster_id : true;
                      const dotColor = colorBy === 'cluster'
                        ? CLUSTER_COLORS[pt.cluster % CLUSTER_COLORS.length]
                        : getCscHeatColor(pt.csc_score);
                      
                      return (
                        <circle
                          key={pt.barcode || i}
                          cx={pt.x}
                          cy={pt.y}
                          r={isHighlighted ? 0.35 : 0.15}
                          fill={dotColor}
                          opacity={isHighlighted ? 0.85 : 0.20}
                          className="transition-all hover:scale-150 cursor-pointer"
                        >
                          <title>{`${pt.barcode} | Cluster ${pt.cluster} | CSC Score: ${pt.csc_score}`}</title>
                        </circle>
                      );
                    })}
                  </svg>
                ) : null}

                {/* Legend Overlay */}
                <div className="absolute bottom-3 left-3 bg-slate-900/90 border border-slate-800 rounded-lg p-2 text-[10px] font-mono text-slate-300">
                  {colorBy === 'cluster' ? (
                    <div className="flex flex-wrap gap-2">
                      {scrnaData?.clusters_summary?.map((c) => (
                        <div key={c.cluster_id} className="flex items-center gap-1">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CLUSTER_COLORS[c.cluster_id % CLUSTER_COLORS.length] }}></span>
                          <span>C{c.cluster_id}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span>Low Stemness (0.0)</span>
                      <div className="w-16 h-2 rounded bg-gradient-to-r from-blue-500 via-amber-500 to-red-500"></div>
                      <span>Resistant CSC (1.0)</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Subclones Cluster Strip */}
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
                {scrnaData?.clusters_summary?.map((c) => {
                  const isSelected = selectedCluster?.cluster_id === c.cluster_id;
                  const isResistant = c.risk_badge === 'CRITICAL_RESISTANT';
                  return (
                    <div
                      key={c.cluster_id}
                      onClick={() => setSelectedCluster(c)}
                      className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-purple-950/40 border-purple-500 ring-1 ring-purple-500/50'
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CLUSTER_COLORS[c.cluster_id % CLUSTER_COLORS.length] }}></span>
                          <span className="text-xs font-bold text-white">Cluster {c.cluster_id}</span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400">{c.percentage}%</span>
                      </div>
                      <div className="text-[11px] text-slate-300 truncate mt-1">{c.subclone_type}</div>
                      <div className="flex items-center justify-between mt-1 text-[10px]">
                        <span className="text-slate-400">CSC: {c.avg_csc_score}</span>
                        {isResistant && <span className="text-rose-400 font-bold">⚠ Resistant</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Selected Cluster Details & Target Bridge */}
          <div className="space-y-4">
            {selectedCluster ? (
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: CLUSTER_COLORS[selectedCluster.cluster_id % CLUSTER_COLORS.length] }}></span>
                      Subclone &bull; Cluster {selectedCluster.cluster_id}
                    </h3>
                    <div className="text-xs text-slate-400 mt-0.5">{selectedCluster.subclone_type}</div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    selectedCluster.risk_badge === 'CRITICAL_RESISTANT'
                      ? 'bg-rose-950 text-rose-300 border border-rose-800'
                      : selectedCluster.risk_badge === 'HIGH_GROWTH'
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : 'bg-slate-800 text-slate-300'
                  }`}>
                    {selectedCluster.risk_badge}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-slate-400 text-[10px]">Cell Population</span>
                    <div className="text-sm font-bold text-white mt-0.5">{selectedCluster.cell_count} cells</div>
                  </div>
                  <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-slate-400 text-[10px]">Stemness Score</span>
                    <div className={`text-sm font-bold mt-0.5 ${selectedCluster.avg_csc_score >= 0.7 ? 'text-rose-400' : 'text-slate-200'}`}>
                      {selectedCluster.avg_csc_score} / 1.0
                    </div>
                  </div>
                </div>

                {/* Marker Genes Table */}
                <div>
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                    Enriched Subclone Marker Genes
                  </h4>
                  <div className="space-y-1.5 max-h-56 overflow-y-auto">
                    {scrnaData?.cluster_markers?.[selectedCluster.cluster_id]?.map((m, idx) => (
                      <div
                        key={idx}
                        className="bg-slate-950/80 border border-slate-800/80 rounded-lg p-2 flex items-center justify-between text-xs font-mono"
                      >
                        <div>
                          <span className="font-bold text-purple-300">{m.gene}</span>
                          <span className="text-slate-500 ml-2 text-[10px]">Log2FC: +{m.log2fc}</span>
                        </div>
                        <button
                          onClick={() => onProceedToCrisprWithGene && onProceedToCrisprWithGene(m.gene)}
                          className="px-2 py-0.5 bg-cyan-950 hover:bg-cyan-900 border border-cyan-800 text-cyan-300 rounded text-[10px] font-sans font-semibold transition-all"
                          title={`Design CRISPR guides targeting ${m.gene}`}
                        >
                          Target Gene &rarr;
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bridge to CRISPR Designer */}
                <div className="pt-3 border-t border-slate-800">
                  <button
                    onClick={() => {
                      const topGene = selectedCluster.top_markers?.[0] || 'MYC';
                      if (onProceedToCrisprWithGene) onProceedToCrisprWithGene(topGene);
                    }}
                    className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-bold rounded-lg text-xs transition-all shadow-lg shadow-purple-600/20 flex items-center justify-center gap-2"
                  >
                    <span>Design Guides for Subclone Target ({selectedCluster.top_markers?.[0] || 'MYC'})</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 text-center text-slate-400">
                Select a cluster to view marker genes and subclone vulnerabilities.
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: 10x VISIUM SPATIAL HISTOLOGY TRANSCRIPTOMICS */}
      {activeSubView === 'spatial' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Grid className="w-5 h-5 text-indigo-400" /> 10x Visium Spatial Histology Grid
              </h3>
              <p className="text-xs text-slate-400">
                Spatial gene expression mapping across tissue architecture (necrotic center vs invasive tumor edge vs immune border).
              </p>
            </div>

            {/* Spatial Gene Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-semibold">Overlay Gene:</span>
              <select
                value={spatialGene}
                onChange={(e) => setSpatialGene(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-indigo-300 focus:outline-none focus:border-indigo-500"
              >
                <option value="kras_tpm">KRAS (Oncogenic Driver Expression)</option>
                <option value="cd44_tpm">CD44 (Cancer Stem Cell Invasion)</option>
                <option value="cd8a_tpm">CD8A (Cytotoxic T-Cell Infiltration)</option>
              </select>
            </div>
          </div>

          {/* Spatial Grid Canvas */}
          <div className="bg-[#050811] border border-slate-800 rounded-xl p-6 flex flex-col items-center">
            {spatialData?.spots ? (
              <div
                className="grid gap-1.5"
                style={{
                  gridTemplateColumns: `repeat(${spatialData.grid_dimensions.width}, minmax(0, 1fr))`
                }}
              >
                {spatialData.spots.map((spot) => {
                  const val = spot[spatialGene] || 0.0;
                  // Color scale: from dark navy/slate to bright magenta/cyan
                  let bgColor = '#0f172a';
                  if (spatialGene === 'kras_tpm') {
                    bgColor = val > 200 ? '#ef4444' : (val > 100 ? '#f97316' : '#1e293b');
                  } else if (spatialGene === 'cd44_tpm') {
                    bgColor = val > 150 ? '#ec4899' : (val > 80 ? '#8b5cf6' : '#1e293b');
                  } else {
                    bgColor = val > 40 ? '#10b981' : (val > 10 ? '#06b6d4' : '#0f172a');
                  }

                  return (
                    <div
                      key={spot.spot_id}
                      className="w-4 h-4 sm:w-5 sm:h-5 rounded-full border border-slate-800 hover:scale-125 transition-all cursor-pointer"
                      style={{ backgroundColor: bgColor }}
                      title={`${spot.spot_id} | Zone: ${spot.histological_zone} | ${spatialGene}: ${val} TPM`}
                    ></div>
                  );
                })}
              </div>
            ) : null}

            {/* Spatial Legend */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-300 font-mono">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#1e293b] border border-slate-700"></span>
                <span>Low / Silent</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-purple-600"></span>
                <span>Moderate Expression</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500"></span>
                <span>High Spatial Concentration</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
