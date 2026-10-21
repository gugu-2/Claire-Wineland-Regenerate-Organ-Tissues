import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Target, Shield, Dna, Activity, CheckCircle, AlertTriangle, Download, Copy, RefreshCw, BarChart2, Layers } from 'lucide-react';

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
  {
    label: 'TP53 R175H — Pan-Cancer Hotspot',
    gene: 'TP53',
    mutationName: 'TP53 R175H',
    oncokbTier: '1',
    cosmicCount: 38412,
    fdaTherapy: 'Preclinical conformational reactivators (PC14586 / APR-246)',
    tumorSeq:    'GCCCCTCCTCAGCATCTTATCCGAGTGGAAGGAAATTTGCGTGTGGAGTATTTGGATGACAGAAACACTTTTCGACATAGTGTGGTGGTGCCCTATGAGCCGCCTGAGGTTGGCTCTGACTGTACCACCATCCACTACAACTACATGTGTAACAGTTCCTGCATGGGCGGCATGAACCGGAGGCCCATCCTCACCATCATCACACTGGAAGACTCCAGT',
    wildtypeSeq: 'GCCCCTCCTCAGCATCTTATCCGAGTGGAAGGAAATTTGCGTGTGGAGTATTTGGATGACAGAAACACTTTTCGACATAGTGTGGTGGTGCCCTATGAGCCGCCTGAGGTTGGCTCTGACTGTACCACCATCCACTACAACTACATGTGTAACAGTTCCTGCATGGGCGGCATGAACCGGCGGCCCATCCTCACCATCATCACACTGGAAGACTCCAGT',
  }
];

// ── POPULATION HLA PRESETS ──────────────────────────────────────────────────
const HLA_POPULATION_PRESETS = [
  { name: 'Global Common', a: 'HLA-A*02:01', b: 'HLA-B*07:02', c: 'HLA-C*07:01' },
  { name: 'European Caucasian', a: 'HLA-A*01:01', b: 'HLA-B*08:01', c: 'HLA-C*07:01' },
  { name: 'East Asian', a: 'HLA-A*24:02', b: 'HLA-B*40:01', c: 'HLA-C*03:04' },
  { name: 'African / Afro-Caribbean', a: 'HLA-A*30:01', b: 'HLA-B*53:01', c: 'HLA-C*04:01' },
  { name: 'Hispanic / Latino', a: 'HLA-A*02:01', b: 'HLA-B*35:01', c: 'HLA-C*04:01' }
];

const DISCRIMINATION_COLOR = { EXCELLENT: 'emerald', GOOD: 'emerald', MODERATE: 'amber', INSUFFICIENT: 'rose' };
const TIER_BADGE = { '1': 'bg-emerald-800 text-emerald-200', '2A': 'bg-blue-800 text-blue-200', '2B': 'bg-sky-800 text-sky-200', '3A': 'bg-slate-700 text-slate-300' };

