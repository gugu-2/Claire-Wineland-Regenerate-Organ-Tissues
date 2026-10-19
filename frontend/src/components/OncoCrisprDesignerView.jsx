import React, { useState } from 'react';
import { api } from '../services/api';

// ── KNOWN DRIVER MUTATION SEQUENCES (for demo/quick-fill) ───────────────────
const DRIVER_MUTATION_PRESETS = [
  {
    label: 'KRAS G12D — Pancreatic / Colorectal / NSCLC',
    gene: 'KRAS',
    mutationName: 'KRAS G12D',
    oncokbTier: '2A',
    cosmicCount: 41247,
    fdaTherapy: 'No approved KRAS G12D inhibitor (Sotorasib/Adagrasib are G12C-specific)',
    tumorSeq:    'ATGACTGAATATAAACTTGTGGTAGTTGGAGCTGGTGGCGTAGGCAAGAGTGCCTTGACGATACAG',
    wildtypeSeq: 'ATGACTGAATATAAACTTGTGGTAGTTGGAGCTGCTGGCGTAGGCAAGAGTGCCTTGACGATACAG',
  },
  {
    label: 'BRAF V600E — Melanoma / Colorectal / Thyroid',
    gene: 'BRAF',
    mutationName: 'BRAF V600E',
    oncokbTier: '1',
    cosmicCount: 52341,
    fdaTherapy: 'Vemurafenib, Dabrafenib + Trametinib (FDA approved)',
    tumorSeq:    'CTAGTAACTCAGCAGCATCTCAGGGCCAAAAATTTAATCAGTGGTTCTGAATCTGCTTCAGTGAAACAAAAGGTGATGAGTTGTGTCCTGAGGAGCTTGACCTGAAGAATGGGCAGAATGTAAACAAGTAA',
    wildtypeSeq: 'CTAGTAACTCAGCAGCATCTCAGGGCCAAAAATTTAATCAGTGGTTCTGAATCTGCTTCAGTGAAACAAAAGGTGATGAGTTGTGTCCTGAGGAGCTTGACTTGAAGAATGGGCAGAATGTAAACAAGTAA',
  },
  {
    label: 'EGFR L858R — NSCLC Adenocarcinoma',
    gene: 'EGFR',
    mutationName: 'EGFR L858R',
    oncokbTier: '1',
    cosmicCount: 28941,
    fdaTherapy: 'Osimertinib, Erlotinib, Gefitinib, Afatinib (all FDA approved)',
    tumorSeq:    'TATCAAGGGAATTTGGAGAAGCAATGAGCTGGCAGCCGGTCCTGGTGATGCGGAGGATGCGGAGGA',
    wildtypeSeq: 'TATCAAGGGAATTTGGAGAAGCAATGAGCTGGCAGCCGGTCCTGGTGATGCGGAGGATGCGGAGGA',
  },
];

const DISCRIMINATION_COLOR = { EXCELLENT: 'emerald', GOOD: 'emerald', MODERATE: 'amber', INSUFFICIENT: 'rose' };
const TIER_BADGE = { '1': 'bg-emerald-800 text-emerald-200', '2A': 'bg-blue-800 text-blue-200', '2B': 'bg-sky-800 text-sky-200', '3A': 'bg-slate-700 text-slate-300' };

