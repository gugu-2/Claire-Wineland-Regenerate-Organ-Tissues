import React, { useState } from 'react';
import {
  Dna,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  Zap,
  Activity,
  Filter,
  BarChart3,
  Layers,
  ArrowRight,
  TestTube,
  RefreshCw
} from 'lucide-react';
import LocusTrackViewer from './LocusTrackViewer';

export default function CrisprDesignerView({
  targetGene,
  candidates,
  selectedSample,
  onOpenReviewModal,
  selectedNuclease = 'SpCas9_NGG',
  onSelectNuclease,
  onTransferToWetLab,
  onProceedToWetLab,
  onRerunScanner,
  isProcessing
}) {
  const [selectedGuide, setSelectedGuide] = useState(candidates?.[0] || null);
  const [sortBy, setSortBy] = useState('efficiency'); // 'efficiency' | 'cfd'
  const [modalityFilter, setModalityFilter] = useState('all'); // 'all' | 'cbe' | 'abe'

  // Sync selected guide when candidates change
  React.useEffect(() => {
    if (candidates && candidates.length > 0) {
      // Keep selected or pick first
      const stillThere = candidates.find(c => c.guide_id === selectedGuide?.guide_id);
      setSelectedGuide(stillThere || candidates[0]);
    } else {
      setSelectedGuide(null);
    }
  }, [candidates]);

  // Filter candidates based on modality
  const filteredCandidates = (candidates || []).filter(c => {
    if (modalityFilter === 'cbe') {
      return c.base_editing_cbe?.target_count_in_window > 0;
    }
    if (modalityFilter === 'abe') {
      return c.base_editing_abe?.target_count_in_window > 0;
    }
    return true;
  });

  const sortedCandidates = [...filteredCandidates].sort((a, b) => {
    if (sortBy === 'efficiency') {
      return b.on_target_efficiency_patient - a.on_target_efficiency_patient;
    } else {
      return b.off_target_cfd_score - a.off_target_cfd_score;
    }
  });

  const nucleases = [
    { id: 'SpCas9_NGG', label: 'SpCas9 (NGG)', desc: 'Standard 20nt, 3\' PAM' },
    { id: 'SaCas9_NNGRRT', label: 'SaCas9 (NNGRRT)', desc: 'AAV-deliverable 21nt' },
    { id: 'Cas12a_TTTV', label: 'Cas12a (TTTV)', desc: '5\' PAM, 23nt staggered' }
  ];

  if (!candidates || candidates.length === 0) {
    if (isProcessing) {
        return (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 shadow-xl text-center space-y-4">
             <div className="w-10 h-10 rounded-xl bg-cyan-600/20 border border-cyan-500/40 flex items-center justify-center mx-auto animate-spin">
                <span className="w-4 h-4 rounded-full border-2 border-cyan-400 border-t-transparent"></span>
             </div>
             <h2 className="text-lg font-bold text-white">Designing Personalized Guides...</h2>
             <p className="text-sm text-slate-400 max-w-md mx-auto">Running biophysical models and off-target CFD matrices against the patient's sequence.</p>
          </div>
        );
    }
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 shadow-xl text-center space-y-4">
         <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-4">
            <Filter className="w-8 h-8 text-slate-500" />
         </div>
         <h2 className="text-lg font-bold text-white">No CRISPR Guides Designed Yet</h2>
         <p className="text-sm text-slate-400 max-w-md mx-auto">Please go back to the Sample Intake tab, select a sample or upload a VCF, and parse the locus to begin.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 relative">
      {isProcessing && (
        <div className="absolute inset-0 z-50 bg-[#090d16]/60 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-cyan-500/30">
           <div className="bg-slate-900 border border-slate-700 p-6 rounded-xl shadow-2xl text-center space-y-3">
               <div className="w-8 h-8 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin mx-auto"></div>
               <p className="text-sm font-bold text-cyan-400">Re-scanning Locus...</p>
           </div>
        </div>
      )}
      {/* Header Banner */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 bg-indigo-950/60 text-indigo-400 border border-indigo-800/60 px-2.5 py-1 rounded-full text-xs font-mono mb-3">
            <Dna className="w-3.5 h-3.5" /> Module 2: Personalized CRISPR Guide RNA Design & CFD Scoring
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Target Locus: {targetGene} &bull; Sample: {selectedSample?.sample_id}
          </h2>
          <p className="text-sm text-slate-300 mt-2 leading-relaxed">
            Candidate gRNAs evaluated with empirical <strong>Doench Azimuth 2.0</strong> on-target biophysical features,
            <strong> 80-element Cleavage Frequency Determination (CFD)</strong> mismatch matrix, and <strong>Base Editing (CBE/ABE)</strong> window analysis.
          </p>
        </div>
      </div>

      {/* Control Bar: Nuclease Selector & Modality Filters */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Nuclease Platform Tabs */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-xs font-semibold text-slate-400 shrink-0">Nuclease:</span>
          <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 w-full md:w-auto">
            {nucleases.map(n => (
              <button
                key={n.id}
                onClick={() => onSelectNuclease && onSelectNuclease(n.id)}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                  selectedNuclease === n.id
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {n.label}
              </button>
            ))}
          </div>
        </div>

        {/* Modality Filter & Re-run Action */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end flex-wrap">
          <span className="text-xs font-semibold text-slate-400 shrink-0">Modality:</span>
          <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setModalityFilter('all')}
              className={`px-2.5 py-1 rounded text-xs transition-all ${
                modalityFilter === 'all' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All Nucleases
            </button>
            <button
              onClick={() => setModalityFilter('cbe')}
              className={`px-2.5 py-1 rounded text-xs transition-all ${
                modalityFilter === 'cbe' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              CBE (C&rarr;T)
            </button>
            <button
              onClick={() => setModalityFilter('abe')}
              className={`px-2.5 py-1 rounded text-xs transition-all ${
                modalityFilter === 'abe' ? 'bg-amber-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              ABE (A&rarr;G)
            </button>
          </div>

          {onRerunScanner && (
            <button
              onClick={onRerunScanner}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ml-2"
              title="Re-run biophysical scanning and Azimuth calculations"
            >
              <RefreshCw className="w-3 h-3 text-cyan-400" />
              <span>Re-scan Locus</span>
            </button>
          )}
        </div>
      </div>

      {/* Interactive Genomic Locus Track Viewer */}
      <LocusTrackViewer
        geneSymbol={targetGene}
        sequenceLength={targetGene === 'HBB' ? 444 : (targetGene === 'CCR5' ? 1059 : 800)}
        variants={selectedSample?.variants || []}
        candidates={sortedCandidates}
        selectedGuide={selectedGuide}
        onSelectGuide={setSelectedGuide}
        coordinates={targetGene === 'CCR5' ? 'chr3:46,370,000-46,375,000' : (targetGene === 'HBB' ? 'chr11:5,225,000-5,227,500' : 'chr6:31,164,000-31,170,000')}
      />
      <div className="flex justify-end mt-1 px-2">
        <a 
          href={`https://genome.ucsc.edu/cgi-bin/hgTracks?db=hg38&position=${targetGene === 'CCR5' ? 'chr3:46370000-46375000' : (targetGene === 'HBB' ? 'chr11:5225000-5227500' : targetGene)}`}
          target="_blank" 
          rel="noreferrer"
          className="text-[10px] text-cyan-500 hover:text-cyan-400 font-medium inline-flex items-center gap-1 bg-slate-900/50 px-2 py-1 rounded border border-slate-800"
        >
          <ExternalLink className="w-3 h-3" /> View in UCSC Genome Browser
        </a>
      </div>

      {/* Candidate Grid & Detail View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Candidate Ranking List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3 mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Personalized Candidate sgRNA Ranking ({sortedCandidates.length} Shown)</span>
              </h3>
            </div>

            {/* Candidates Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-mono">
                    <th className="py-2.5 px-3">Guide Identifier</th>
                    <th className="py-2.5 px-3">Protospacer + PAM</th>
                    <th 
                      className="py-2.5 px-3 text-center cursor-pointer hover:text-white transition-colors"
                      onClick={() => setSortBy('efficiency')}
                    >
                      Patient Cleavage {sortBy === 'efficiency' ? '▼' : ''}
                    </th>
                    <th 
                      className="py-2.5 px-3 text-center cursor-pointer hover:text-white transition-colors"
                      onClick={() => setSortBy('cfd')}
                    >
                      CFD Specificity {sortBy === 'cfd' ? '▼' : ''}
                    </th>
                    <th className="py-2.5 px-3 text-center">Base Editing Window</th>
                    <th className="py-2.5 px-3 text-center">Human Signoff</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {sortedCandidates.map((c) => {
                    const isSelected = selectedGuide?.guide_id === c.guide_id;
                    const isDiff = c.is_personalized_different;
                    const cbeOk = c.base_editing_cbe?.target_count_in_window > 0;
                    const abeOk = c.base_editing_abe?.target_count_in_window > 0;

                    return (
                      <tr
                        key={c.guide_id}
                        onClick={() => setSelectedGuide(c)}
                        className={`cursor-pointer transition-all ${
                          isSelected ? 'bg-cyan-950/40 border-l-4 border-l-cyan-400' : 'hover:bg-slate-800/40'
                        }`}
                      >
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-200">{c.guide_id}</div>
                          <div className="text-[10px] text-slate-500 font-sans">{c.target_domain}</div>
                          {isDiff && (
                            <span className="inline-block mt-1 bg-rose-950/80 text-rose-300 border border-rose-800/60 px-1.5 py-0.5 rounded text-[9px] font-sans font-semibold">
                              PERSONAL SNP COLLISION
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <span className="text-slate-200">{c.patient_guide_20nt}</span>
                          <span className="text-cyan-400 font-bold ml-1.5">[{c.pam_sequence}]</span>
                          <div className="text-[10px] text-slate-500 font-sans">
                            Strand: {c.strand} &bull; GC: {c.gc_content_pct}%
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`font-bold text-sm ${
                            c.on_target_efficiency_patient >= 0.70 ? 'text-emerald-400' :
                            c.on_target_efficiency_patient >= 0.40 ? 'text-amber-400' : 'text-rose-400'
                          }`}>
                            {intToPercent(c.on_target_efficiency_patient)}
                          </span>
                          <div className="text-[10px] text-slate-500">
                            CI: [{c.confidence_interval_95[0]}, {c.confidence_interval_95[1]}]
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="font-bold text-slate-200">{c.off_target_cfd_score}</span>
                          <div className={`text-[10px] font-semibold ${
                            c.off_target_risk_level === 'LOW_RISK' ? 'text-emerald-400' :
                            c.off_target_risk_level === 'MODERATE_RISK' ? 'text-amber-400' : 'text-rose-400'
                          }`}>
                            {c.off_target_risk_level}
                          </div>
                          {c.cas_offinder_status === 'COMPLETED' ? (
                            <div className="mt-1 text-[9px] text-slate-400 font-sans leading-tight">
                              <div>0-MM: {c.genome_wide_off_targets_0_mismatch}</div>
                              <div>1-MM: {c.genome_wide_off_targets_1_mismatch}</div>
                              <div>2-MM: {c.genome_wide_off_targets_2_mismatch}</div>
                            </div>
                          ) : (
                            <div className="mt-1 text-[9px] text-amber-500/80 font-sans">
                              Cas-OFFinder Scan Running...
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center font-sans">
                          <div className="flex items-center justify-center gap-1">
                            {cbeOk ? (
                              <span className="bg-emerald-950 text-emerald-300 border border-emerald-800 text-[9px] px-1 py-0.5 rounded font-mono">
                                CBE {c.base_editing_cbe.window_sequence}
                              </span>
                            ) : null}
                            {abeOk ? (
                              <span className="bg-amber-950 text-amber-300 border border-amber-800 text-[9px] px-1 py-0.5 rounded font-mono">
                                ABE {c.base_editing_abe.window_sequence}
                              </span>
                            ) : null}
                            {!cbeOk && !abeOk && (
                              <span className="text-slate-500 text-[10px]">DSB Only</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenReviewModal(c);
                            }}
                            className={`px-2.5 py-1 rounded text-[10px] font-sans font-semibold inline-flex items-center gap-1 transition-all hover:scale-105 active:scale-95 shadow-sm ${
                              c.expert_review_status?.includes('APPROVED')
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800 hover:bg-emerald-900'
                                : c.expert_review_status === 'EXPERT_REJECTED'
                                ? 'bg-rose-950 text-rose-300 border border-rose-800 hover:bg-rose-900'
                                : 'bg-amber-950/80 text-amber-300 border border-amber-700/80 hover:bg-amber-900/60'
                            }`}
                            title="Click to submit IRB / Preclinical Human Expert signoff"
                          >
                            <UserCheck className="w-3 h-3" />
                            {c.expert_review_status || 'Sign Off'}
                          </button>
                        </td>
                        <td className="py-3 px-3 text-right">
                          {onTransferToWetLab && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onTransferToWetLab(c);
                              }}
                              className="bg-indigo-950/80 hover:bg-indigo-900 text-indigo-300 border border-indigo-700 px-2 py-1 rounded text-[10px] font-mono transition-all inline-flex items-center gap-1 shadow-sm"
                              title="Send guide to Wet-Lab Studio for primers and delivery vectors"
                            >
                              <span>Wet-Lab</span>
                              <ArrowRight className="w-2.5 h-2.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Selected Guide Deep Dive */}
        <div className="lg:col-span-1 space-y-4">
          {selectedGuide ? (
            <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="font-mono text-xs font-bold text-cyan-400">{selectedGuide.guide_id}</span>
                <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
                  {selectedGuide.strand} Strand
                </span>
              </div>

              {/* Personal Variation Alert Banner */}
              {selectedGuide.is_personalized_different ? (
                <div className="bg-rose-950/40 border border-rose-800/60 rounded-lg p-3 text-xs text-rose-200">
                  <div className="flex items-center gap-1.5 font-bold text-rose-400 mb-1">
                    <ShieldAlert className="w-4 h-4" /> Personal Genome Collision Detected
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    {selectedGuide.mutation_alert}
                  </p>
                  <div className="mt-2 pt-2 border-t border-rose-800/40 grid grid-cols-2 text-[11px]">
                    <div>
                      <span className="text-slate-400">Ref Cleavage:</span>
                      <p className="font-mono font-bold text-slate-200">
                        {intToPercent(selectedGuide.on_target_efficiency_reference)}
                      </p>
                    </div>
                    <div>
                      <span className="text-rose-300 font-semibold">Patient Cleavage:</span>
                      <p className="font-mono font-bold text-rose-400">
                        {intToPercent(selectedGuide.on_target_efficiency_patient)}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-emerald-950/30 border border-emerald-800/40 rounded-lg p-3 text-xs text-emerald-200">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-400 mb-1">
                    <CheckCircle2 className="w-4 h-4" /> Sequence Preserved in Patient
                  </div>
                  <p className="text-[11px]">
                    No personal variants disrupt this protospacer or PAM site in {selectedSample?.sample_id}.
                  </p>
                </div>
              )}

              {/* Azimuth 2.0 Feature Breakdown */}
              {selectedGuide.azimuth_feature_breakdown && (
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between font-semibold text-slate-300 text-[11px]">
                    <span className="flex items-center gap-1">
                      <BarChart3 className="w-3.5 h-3.5 text-indigo-400" /> 
                      {selectedNuclease === 'SpCas9_NGG' ? 'Azimuth 2.0 Model Features:' : 'Model Features (Proxy Mapping):'}
                    </span>
                    <span className="text-cyan-400 font-mono font-bold">
                      {intToPercent(selectedGuide.on_target_efficiency_patient)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-slate-400 pt-1">
                    <div>
                      Mono-preference: <span className="text-slate-200">{selectedGuide.azimuth_feature_breakdown.mono_nucleotide_preference || 0}</span>
                    </div>
                    <div>
                      GC adjustment: <span className="text-slate-200">{selectedGuide.azimuth_feature_breakdown.gc_adjustment || 0}</span>
                    </div>
                    <div>
                      Poly-T penalty: <span className={selectedGuide.azimuth_feature_breakdown.poly_t_penalty < 0 ? 'text-rose-400 font-bold' : 'text-slate-200'}>
                        {selectedGuide.azimuth_feature_breakdown.poly_t_penalty || 0}
                      </span>
                    </div>
                    <div>
                      Seed delta H: <span className="text-slate-200">{selectedGuide.azimuth_feature_breakdown.thermodynamic_seed_adjustment || 0}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Base Editing Window Breakdown */}
              {selectedGuide.base_editing_cbe && (
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-2 text-xs font-sans">
                  <span className="font-semibold text-slate-300 text-[11px] block">
                    Base Editing Window (Pos 4-8):
                  </span>
                  <div className="flex items-center justify-between font-mono text-[11px] bg-slate-900 p-1.5 rounded">
                    <span className="text-slate-400">Window: <strong>{selectedGuide.base_editing_cbe.window_sequence}</strong></span>
                    <span className="text-emerald-400 font-bold">CBE C&rarr;T</span>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Status: <strong className="text-slate-300">{selectedGuide.base_editing_cbe.base_editing_verdict}</strong>
                    {selectedGuide.base_editing_cbe.bystander_mutation_risk ? ' (Bystander C sites flagged)' : ' (Clean single edit)'}
                  </p>
                </div>
              )}

              {/* Prime Editing Evaluation (pegRNA) */}
              {selectedGuide.prime_editing && selectedGuide.prime_editing.is_feasible && (
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-2 text-xs font-sans">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-300 text-[11px]">
                      Prime Editing (pegRNA) Architecture:
                    </span>
                    <span className="text-purple-400 font-mono font-bold">
                      {selectedGuide.prime_editing.predicted_pe_efficiency_pct}% Eff.
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <div className="bg-slate-900 p-1.5 rounded border border-slate-800 text-[10px]">
                      <span className="text-slate-500 block mb-0.5">PBS ({selectedGuide.prime_editing.pbs_length_nt}nt):</span>
                      <span className="font-mono text-cyan-300 break-all">{selectedGuide.prime_editing.pbs_sequence}</span>
                    </div>
                    <div className="bg-slate-900 p-1.5 rounded border border-slate-800 text-[10px]">
                      <span className="text-slate-500 block mb-0.5">RT Template ({selectedGuide.prime_editing.rt_template_length_nt}nt):</span>
                      <span className="font-mono text-fuchsia-300 break-all">{selectedGuide.prime_editing.rt_template_sequence}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Guide Sequence Details */}
              <div className="space-y-1.5 text-xs">
                <span className="text-slate-400 font-medium">Protospacer & PAM:</span>
                <div className="bg-slate-950 border border-slate-800 rounded p-2.5 font-mono text-xs text-slate-200 break-all">
                  <span>{selectedGuide.patient_guide_20nt}</span>
                  <span className="text-cyan-400 font-bold bg-cyan-950/60 px-1 py-0.5 rounded ml-1">
                    {selectedGuide.pam_sequence}
                  </span>
                </div>
              </div>

              {/* Rationale & Notes */}
              <div className="text-xs text-slate-400 bg-slate-950/40 p-3 rounded-lg border border-slate-800/80">
                <span className="font-semibold text-slate-300 block mb-1">Functional Domain Target:</span>
                {selectedGuide.notes}
              </div>

              {/* Human Expert Review Gate Action */}
              <div className="pt-2">
                <button
                  onClick={() => onOpenReviewModal(selectedGuide)}
                  className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-2.5 rounded-lg text-xs transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2"
                >
                  <UserCheck className="w-4 h-4" /> Open Human Expert Review Gate
                </button>

                {onTransferToWetLab && (
                  <button
                    onClick={() => {
                      if (!selectedGuide.expert_review_status?.includes('APPROVED')) {
                        alert("Expert Review must be APPROVED before transferring to Wet-Lab.");
                        return;
                      }
                      onTransferToWetLab(selectedGuide);
                    }}
                    disabled={!selectedGuide.expert_review_status?.includes('APPROVED')}
                    className={`w-full mt-2 font-semibold py-2 rounded-lg text-xs transition-all flex items-center justify-center gap-1.5 ${
                      selectedGuide.expert_review_status?.includes('APPROVED')
                        ? 'bg-indigo-950 hover:bg-indigo-900 text-indigo-300 border border-indigo-700'
                        : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                    }`}
                  >
                    <TestTube className="w-3.5 h-3.5" /> 
                    {selectedGuide.expert_review_status?.includes('APPROVED') ? 'Send Candidate to Wet-Lab Studio' : 'Sign-Off Required for Wet-Lab'}
                  </button>
                )}

                <p className="text-[10px] text-slate-500 text-center mt-2">
                  Pre-validation sign-off required prior to experimental synthesis.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-6 text-center text-xs text-slate-400">
              Select a candidate guide to view detailed personal metrics and submit an expert sign-off.
            </div>
          )}
        </div>
      </div>

      {/* Bottom Step-by-Step Navigation Bar */}
      {onProceedToWetLab && (
        <div className="flex justify-end pt-2">
          <button
            onClick={onProceedToWetLab}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-5 py-2.5 rounded-lg text-xs font-bold transition-all shadow-lg shadow-indigo-600/20 flex items-center gap-2"
          >
            Proceed to Wet-Lab & Delivery Studio <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

function intToPercent(decimalVal) {
  return `${Math.round((decimalVal || 0) * 100)}%`;
}
