import React from 'react';
import { Dna, ShieldCheck, FileCheck, Layers, Sparkles, AlertCircle, TestTube, Target } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, selectedSample, statusInfo, onRetryConnection, onToggleCopilot }) {
  const navItems = [
    { id: 'sample', label: '1. Sample & Locus Intake', icon: Layers },
    { id: 'crispr', label: '2. Personalized CRISPR Design', icon: Dna },
    { id: 'wetlab', label: '3. Wet-Lab & Delivery Studio', icon: TestTube },
    { id: 'regeneration', label: '4. Stem Cell & Regeneration', icon: Sparkles },
    { id: 'report', label: '5. Research Dossier & Audit', icon: ShieldCheck },
    { id: 'onco-crispr', label: '6. OncoCRISPR Designer', icon: Target, oncology: true },
    { id: 'onco-viral', label: '7. OncoViral Therapy Planner', icon: Dna, oncology: true },
  ];

  return (
    <header className="border-b border-slate-800 bg-[#0d1322]/90 backdrop-blur-md sticky top-0 z-50">
      {/* Top Compliance Bar */}
      <div className="bg-amber-950/40 border-b border-amber-800/40 px-4 py-1.5 text-xs text-amber-300 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="font-semibold uppercase tracking-wider">Research Environment:</span>
          <span>Not for clinical or diagnostic use. Human expert review & wet-lab validation required for all candidate edits.</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1 bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 px-2 py-0.5 rounded text-[11px] font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            DURC SHIELD ACTIVE
          </span>
          <span className="inline-flex items-center gap-1 bg-slate-800/90 text-slate-300 border border-slate-700 px-2 py-0.5 rounded text-[11px] font-mono">
            AUDIT TRAIL: ON
          </span>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 ring-1 ring-white/20">
              <Dna className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-extrabold tracking-tight text-white">Genomic Research Copilot</span>
                <span className="bg-cyan-950 text-cyan-400 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border border-cyan-800">
                  v2.4
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                CRISPR Guide Engineering • Variant Pathogenicity • Organ Regeneration
              </p>
            </div>
          </div>

          {/* Backend Connection & Target Sample Badges */}
          <div className="flex items-center gap-3">
            {/* Live Backend Connection Badge */}
            {statusInfo ? (
              <div className="flex items-center gap-1.5 bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 px-2.5 py-1 rounded-lg text-xs font-mono">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="hidden sm:inline font-semibold">FastAPI :8000</span>
                <span className="text-[10px] bg-emerald-900/60 px-1 py-0.5 rounded border border-emerald-700/40 text-emerald-200">
                  SQLite DB
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 bg-rose-950/80 border border-rose-800 text-rose-300 px-2.5 py-1 rounded-lg text-xs font-mono">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                <span>Offline Cache</span>
                {onRetryConnection && (
                  <button
                    onClick={onRetryConnection}
                    className="bg-rose-800 hover:bg-rose-700 text-white px-1.5 py-0.5 rounded text-[10px] ml-1 transition-all"
                    title="Attempt connection to http://127.0.0.1:8000"
                  >
                    Retry
                  </button>
                )}
              </div>
            )}

            {/* Current Active Sample Badge */}
            {selectedSample && (
              <div className="hidden md:flex items-center gap-2 bg-slate-900/80 border border-slate-800 px-3 py-1.5 rounded-lg text-xs">
                <span className="text-slate-400">Target:</span>
                <span className="font-mono font-bold text-cyan-400">{selectedSample.sample_id}</span>
                <span className="bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-mono text-[10px]">
                  {selectedSample.target_gene}
                </span>
              </div>
            )}
            
            <button
              onClick={onToggleCopilot}
              className="ml-2 bg-cyan-950/50 hover:bg-cyan-900 border border-cyan-800/80 text-cyan-300 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
            >
              <FileCheck className="w-4 h-4" /> AI Copilot
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 overflow-x-auto pb-2 sm:pb-0 scrollbar-none">
          {navItems.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const isOncology = tab.oncology;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-medium rounded-t-lg transition-all border-b-2 whitespace-nowrap ${
                  isActive && isOncology
                    ? 'border-rose-400 text-rose-300 bg-rose-950/20'
                    : isActive
                    ? 'border-cyan-400 text-cyan-400 bg-cyan-950/20'
                    : isOncology
                    ? 'border-transparent text-rose-500 hover:text-rose-300 hover:bg-rose-950/20'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive && isOncology ? 'text-rose-400' : isActive ? 'text-cyan-400' : isOncology ? 'text-rose-600' : 'text-slate-500'}`} />
                {tab.label}
                {isOncology && (
                  <span className="text-[9px] px-1 py-0.5 bg-rose-950 border border-rose-800 text-rose-400 rounded font-bold leading-none">ONCO</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}
