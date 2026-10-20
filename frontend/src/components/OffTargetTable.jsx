import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  Search, 
  Filter, 
  ExternalLink, 
  RefreshCw, 
  X, 
  Dna,
  AlertCircle
} from 'lucide-react';

export default function OffTargetTable({ 
  jobId, 
  guideSeq = "GATAGTCATCTTGGGGCTGG", 
  pamType = "NGG",
  onCriticalHitFound,
  onClose 
}) {
  const [jobStatus, setJobStatus] = useState('QUEUED');
  const [progress, setProgress] = useState(0);
  const [scanResults, setScanResults] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all' | 'critical' | 'tumor_suppressors' | 'exonic'

  useEffect(() => {
    if (!jobId) return;

    let isSubscribed = true;
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/crispr/offtarget-scan/${jobId}`);
        if (!res.ok) throw new Error("Failed to check off-target scan status");
        const data = await res.json();
        
        if (!isSubscribed) return;

        setJobStatus(data.status);
        setProgress(data.progress_pct || 0);

        if (data.status === 'COMPLETED' && data.results) {
          setScanResults(data.results);
          clearInterval(pollInterval);
          
          if (data.results.critical_blocks > 0 && onCriticalHitFound) {
            onCriticalHitFound(data.results);
          }
        } else if (data.status === 'FAILED') {
          setErrorMsg(data.error_message || "Scan job encountered an unexpected error.");
          clearInterval(pollInterval);
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    }, 800);

    return () => {
      isSubscribed = false;
      clearInterval(pollInterval);
    };
  }, [jobId]);

  const hits = scanResults?.hits || [];

  const filteredHits = hits.filter(hit => {
    if (filter === 'critical') return hit.risk_level === 'CRITICAL_BLOCK';
    if (filter === 'tumor_suppressors') return hit.is_tumor_suppressor;
    if (filter === 'exonic') return hit.feature_type === 'Exon';
    return true;
  });

  return (
    <div className="bg-slate-900 border border-slate-700/80 rounded-xl p-5 shadow-2xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400">
            <Dna className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              Genome-Wide Off-Target Alignment (GRCh38 • 3.2B bp)
              {jobStatus === 'COMPLETED' && (
                <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  SCAN COMPLETE
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Guide: <span className="text-indigo-300 font-bold">{guideSeq}</span> • PAM: {pamType} • Job: {jobId}
            </p>
          </div>
        </div>
        
        {onClose && (
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Progress Bar when running */}
      {jobStatus !== 'COMPLETED' && !errorMsg && (
        <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
              Scanning 3.2B base pairs across Chromosomes 1–22, X, Y...
            </span>
            <span className="font-mono text-indigo-400">{progress}%</span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div 
              className="bg-indigo-500 h-full transition-all duration-300 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-500 italic">
            Querying Cas-OFFinder genomic index and cross-referencing Ensembl GFF3 tumor suppressor coordinates.
          </p>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-red-950/50 border border-red-500/40 rounded-lg text-xs text-red-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          {errorMsg}
        </div>
      )}

      {/* Summary Metrics Cards */}
      {scanResults && (
        <>
          {scanResults.tumor_suppressor_alert && (
            <div className="p-3.5 bg-red-950/60 border border-red-500/70 rounded-xl flex items-center justify-between gap-3 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
              <div className="flex items-center gap-3">
                <ShieldAlert className="w-6 h-6 text-red-400 shrink-0 animate-pulse" />
                <div>
                  <h4 className="text-xs font-bold text-red-200 uppercase tracking-wider">
                    Critical Tumor Suppressor Collision Detected
                  </h4>
                  <p className="text-xs text-red-300 mt-0.5">
                    This guide exhibits high-affinity off-target binding in a coding exon of a known tumor suppressor (e.g. TP53/BRCA1). Therapeutic approval is blocked pending mandatory IRB/Expert Review.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800">
              <div className="text-[11px] text-slate-400">Total Genomic Hits</div>
              <div className="text-lg font-bold text-white font-mono">{scanResults.total_hits}</div>
            </div>
            <div className="bg-slate-950/80 p-3 rounded-lg border border-red-500/30">
              <div className="text-[11px] text-red-400">Critical Blocks</div>
              <div className="text-lg font-bold text-red-400 font-mono">{scanResults.critical_blocks}</div>
            </div>
            <div className="bg-slate-950/80 p-3 rounded-lg border border-orange-500/30">
              <div className="text-[11px] text-orange-400">High Risk (Exonic)</div>
              <div className="text-lg font-bold text-orange-400 font-mono">{scanResults.high_risk_count}</div>
            </div>
            <div className="bg-slate-950/80 p-3 rounded-lg border border-amber-500/30">
              <div className="text-[11px] text-amber-400">Moderate (Intronic)</div>
              <div className="text-lg font-bold text-amber-400 font-mono">{scanResults.moderate_risk_count}</div>
            </div>
            <div className="bg-slate-950/80 p-3 rounded-lg border border-emerald-500/30">
              <div className="text-[11px] text-emerald-400">Low Risk (Intergenic)</div>
              <div className="text-lg font-bold text-emerald-400 font-mono">{scanResults.low_risk_count}</div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400 mr-1" />
              <button
                onClick={() => setFilter('all')}
                className={`px-2.5 py-1 rounded text-xs transition-colors ${
                  filter === 'all' ? 'bg-indigo-600 text-white font-medium' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                All Hits ({hits.length})
              </button>
              <button
                onClick={() => setFilter('critical')}
                className={`px-2.5 py-1 rounded text-xs transition-colors ${
                  filter === 'critical' ? 'bg-red-600 text-white font-medium' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Critical Blocked ({scanResults.critical_blocks})
              </button>
              <button
                onClick={() => setFilter('tumor_suppressors')}
                className={`px-2.5 py-1 rounded text-xs transition-colors ${
                  filter === 'tumor_suppressors' ? 'bg-amber-600 text-white font-medium' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Tumor Suppressors
              </button>
              <button
                onClick={() => setFilter('exonic')}
                className={`px-2.5 py-1 rounded text-xs transition-colors ${
                  filter === 'exonic' ? 'bg-purple-600 text-white font-medium' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Exonic Only
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-lg border border-slate-800 max-h-[380px] overflow-y-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 sticky top-0 z-10">
                <tr>
                  <th className="p-2.5">Chr & Pos</th>
                  <th className="p-2.5">Strand</th>
                  <th className="p-2.5">Aligned Sequence</th>
                  <th className="p-2.5">MM</th>
                  <th className="p-2.5">Gene / Region</th>
                  <th className="p-2.5">Feature</th>
                  <th className="p-2.5">CFD Score</th>
                  <th className="p-2.5">Safety Status</th>
                  <th className="p-2.5 text-right">UCSC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-900/40 font-sans">
                {filteredHits.map(hit => (
                  <tr 
                    key={hit.hit_id}
                    className={`hover:bg-slate-800/50 transition-colors ${
                      hit.risk_level === 'CRITICAL_BLOCK' ? 'bg-red-950/20' : ''
                    }`}
                  >
                    <td className="p-2.5 font-mono text-slate-300 whitespace-nowrap">
                      {hit.chromosome}:{hit.position.toLocaleString()}
                    </td>
                    <td className="p-2.5 font-mono text-slate-400">{hit.strand}</td>
                    <td className="p-2.5 font-mono text-xs text-indigo-300 tracking-wider">
                      {hit.aligned_sequence}
                    </td>
                    <td className="p-2.5 font-mono font-bold text-center">
                      <span className={`px-1.5 py-0.5 rounded ${
                        hit.mismatch_count === 0 ? 'bg-emerald-500/20 text-emerald-400' :
                        hit.mismatch_count === 1 ? 'bg-red-500/20 text-red-400' :
                        hit.mismatch_count === 2 ? 'bg-amber-500/20 text-amber-400' :
                        'bg-slate-800 text-slate-400'
                      }`}>
                        {hit.mismatch_count}
                      </span>
                    </td>
                    <td className="p-2.5 font-semibold text-slate-200">
                      {hit.gene_name}
                      {hit.is_tumor_suppressor && (
                        <span className="ml-1.5 px-1 py-0.2 rounded text-[10px] bg-red-500/20 text-red-400 border border-red-500/30">
                          TSG
                        </span>
                      )}
                    </td>
                    <td className="p-2.5 text-slate-400">{hit.feature_type}</td>
                    <td className="p-2.5 font-mono font-medium text-slate-300">
                      {hit.cfd_score.toFixed(3)}
                    </td>
                    <td className="p-2.5 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-medium border ${
                        hit.risk_level === 'CRITICAL_BLOCK' ? 'bg-red-500/20 text-red-400 border-red-500/40 font-bold' :
                        hit.risk_level === 'HIGH_RISK' ? 'bg-orange-500/20 text-orange-400 border-orange-500/40' :
                        hit.risk_level === 'MODERATE' ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' :
                        hit.risk_level === 'ON_TARGET' ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/40' :
                        'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                      }`}>
                        {hit.risk_badge}
                      </span>
                    </td>
                    <td className="p-2.5 text-right whitespace-nowrap">
                      <a
                        href={`https://genome.ucsc.edu/cgi-bin/hgTracks?db=hg38&position=${hit.chromosome}%3A${hit.position-200}-${hit.position+200}`}
                        target="_blank"
                        rel="noreferrer"
                        title="Inspect on UCSC Genome Browser"
                        className="text-slate-400 hover:text-indigo-400 inline-flex items-center gap-1"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