export default function OncoCrisprDesignerView({ somaticProfile }) {
  const [activeTab, setActiveTab] = useState('allele_crispr'); // 'allele_crispr' | 'neoantigen_vaccine'
  
  // Allele-Specific CRISPR state
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [customGene, setCustomGene] = useState('');
  const [customMutation, setCustomMutation] = useState('');
  const [tumorSeq, setTumorSeq] = useState('');
  const [wildtypeSeq, setWildtypeSeq] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeGuide, setActiveGuide] = useState(null);
  const [driverGeneExpr, setDriverGeneExpr] = useState(null);

  // Multi-Allele Neoantigen & Vaccine state (Feature 03 & 04)
  const [hlaA, setHlaA] = useState('HLA-A*02:01');
  const [hlaB, setHlaB] = useState('HLA-B*07:02');
  const [hlaC, setHlaC] = useState('HLA-C*07:01');
  const [neoLoading, setNeoLoading] = useState(false);
  const [neoResults, setNeoResults] = useState(null);
  const [neoError, setNeoError] = useState('');
  const [vaccineModal, setVaccineModal] = useState(null); // Vaccine cassette data
  const [vaccineLoading, setVaccineLoading] = useState(false);
  const [linkerType, setLinkerType] = useState('AAY'); // 'AAY' | 'GPGPG' | 'KK'
  const [copiedFasta, setCopiedFasta] = useState(false);

  // Fetch driver gene RNA expression whenever selected gene changes
  useEffect(() => {
    const gene = selectedPreset ? selectedPreset.gene : customGene;
    if (gene) {
      const sid = somaticProfile?.tumor_sample_id || 'TCGA-PDAC';
      api.getGeneExpression(sid, gene)
        .then(data => setDriverGeneExpr(data))
        .catch(() => setDriverGeneExpr(null));
    }
  }, [selectedPreset, customGene, somaticProfile?.tumor_sample_id]);

  const applyPreset = (preset) => {
    setSelectedPreset(preset);
    setCustomGene(preset.gene);
    setCustomMutation(preset.mutationName);
    setTumorSeq(preset.tumorSeq);
    setWildtypeSeq(preset.wildtypeSeq);
    setResults(null);
    setActiveGuide(null);
  };

  const applyHlaPreset = (preset) => {
    setHlaA(preset.a);
    setHlaB(preset.b);
    setHlaC(preset.c);
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

  // Run Multi-Allele Neoantigen Prediction (Feature 03)
  const runMultiAlleleNeoantigen = async () => {
    const gene = selectedPreset ? selectedPreset.gene : (customGene.trim() || 'KRAS');
    const mut = selectedPreset ? selectedPreset.mutationName : (customMutation.trim() || 'G12D');

    setNeoLoading(true);
    setNeoError('');
    try {
      const payload = {
        somatic_mutations: [
          { gene, mutation: mut }
        ],
        hla_alleles: [hlaA, hlaB, hlaC],
        sample_id: somaticProfile?.tumor_sample_id || 'PATIENT_SAMPLE'
      };
      const res = await api.predictMultiAlleleNeoantigens(payload);
      setNeoResults(res);
    } catch (err) {
      setNeoError('Neoantigen prediction failed: ' + (err.message || 'Server error'));
    } finally {
      setNeoLoading(false);
    }
  };

  // Design Personalized Poly-Epitope Vaccine Cassette
  const handleDesignVaccine = async () => {
    if (!neoResults || !neoResults.vaccine_candidates?.length) {
      return;
    }
    setVaccineLoading(true);
    try {
      const payload = {
        peptides: neoResults.vaccine_candidates,
        patient_id: somaticProfile?.tumor_sample_id || 'PT_ONCOLOGY_2026',
        linker_type: linkerType,
        include_trafficking_signal: true
      };
      const res = await api.designVaccineCassette(payload);
      setVaccineModal(res);
    } catch (err) {
      alert('Vaccine design failed: ' + err.message);
    } finally {
      setVaccineLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedFasta(true);
    setTimeout(() => setCopiedFasta(false), 3000);
  };

  const downloadJson = (obj, filename = 'vaccine_design.json') => {
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            🎯 OncoCRISPR & Neoantigen Vaccine Engine
            <span className="text-xs font-normal px-2 py-0.5 bg-rose-900/50 text-rose-300 border border-rose-700 rounded">
              ONCOLOGY SPRINT 2
            </span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Designs somatic allele-specific CRISPR guides and personalized multi-allele mRNA/peptide neoantigen vaccines.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('allele_crispr')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'allele_crispr'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Target className="w-4 h-4" /> Allele-Specific Guides
          </button>
          <button
            onClick={() => setActiveTab('neoantigen_vaccine')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'neoantigen_vaccine'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Dna className="w-4 h-4" /> Multi-Allele Neoantigen Vaccine
          </button>
        </div>
      </div>

      {/* Safety & Multi-Omics Banner */}
      <div className="bg-rose-950/40 border border-rose-700/80 rounded-xl p-3 text-xs text-rose-200 flex items-start gap-2.5">
        <span className="text-lg">⚠️</span>
        <div className="space-y-0.5">
          <strong>Oncology Multi-Omics Mode:</strong> Guides require a minimum <strong>10× discrimination ratio</strong> to spare healthy wildtype tissue.
          Neoantigens require <strong>Class I HLA presentation (IC50 &lt; 500nM)</strong>, <strong>NetChop-3.1 cleavage &gt; 0.50</strong>, and <strong>ΔWT agretopicity fold-change &gt; 5×</strong>.
        </div>
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

      {/* TAB 1: ALLELE-SPECIFIC CRISPR DESIGN */}
      {activeTab === 'allele_crispr' && (
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
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2"><span>✏️</span> Custom Driver Target</h2>
                {driverGeneExpr && (
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                    driverGeneExpr.expressed
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                      : 'bg-rose-950 text-rose-300 border-rose-700'
                  }`}>
                    RNA: {driverGeneExpr.tpm} TPM ({driverGeneExpr.classification})
                  </span>
                )}
              </div>

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
                <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-sm font-semibold text-white">Design Summary</h2>
                    <span className={`text-xs px-2 py-0.5 rounded border ${results.guides_passing_safety_threshold > 0 ? 'bg-emerald-900/50 border-emerald-700 text-emerald-300' : 'bg-rose-900/50 border-rose-700 text-rose-300'}`}>
                      {results.guides_passing_safety_threshold}/{results.total_guides_found} guides pass safety threshold
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">{results.design_summary}</p>
                </div>

                {results.all_candidates?.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {results.all_candidates.map((g, i) => {
                      const exprTpm = driverGeneExpr?.tpm || 10.0;
                      const compositeScore = (g.discrimination?.discrimination_ratio * Math.log2(exprTpm + 1.0)).toFixed(1);
                      return (
                        <button key={g.guide_id}
                          onClick={() => setActiveGuide(activeGuide?.guide_id === g.guide_id ? null : g)}
                          className={`text-left bg-slate-900 border rounded-xl p-4 transition-all ${activeGuide?.guide_id === g.guide_id ? 'border-blue-500 bg-slate-800/80' : 'border-slate-700 hover:border-slate-500'}`}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-400">#{i + 1}</span>
                              <span className="text-sm font-mono font-semibold text-white">{g.guide_id}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded text-[10px] bg-purple-950 text-purple-300 border border-purple-800" title="Expression × Discrimination Score">
                                Expr-Score: {compositeScore}
                              </span>
                              <DiscriminationBadge disc={g.discrimination} />
                            </div>
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
                      );
                    })}
                  </div>
                ) : (
                  <div className="bg-slate-900 border border-rose-800 rounded-xl p-6 text-center text-rose-300">
                    <div className="text-2xl mb-2">🚫</div>
                    <p className="text-sm font-semibold">No guides passed the 10× discrimination safety threshold</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: MULTI-ALLELE NEOANTIGEN & VACCINE CASSETTE DESIGNER (FEATURE 03) */}
      {activeTab === 'neoantigen_vaccine' && (
        <div className="space-y-6">
          {/* Patient HLA Genotype Selector Card */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Shield className="w-5 h-5 text-purple-400" /> Patient Class I HLA Genotype Setup
                </h3>
                <p className="text-xs text-slate-400">
                  Precision neoantigen prediction evaluates somatic mutant peptide binding across all 3 patient HLA loci simultaneously.
                </p>
              </div>

              {/* Quick Population Presets */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] text-slate-400 font-semibold mr-1">Population Presets:</span>
                {HLA_POPULATION_PRESETS.map((pop) => (
                  <button
                    key={pop.name}
                    onClick={() => applyHlaPreset(pop)}
                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-purple-500 rounded text-[11px] font-mono text-purple-200 transition-all"
                  >
                    {pop.name}
                  </button>
                ))}
              </div>
            </div>

            {/* 3-Allele Dropdown Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">HLA-A Allele</label>
                <select
                  value={hlaA}
                  onChange={(e) => setHlaA(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-purple-300 focus:outline-none focus:border-purple-500"
                >
                  <option value="HLA-A*02:01">HLA-A*02:01 (Global Common ~24%)</option>
                  <option value="HLA-A*01:01">HLA-A*01:01 (Caucasian ~15%)</option>
                  <option value="HLA-A*03:01">HLA-A*03:01 (Caucasian ~13%)</option>
                  <option value="HLA-A*11:01">HLA-A*11:01 (East Asian ~14%)</option>
                  <option value="HLA-A*24:02">HLA-A*24:02 (East Asian ~19%)</option>
                  <option value="HLA-A*30:01">HLA-A*30:01 (African ~6%)</option>
                  <option value="HLA-A*33:03">HLA-A*33:03 (Asian ~8%)</option>
                  <option value="HLA-A*68:01">HLA-A*68:01 (General ~5%)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">HLA-B Allele</label>
                <select
                  value={hlaB}
                  onChange={(e) => setHlaB(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-purple-300 focus:outline-none focus:border-purple-500"
                >
                  <option value="HLA-B*07:02">HLA-B*07:02 (Global Common ~14%)</option>
                  <option value="HLA-B*08:01">HLA-B*08:01 (Caucasian ~12%)</option>
                  <option value="HLA-B*15:01">HLA-B*15:01 (General ~8%)</option>
                  <option value="HLA-B*27:05">HLA-B*27:05 (Autoimmune & Cancer ~4%)</option>
                  <option value="HLA-B*35:01">HLA-B*35:01 (Hispanic ~9%)</option>
                  <option value="HLA-B*40:01">HLA-B*40:01 (East Asian ~8%)</option>
                  <option value="HLA-B*44:02">HLA-B*44:02 (General ~6%)</option>
                  <option value="HLA-B*51:01">HLA-B*51:01 (Mediterranean ~8%)</option>
                  <option value="HLA-B*53:01">HLA-B*53:01 (African ~5%)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">HLA-C Allele</label>
                <select
                  value={hlaC}
                  onChange={(e) => setHlaC(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-purple-300 focus:outline-none focus:border-purple-500"
                >
                  <option value="HLA-C*07:01">HLA-C*07:01 (Global Common ~16%)</option>
                  <option value="HLA-C*07:02">HLA-C*07:02 (Global Common ~15%)</option>
                  <option value="HLA-C*04:01">HLA-C*04:01 (General ~12%)</option>
                  <option value="HLA-C*06:02">HLA-C*06:02 (General ~9%)</option>
                  <option value="HLA-C*03:04">HLA-C*03:04 (East Asian ~7%)</option>
                  <option value="HLA-C*01:02">HLA-C*01:02 (General ~8%)</option>
                  <option value="HLA-C*05:01">HLA-C*05:01 (General ~5%)</option>
                  <option value="HLA-C*12:03">HLA-C*12:03 (General ~4%)</option>
                </select>
              </div>
            </div>

            <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-800">
              <div className="text-xs text-slate-400">
                Evaluating somatic target: <strong className="text-white">{selectedPreset?.mutationName || customMutation || 'KRAS G12D'}</strong>
              </div>
              <button
                onClick={runMultiAlleleNeoantigen}
                disabled={neoLoading}
                className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:bg-slate-700 text-white font-semibold rounded-lg text-xs transition-all shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2"
              >
                {neoLoading ? (
                  <>
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin"></div>
                    <span>Predicting MHC-I Affinities & Cleavage...</span>
                  </>
                ) : (
                  <>
                    <Dna className="w-4 h-4" />
                    <span>Run Multi-Allele Neoantigen Prediction</span>
                  </>
                )}
              </button>
            </div>
            {neoError && <div className="mt-2 text-rose-400 text-xs bg-rose-950/40 p-2 rounded border border-rose-800">{neoError}</div>}
          </div>

          {/* Results Table & Vaccine Cassette Action */}
          {neoResults && (
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>Ranked Neoantigen Vaccine Candidates</span>
                    <span className="text-xs font-mono font-normal text-purple-300">
                      ({neoResults.strong_binders_count} Strong Binders, {neoResults.weak_binders_count} Weak Binders)
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Ranked by composite score (MHC binding IC50 + NetChop-3.1 proteasome cleavage + NetCTLpan TAP score + ΔWT agretopicity fold-change).
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={linkerType}
                    onChange={(e) => setLinkerType(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs font-mono text-purple-200"
                  >
                    <option value="AAY">Linker: AAY (Proteasome Spacer)</option>
                    <option value="GPGPG">Linker: GPGPG (Flexible Spacer)</option>
                    <option value="KK">Linker: KK (Cathepsin Spacer)</option>
                  </select>
                  <button
                    onClick={handleDesignVaccine}
                    disabled={vaccineLoading}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-emerald-600/30 flex items-center gap-1.5"
                  >
                    {vaccineLoading ? 'Generating...' : '💉 Build mRNA Vaccine Cassette'}
                  </button>
                </div>
              </div>

              {/* Candidates Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-mono">
                      <th className="py-2.5 px-3">Priority</th>
                      <th className="py-2.5 px-3">Mutant Peptide</th>
                      <th className="py-2.5 px-3">Target HLA Allele</th>
                      <th className="py-2.5 px-3 text-center">Length</th>
                      <th className="py-2.5 px-3 text-right">IC50 (nM)</th>
                      <th className="py-2.5 px-3 text-center">Binding Class</th>
                      <th className="py-2.5 px-3 text-center">NetChop Cleavage</th>
                      <th className="py-2.5 px-3 text-center">TAP Score</th>
                      <th className="py-2.5 px-3 text-right">ΔWT Fold-Change</th>
                      <th className="py-2.5 px-3 text-right">Composite Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {neoResults.top_neoantigens?.map((neo) => {
                      const isStrong = neo.ic50_nm < 50;
                      const isWeak = neo.ic50_nm >= 50 && neo.ic50_nm < 500;
                      return (
                        <tr key={`${neo.mutant_peptide}_${neo.hla_allele}`} className="hover:bg-slate-800/40">
                          <td className="py-2.5 px-3">
                            <span className="w-5 h-5 rounded-full bg-slate-800 border border-slate-700 inline-flex items-center justify-center font-bold text-white text-[10px]">
                              {neo.vaccine_priority}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-bold text-emerald-300">
                            {neo.mutant_peptide}
                            <div className="text-[10px] text-slate-500 font-normal">
                              WT: {neo.wildtype_peptide} (Pos {neo.mutation_pos})
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-purple-300 font-semibold">{neo.hla_allele}</td>
                          <td className="py-2.5 px-3 text-center text-slate-400">{neo.length}mer</td>
                          <td className="py-2.5 px-3 text-right font-bold text-white">{neo.ic50_nm}</td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              isStrong
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                : isWeak
                                ? 'bg-blue-950 text-blue-300 border border-blue-800'
                                : 'bg-slate-800 text-slate-400'
                            }`}>
                              {isStrong ? 'Strong Binder (SB)' : isWeak ? 'Weak Binder (WB)' : 'Non-Binder'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={neo.cleavage_score >= 0.5 ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                              {neo.cleavage_score}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center text-slate-300">{neo.tap_score}</td>
                          <td className="py-2.5 px-3 text-right text-amber-300 font-semibold">{neo.agretopicity_fold_change}×</td>
                          <td className="py-2.5 px-3 text-right text-purple-300 font-bold">{neo.composite_score}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Personalized mRNA Vaccine Cassette Modal / View */}
          {vaccineModal && (
            <div className="bg-slate-900 border border-purple-800/80 rounded-2xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Dna className="w-5 h-5 text-purple-400" />
                  <h3 className="text-base font-bold text-white">
                    Personalized Poly-Epitope Neoantigen mRNA Vaccine Construct
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyToClipboard(vaccineModal.fasta_export)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copiedFasta ? 'Copied FASTA!' : 'Copy FASTA'}</span>
                  </button>
                  <button
                    onClick={() => downloadJson(vaccineModal, `${vaccineModal.patient_id}_vaccine_construct.json`)}
                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-md"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download JSON</span>
                  </button>
                </div>
              </div>

              {/* Construct Architecture Visualizer */}
              <div className="bg-[#070b14] p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  mRNA Construct Architecture (5' &rarr; 3')
                </div>
                <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
                  <span className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700">5' UTR</span>
                  <span className="text-slate-600">&rarr;</span>
                  <span className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700">Kozak (GCCACC)</span>
                  <span className="text-slate-600">&rarr;</span>
                  <span className="px-2.5 py-1 rounded bg-blue-950 text-blue-300 border border-blue-800">Sec-Tag (Signal Peptide)</span>
                  <span className="text-slate-600">&rarr;</span>
                  <span className="px-3 py-1 rounded bg-purple-950 text-purple-200 border border-purple-700 font-bold">
                    {vaccineModal.total_epitopes} Neoepitopes ({vaccineModal.linker_used} Proteasome Spacers)
                  </span>
                  <span className="text-slate-600">&rarr;</span>
                  <span className="px-2.5 py-1 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">MITD (Trafficking Domain)</span>
                  <span className="text-slate-600">&rarr;</span>
                  <span className="px-2.5 py-1 rounded bg-rose-950 text-rose-300 border border-rose-800">Dual Stop (TGATGA)</span>
                  <span className="text-slate-600">&rarr;</span>
                  <span className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700">3' UTR + PolyA (100 nt)</span>
                </div>
              </div>

              {/* Protein & Codon Sequence */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                  <div className="text-slate-400 font-sans font-semibold">Poly-Epitope Protein Chain:</div>
                  <div className="text-emerald-300 break-all leading-relaxed max-h-24 overflow-y-auto">
                    {vaccineModal.protein_construct}
                  </div>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                  <div className="text-slate-400 font-sans font-semibold">Codon-Optimized mRNA Transcript:</div>
                  <div className="text-purple-300 break-all leading-relaxed max-h-24 overflow-y-auto">
                    {vaccineModal.mrna_transcript?.full_sequence}
                  </div>
                </div>
              </div>

              <div className="text-xs text-slate-400 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                ℹ️ <strong>Clinical Notes:</strong> {vaccineModal.clinical_notes}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