export default function OncoCrisprDesignerView({ somaticProfile }) {
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [customGene, setCustomGene] = useState('');
  const [customMutation, setCustomMutation] = useState('');
  const [tumorSeq, setTumorSeq] = useState('');
  const [wildtypeSeq, setWildtypeSeq] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeGuide, setActiveGuide] = useState(null);

  const applyPreset = (preset) => {
    setSelectedPreset(preset);
    setCustomGene(preset.gene);
    setCustomMutation(preset.mutationName);
    setTumorSeq(preset.tumorSeq);
    setWildtypeSeq(preset.wildtypeSeq);
    setResults(null);
    setActiveGuide(null);
  };

  const runDesign = async () => {
    const gene = selectedPreset ? selectedPreset.gene : customGene.trim();
    const mutation = selectedPreset ? selectedPreset.mutationName : customMutation.trim();
    const tSeq = tumorSeq.trim().toUpperCase();
    const wSeq = wildtypeSeq.trim().toUpperCase();

    if (!gene || !mutation || !tSeq || !wSeq) {
      setError('Please fill all fields or select a preset driver mutation.');
      return;
    }
    if (tSeq.length < 40 || wSeq.length < 40) {
      setError('Sequences must be at least 40 bp long to scan for guide candidates.');
      return;
    }

    setError('');
    setLoading(true);
    setResults(null);
    setActiveGuide(null);
    try {
      const data = await api.designAlleleSpecificGuides({
        tumor_sample_id: somaticProfile?.tumor_sample_id || 'DEMO_TUMOR',
        target_mutation_name: mutation,
        target_gene: gene,
        tumor_sequence: tSeq,
        wildtype_sequence: wSeq,
        max_guides: 6,
      });
      setResults(data);
      if (data.all_candidates?.length > 0) setActiveGuide(data.all_candidates[0]);
    } catch (e) {
      setError('Design failed: ' + (e.message || 'Network error'));
    } finally {
      setLoading(false);
    }
  };

  const DiscriminationBadge = ({ disc }) => {
    const color = DISCRIMINATION_COLOR[disc?.verdict] || 'slate';
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-${color}-900/60 text-${color}-300 border border-${color}-700`}>
        {disc?.verdict} — {disc?.discrimination_ratio}×
      </span>
    );
  };

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 bg-slate-950 min-h-full text-slate-200">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            🎯 OncoCRISPR Designer
            <span className="text-xs font-normal px-2 py-0.5 bg-rose-900/50 text-rose-300 border border-rose-700 rounded">ONCOLOGY MODE</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Designs allele-specific CRISPR guides that cleave cancer driver mutations while sparing the healthy wildtype allele.
            Minimum <span className="text-amber-400 font-semibold">10× discrimination ratio</span> required for safety threshold.
          </p>
        </div>
      </div>

      {/* Oncology Safety Banner */}
      <div className="bg-rose-950/40 border border-rose-700 rounded-lg p-3 text-xs text-rose-300 flex items-start gap-2">
        <span className="text-lg">⚠️</span>
        <span>
          <strong>Oncology Research Mode:</strong> All designs target somatic cancer-specific mutations.
          Validation required in matched tumor + normal cell lines before wet-lab progression.
          IBC pre-approval mandatory for any in vivo use.
        </span>
      </div>

      {/* TMB/MSI Dashboard (if somatic profile passed in) */}
      {somaticProfile && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'TMB Score', value: somaticProfile.tumor_genomics_summary?.tumor_mutational_burden?.tmb_score ? `${somaticProfile.tumor_genomics_summary.tumor_mutational_burden.tmb_score} mut/Mb` : '—', color: 'blue' },
            { label: 'TMB Class', value: somaticProfile.tumor_genomics_summary?.tumor_mutational_burden?.tmb_classification || '—', color: 'blue' },
            { label: 'MSI Status', value: somaticProfile.tumor_genomics_summary?.microsatellite_instability?.msi_status || '—', color: 'purple' },
            { label: 'Safe CRISPR Targets', value: somaticProfile.somatic_call_summary?.safe_crispr_targets ?? '—', color: 'emerald' },
          ].map(({ label, value, color }) => (
            <div key={label} className={`bg-${color}-950/30 border border-${color}-800 rounded-lg p-3 text-center`}>
              <div className={`text-lg font-bold text-${color}-300`}>{value}</div>
              <div className="text-xs text-slate-400 mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Input Panel */}
        <div className="flex flex-col gap-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
            <h2 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
              <span>🔬</span> Driver Mutation Presets
            </h2>
            <div className="flex flex-col gap-2">
              {DRIVER_MUTATION_PRESETS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => applyPreset(p)}
                  className={`text-left px-3 py-2 rounded-lg text-xs border transition-all ${
                    selectedPreset?.mutationName === p.mutationName
                      ? 'bg-blue-900/50 border-blue-500 text-blue-200'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500'
                  }`}
                >
                  <div className="font-semibold">{p.mutationName}</div>
                  <div className="text-slate-400 truncate">{p.label.split(' — ')[1]}</div>
                  <div className="flex gap-1 mt-1">
                    <span className={`px-1.5 py-0.5 rounded text-xs ${TIER_BADGE[p.oncokbTier] || 'bg-slate-700'}`}>OncoKB Tier {p.oncokbTier}</span>
                    <span className="px-1.5 py-0.5 rounded text-xs bg-slate-700 text-slate-300">COSMIC: {p.cosmicCount.toLocaleString()}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2"><span>✏️</span> Custom Input</h2>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Gene Symbol</label>
                <input value={customGene} onChange={e => { setCustomGene(e.target.value); setSelectedPreset(null); }}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  placeholder="e.g. KRAS" />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Mutation Name</label>
                <input value={customMutation} onChange={e => { setCustomMutation(e.target.value); setSelectedPreset(null); }}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  placeholder="e.g. G12D" />
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Tumor Sequence (with somatic mutation)</label>
              <textarea value={tumorSeq} onChange={e => { setTumorSeq(e.target.value); setSelectedPreset(null); }}
                rows={3}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-xs font-mono text-emerald-300 placeholder-slate-500 focus:outline-none focus:border-emerald-500 resize-none"
                placeholder="ATGACTGAA... (min 40 bp around somatic mutation)" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Wildtype Sequence (matched normal)</label>
              <textarea value={wildtypeSeq} onChange={e => { setWildtypeSeq(e.target.value); setSelectedPreset(null); }}
                rows={3}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-xs font-mono text-slate-300 placeholder-slate-500 focus:outline-none focus:border-slate-500 resize-none"
                placeholder="ATGACTGAA... (same locus, no mutation)" />
            </div>
            {error && <div className="text-rose-400 text-xs bg-rose-950/30 border border-rose-800 rounded p-2">{error}</div>}
            <button onClick={runDesign} disabled={loading}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-400 text-white rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2">
              {loading ? <><span className="animate-spin">⚙️</span> Designing Allele-Specific Guides...</> : '🎯 Design OncoCRISPR Guides'}
            </button>
          </div>
        </div>

        {/* Right: Results Panel */}
        <div className="flex flex-col gap-4">
          {!results && !loading && (
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-8 text-center text-slate-400 flex flex-col items-center gap-3">
              <span className="text-4xl">🧬</span>
              <p className="text-sm">Select a driver mutation preset or enter custom sequences to design allele-specific CRISPR guides.</p>
              <p className="text-xs text-slate-500">Guides are designed to cut the tumor allele (e.g., KRAS G12D) while sparing the healthy wildtype.</p>
            </div>
          )}

          {loading && (
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-8 text-center flex flex-col items-center gap-3">
              <div className="animate-spin text-4xl">⚙️</div>
              <p className="text-sm text-blue-300">Scanning for allele-specific guides...</p>
              <p className="text-xs text-slate-400">Evaluating PAM sites, seed region mismatches, and discrimination ratios</p>
            </div>
          )}

          {results && (
            <div className="flex flex-col gap-3">
              {/* Summary */}
              <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-sm font-semibold text-white">Design Summary</h2>
                  <span className={`text-xs px-2 py-0.5 rounded border ${results.guides_passing_safety_threshold > 0 ? 'bg-emerald-900/50 border-emerald-700 text-emerald-300' : 'bg-rose-900/50 border-rose-700 text-rose-300'}`}>
                    {results.guides_passing_safety_threshold}/{results.total_guides_found} guides pass safety threshold
                  </span>
                </div>
                <p className="text-xs text-slate-300">{results.design_summary}</p>
              </div>

              {/* Guide Cards */}
              {results.all_candidates?.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {results.all_candidates.map((g, i) => (
                    <button key={g.guide_id}
                      onClick={() => setActiveGuide(activeGuide?.guide_id === g.guide_id ? null : g)}
                      className={`text-left bg-slate-900 border rounded-xl p-4 transition-all ${activeGuide?.guide_id === g.guide_id ? 'border-blue-500 bg-slate-800/80' : 'border-slate-700 hover:border-slate-500'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-400">#{i + 1}</span>
                          <span className="text-sm font-mono font-semibold text-white">{g.guide_id}</span>
                        </div>
                        <DiscriminationBadge disc={g.discrimination} />
                      </div>
                      <div className="font-mono text-xs text-emerald-300 bg-slate-800 rounded px-2 py-1 mb-2 tracking-wider">
                        5'— {g.guide_sequence} —3'
                      </div>
                      <div className="flex flex-wrap gap-1 text-xs">
                        <span className="px-1.5 py-0.5 bg-purple-900/40 text-purple-300 border border-purple-800 rounded">
                          {g.strategy?.replace(/_/g, ' ')}
                        </span>
                        <span className="px-1.5 py-0.5 bg-slate-800 text-slate-300 border border-slate-700 rounded">
                          GC: {g.gc_content}%
                        </span>
                        <span className="px-1.5 py-0.5 bg-slate-800 text-slate-300 border border-slate-700 rounded">
                          Strand: {g.strand}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded border ${g.discrimination?.passes_safety_threshold ? 'bg-emerald-900/40 text-emerald-300 border-emerald-800' : 'bg-rose-900/40 text-rose-300 border-rose-800'}`}>
                          {g.discrimination?.passes_safety_threshold ? '✓ Safety OK' : '✗ Below threshold'}
                        </span>
                      </div>

                      {activeGuide?.guide_id === g.guide_id && (
                        <div className="mt-3 pt-3 border-t border-slate-700 flex flex-col gap-2">
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="bg-emerald-950/30 border border-emerald-800 rounded p-2">
                              <div className="text-slate-400 mb-1">Mutant allele efficiency</div>
                              <div className="text-emerald-300 font-bold text-base">{(g.discrimination?.mutant_allele_efficiency * 100).toFixed(1)}%</div>
                            </div>
                            <div className="bg-rose-950/30 border border-rose-800 rounded p-2">
                              <div className="text-slate-400 mb-1">Wildtype allele efficiency</div>
                              <div className="text-rose-300 font-bold text-base">{(g.discrimination?.wildtype_allele_efficiency * 100).toFixed(1)}%</div>
                            </div>
                          </div>
                          <p className="text-xs text-slate-400">{g.strategy_description}</p>
                          <p className="text-xs text-blue-300 bg-blue-950/20 border border-blue-900 rounded p-2">{g.discrimination?.explanation}</p>
                          <p className="text-xs text-amber-300 bg-amber-950/20 border border-amber-900 rounded p-2">💡 {g.clinical_recommendation}</p>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="bg-slate-900 border border-rose-800 rounded-xl p-6 text-center text-rose-300">
                  <div className="text-2xl mb-2">🚫</div>
                  <p className="text-sm font-semibold">No guides passed the 10× discrimination safety threshold</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Consider: base editing (ABE/CBE), CRISPRi transcriptional repression, or a different locus window.
                  </p>
                </div>
              )}

              {/* Safety Note */}
              <div className="text-xs text-slate-500 bg-slate-900/50 border border-slate-800 rounded-lg p-3">
                <strong className="text-slate-400">⚠️ Safety requirement:</strong> {results.oncology_safety_note}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
