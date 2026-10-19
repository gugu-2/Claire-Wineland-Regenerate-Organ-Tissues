import React, { useState, useEffect } from 'react';
import { TestTube, Download, ChevronRight, CheckCircle2, AlertTriangle, Fingerprint, Dna, Settings2, Activity, FlaskConical, Stethoscope, Users, ShoppingCart, ArrowRight, Package, Scissors, Copy, Check, ShieldAlert, Info, Layers, Sparkles } from 'lucide-react';
import { api } from '../services/api';

export default function WetLabStudioView({
  targetGene = 'CCR5',
  candidates = [],
  selectedSample = null,
  preselectedGuide = null,
  onProceedToRegeneration = null
}) {
  const [activeTab, setActiveTab] = useState('oligos'); // 'oligos' | 'delivery' | 'dual' | 'cohort'

  // Tab 1: Oligo state
  const [selectedGuideForOligo, setSelectedGuideForOligo] = useState(
    preselectedGuide?.patient_guide_20nt || candidates?.[0]?.patient_guide_20nt || ''
  );
  const [selectedPlasmid, setSelectedPlasmid] = useState('PX459_BbsI');
  const [oligoData, setOligoData] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);

  // Sync when candidates or preselected guide changes
  useEffect(() => {
    if (preselectedGuide?.patient_guide_20nt) {
      setSelectedGuideForOligo(preselectedGuide.patient_guide_20nt);
    } else if (candidates && candidates.length > 0) {
      if (!selectedGuideForOligo || !candidates.some(c => c.patient_guide_20nt === selectedGuideForOligo)) {
        setSelectedGuideForOligo(candidates[0].patient_guide_20nt);
      }
    }
  }, [candidates, preselectedGuide]);

  // Tab 2: Delivery state
  const [selectedTissue, setSelectedTissue] = useState('HSPCs');
  const [deliveryNuclease, setDeliveryNuclease] = useState('SpCas9');
  const [deliveryPromoter, setDeliveryPromoter] = useState('EFS');
  const [deliveryData, setDeliveryData] = useState(null);

  // Tab 3: Dual-guide state
  const [dualGuideData, setDualGuideData] = useState([]);
  const [loadingDual, setLoadingDual] = useState(false);

  // Tab 4: Cohort state
  const [cohortData, setCohortData] = useState(null);
  const [loadingCohort, setLoadingCohort] = useState(false);

  // Load Oligo Order when guide or plasmid changes
  useEffect(() => {
    async function fetchOligos() {
      if (!selectedGuideForOligo) return;
      try {
        const res = await api.createOligoOrder({
          guide_seq: selectedGuideForOligo,
          plasmid_type: selectedPlasmid,
          guide_id: candidates?.find(c => c.patient_guide_20nt === selectedGuideForOligo)?.guide_id || 'sgRNA_Target'
        });
        setOligoData(res);
      } catch (err) {
        console.error('Failed to generate oligos:', err);
      }
    }
    fetchOligos();
  }, [selectedGuideForOligo, selectedPlasmid, candidates]);

  // Load Delivery recommendation when tissue/nuclease changes
  useEffect(() => {
    async function fetchDelivery() {
      try {
        const res = await api.recommendDelivery({
          target_tissue: selectedTissue,
          nuclease_type: deliveryNuclease,
          promoter_type: deliveryPromoter
        });
        setDeliveryData(res);
      } catch (err) {
        console.error('Failed to evaluate delivery:', err);
      }
    }
    fetchDelivery();
  }, [selectedTissue, deliveryNuclease, deliveryPromoter]);

  // Load Dual Guide pairs
  useEffect(() => {
    async function fetchDualGuides() {
      if (!candidates || candidates.length < 2) return;
      setLoadingDual(true);
      try {
        const res = await api.designDualGuides({
          target_gene: targetGene,
          target_domain: 'Exon Coding Core',
          candidates: candidates,
          min_excision_bp: 25,
          max_excision_bp: 600
        });
        setDualGuideData(res.pairs || []);
      } catch (err) {
        console.error('Failed to design dual guides:', err);
      } finally {
        setLoadingDual(false);
      }
    }
    fetchDualGuides();
  }, [targetGene, candidates]);

  // Load Cohort Comparison
  useEffect(() => {
    async function fetchCohort() {
      setLoadingCohort(true);
      try {
        const res = await api.getCohortComparison(targetGene);
        setCohortData(res);
      } catch (err) {
        console.error('Failed to load cohort matrix:', err);
      } finally {
        setLoadingCohort(false);
      }
    }
    fetchCohort();
  }, [targetGene]);

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const downloadCsv = (content, filename) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!candidates || candidates.length === 0) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 shadow-xl text-center space-y-4">
         <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-4">
            <TestTube className="w-8 h-8 text-slate-500" />
         </div>
         <h2 className="text-lg font-bold text-white">Wet-Lab Studio Requires CRISPR Guides</h2>
         <p className="text-sm text-slate-400 max-w-md mx-auto">Please generate and select at least one CRISPR guide in the Designer tab before proceeding to the Wet-Lab.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans">
      {/* Overview Banner */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 bg-purple-950/60 text-purple-400 border border-purple-800/60 px-2.5 py-1 rounded-full text-xs font-mono mb-3">
            <TestTube className="w-3.5 h-3.5" /> Module 5: Translational Wet-Lab & Delivery Engineering Studio
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Translational Benchtop & Delivery Pipeline
          </h2>
          <p className="text-sm text-slate-300 mt-2 leading-relaxed">
            Bridge computational design and experimental validation. Generate order-ready <strong>BbsI / BsmBI Golden Gate cloning primers</strong>,
            chemically modified <strong>IDT Alt-R synthetic sgRNAs</strong>, evaluate <strong>AAV payload packaging limits (&le;4.7 kb)</strong>,
            design <strong>dual-guide excision arrays</strong>, and screen guide generalizability across clinical cohorts.
          </p>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex border-b border-slate-800 bg-slate-900/40 p-1 rounded-xl">
        <button
          onClick={() => setActiveTab('oligos')}
          className={`flex-1 py-2.5 px-4 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
            activeTab === 'oligos' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <TestTube className="w-4 h-4" /> Cloning Oligo & sgRNA Synthesis
        </button>
        <button
          onClick={() => setActiveTab('delivery')}
          className={`flex-1 py-2.5 px-4 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
            activeTab === 'delivery' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Package className="w-4 h-4" /> Vector & AAV Packaging Advisor
        </button>
        <button
          onClick={() => setActiveTab('dual')}
          className={`flex-1 py-2.5 px-4 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
            activeTab === 'dual' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Scissors className="w-4 h-4" /> Dual-Guide Excision Arrays
        </button>
        <button
          onClick={() => setActiveTab('cohort')}
          className={`flex-1 py-2.5 px-4 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
            activeTab === 'cohort' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-4 h-4" /> Cohort Cross-Patient Matrix
        </button>
      </div>

      {/* TAB 1: Oligo Ordering & Benchtop Synthesis */}
      {activeTab === 'oligos' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Settings & Guide Picker */}
          <div className="lg:col-span-1 bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <Sparkles className="w-4 h-4 text-cyan-400" /> Synthesis Configuration
            </h3>

            {/* Select Guide */}
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1.5">Target Candidate Guide:</label>
              <select
                value={selectedGuideForOligo}
                onChange={(e) => setSelectedGuideForOligo(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                {candidates && candidates.map((c) => (
                  <option key={c.guide_id} value={c.patient_guide_20nt}>
                    {c.guide_id} ({c.patient_guide_20nt}) - {c.predicted_cleavage_efficiency}
                  </option>
                ))}
              </select>
            </div>

            {/* Select Plasmid Backbone */}
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1.5">Cloning Vector Backbone:</label>
              <div className="space-y-2">
                {[
                  { id: 'PX459_BbsI', name: 'pSpCas9(BB)-2A-Puro (PX459)', enzyme: 'BbsI (BpiI)', addgene: '62988' },
                  { id: 'lentiCRISPRv2_BsmBI', name: 'lentiCRISPR v2', enzyme: 'BsmBI (Esp3I)', addgene: '52961' },
                  { id: 'pX330_BbsI', name: 'pX330-U6-Chimeric_BB', enzyme: 'BbsI', addgene: '42230' }
                ].map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPlasmid(p.id)}
                    className={`w-full text-left p-2.5 rounded-lg border text-xs transition-all ${
                      selectedPlasmid === p.id
                        ? 'bg-cyan-950/60 border-cyan-500 text-cyan-200'
                        : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="font-bold">{p.name}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      Enzyme: <span className="font-mono text-cyan-400">{p.enzyme}</span> &bull; Addgene #{p.addgene}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Export Button */}
            {oligoData && (
              <button
                onClick={() => downloadCsv(oligoData.idt_order_csv, `${oligoData.guide_id}_IDT_Order.csv`)}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-lg text-xs flex items-center justify-center gap-2 shadow-lg transition-all"
              >
                <Download className="w-4 h-4" /> Download IDT / GenScript Order CSV
              </button>
            )}
          </div>

          {/* Oligo & sgRNA Display */}
          <div className="lg:col-span-2 space-y-4">
            {oligoData && (
              <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-5">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-white">Annealing Oligonucleotide Pairs</h3>
                    <p className="text-[11px] text-slate-400">
                      Standard Golden Gate cloning into <strong className="text-cyan-400">{oligoData.plasmid_name}</strong>
                    </p>
                  </div>
                  {oligoData.prepended_leading_g && (
                    <span className="bg-amber-950/80 text-amber-300 border border-amber-800 px-2 py-0.5 rounded text-[10px] font-mono">
                      +5' G Prepended (U6 Transcription Initiation)
                    </span>
                  )}
                </div>

                {/* Top Strand Oligo */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-emerald-400">{oligoData.top_oligo.name} (Forward)</span>
                    <button
                      onClick={() => copyToClipboard(oligoData.top_oligo.sequence, 'top')}
                      className="text-xs text-slate-400 hover:text-white flex items-center gap-1 bg-slate-900 px-2 py-1 rounded border border-slate-800"
                    >
                      {copiedKey === 'top' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      {copiedKey === 'top' ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <div className="font-mono text-xs text-slate-200 bg-slate-900/80 p-2.5 rounded border border-slate-800/80 break-all">
                    <span className="text-emerald-400 font-bold">{oligoData.top_oligo.overhang}</span>
                    <span className="text-slate-200">{oligoData.top_oligo.insert}</span>
                  </div>
                  <div className="flex items-center gap-4 text-[10px] font-mono text-slate-400">
                    <span>Length: {oligoData.top_oligo.length_nt} nt</span>
                    <span>GC: {oligoData.top_oligo.gc_content_pct}%</span>
                    <span>Tm: ~{oligoData.top_oligo.tm_celsius}&deg;C</span>
                  </div>
                </div>

                {/* Bottom Strand Oligo */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-cyan-400">{oligoData.bottom_oligo.name} (Reverse)</span>
                    <button
                      onClick={() => copyToClipboard(oligoData.bottom_oligo.sequence, 'bottom')}
                      className="text-xs text-slate-400 hover:text-white flex items-center gap-1 bg-slate-900 px-2 py-1 rounded border border-slate-800"
                    >
                      {copiedKey === 'bottom' ? <Check className="w-3 h-3 text-cyan-400" /> : <Copy className="w-3 h-3" />}
                      {copiedKey === 'bottom' ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <div className="font-mono text-xs text-slate-200 bg-slate-900/80 p-2.5 rounded border border-slate-800/80 break-all">
                    <span className="text-cyan-400 font-bold">{oligoData.bottom_oligo.overhang}</span>
                    <span className="text-slate-200">{oligoData.bottom_oligo.insert}</span>
                  </div>
                  <div className="flex items-center gap-4 text-[10px] font-mono text-slate-400">
                    <span>Length: {oligoData.bottom_oligo.length_nt} nt</span>
                    <span>GC: {oligoData.bottom_oligo.gc_content_pct}%</span>
                    <span>Tm: ~{oligoData.bottom_oligo.tm_celsius}&deg;C</span>
                  </div>
                </div>

                {/* Chemically Modified Synthetic sgRNA for RNP Electroporation */}
                <div className="bg-purple-950/20 border border-purple-800/40 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-purple-300">
                      <span>Chemically Modified Synthetic sgRNA (IDT Alt-R / Synthego Format)</span>
                    </div>
                    <button
                      onClick={() => copyToClipboard(oligoData.synthetic_modified_sgRNA.chemically_modified_notation, 'altr')}
                      className="text-xs text-slate-400 hover:text-white flex items-center gap-1 bg-slate-900 px-2 py-1 rounded border border-slate-800"
                    >
                      {copiedKey === 'altr' ? <Check className="w-3 h-3 text-purple-400" /> : <Copy className="w-3 h-3" />}
                      {copiedKey === 'altr' ? 'Copied' : 'Copy Format'}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Full 100-nt single-guide RNA with 2'-O-methyl 3'-phosphorothioate linkages on terminal nucleotides for nuclease resistance in RNP electroporation.
                  </p>
                  <div className="font-mono text-[11px] text-purple-200 bg-slate-950 p-2.5 rounded border border-purple-900/50 break-all">
                    {oligoData.synthetic_modified_sgRNA.chemically_modified_notation}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Delivery Vector & AAV Packaging Advisor */}
      {activeTab === 'delivery' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Controls */}
          <div className="lg:col-span-1 bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-3">
              Delivery Parameters
            </h3>

            {/* Tissue Selector */}
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1.5">Target Tissue / Cell Type:</label>
              <div className="space-y-1.5">
                {[
                  { id: 'HSPCs', name: 'CD34+ HSPCs (Sickle/HIV)' },
                  { id: 'CNS_NEURONS', name: 'CNS / Neurons (Parkinson\'s)' },
                  { id: 'LIVER', name: 'Liver / Hepatocytes' },
                  { id: 'RETINA', name: 'Retina (Photoreceptors)' },
                  { id: 'T_CELLS', name: 'Primary T-Cells (CAR-T)' }
                ].map(t => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTissue(t.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      selectedTissue === t.id
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Nuclease Effector */}
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1.5">CRISPR Effector cDNA:</label>
              <select
                value={deliveryNuclease}
                onChange={(e) => setDeliveryNuclease(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200"
              >
                <option value="SpCas9">SpCas9 (4,200 bp - Standard)</option>
                <option value="SaCas9">SaCas9 (3,150 bp - Compact AAV)</option>
                <option value="Cas12a">Cas12a / Cpf1 (3,900 bp)</option>
                <option value="Cas9_BaseEditor_CBE">CBE Base Editor (5,100 bp)</option>
              </select>
            </div>

            {/* Promoter */}
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1.5">Promoter:</label>
              <select
                value={deliveryPromoter}
                onChange={(e) => setDeliveryPromoter(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200"
              >
                <option value="EFS">EFS (230 bp - Minimal)</option>
                <option value="UBC">UBC (400 bp)</option>
                <option value="Synapsin">Synapsin (480 bp - Neuronal)</option>
                <option value="CMV">CMV (600 bp)</option>
                <option value="CAG">CAG (1,700 bp - Massive)</option>
              </select>
            </div>
          </div>

          {/* Delivery Assessment Card */}
          <div className="lg:col-span-2 space-y-4">
            {deliveryData && (
              <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-5">
                <div className="border-b border-slate-800 pb-3">
                  <span className="text-xs font-mono text-cyan-400 uppercase font-semibold">Recommended Vector Class</span>
                  <h3 className="text-lg font-bold text-white mt-0.5">{deliveryData.recommended_modality}</h3>
                  <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                    {deliveryData.biological_rationale}
                  </p>
                </div>

                {/* Precedent & Safety Badges */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                    <span className="text-slate-400 text-[11px] block mb-1">Clinical Precedent:</span>
                    <strong className="text-slate-200 text-[11px]">{deliveryData.clinical_precedent}</strong>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                    <span className="text-slate-400 text-[11px] block mb-1">Immunogenicity:</span>
                    <strong className="text-amber-400 text-[11px]">{deliveryData.immunogenicity_risk}</strong>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                    <span className="text-slate-400 text-[11px] block mb-1">Off-Target Profile:</span>
                    <strong className="text-emerald-400 text-[11px]">{deliveryData.off_target_profile}</strong>
                  </div>
                </div>

                {/* AAV Viral Packaging Meter */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-indigo-400" />
                      <span className="text-xs font-bold text-white">Single-Vector AAV Packaging Evaluation</span>
                    </div>
                    <span className={`text-xs font-mono font-bold ${
                      deliveryData.aav_packaging_evaluation.is_overflow ? 'text-rose-400' : 'text-emerald-400'
                    }`}>
                      {deliveryData.aav_packaging_evaluation.total_cargo_bp} / 4,700 bp
                    </span>
                  </div>

                  {/* Progress Bar Meter */}
                  <div className="w-full bg-slate-900 rounded-full h-3.5 p-0.5 border border-slate-800 overflow-hidden relative">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        deliveryData.aav_packaging_evaluation.is_overflow
                          ? 'bg-rose-500'
                          : deliveryData.aav_packaging_evaluation.total_cargo_bp > 4450
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, (deliveryData.aav_packaging_evaluation.total_cargo_bp / 4700) * 100)}%` }}
                    />
                  </div>

                  {/* Packaging Status Message */}
                  <div className={`p-3 rounded-lg text-xs leading-relaxed ${
                    deliveryData.aav_packaging_evaluation.is_overflow
                      ? 'bg-rose-950/60 border border-rose-800 text-rose-200'
                      : 'bg-emerald-950/40 border border-emerald-800 text-emerald-200'
                  }`}>
                    {deliveryData.aav_packaging_evaluation.packaging_message}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: Dual-Guide Excision Planner */}
      {activeTab === 'dual' && (
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Scissors className="w-4 h-4 text-cyan-400" /> Dual-Guide Excision Arrays for {targetGene}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Paired flanking sgRNAs achieving targeted microhomology or non-homologous end joining (NHEJ) genomic deletion.
              </p>
            </div>
            <span className="text-xs font-mono text-cyan-400 bg-cyan-950/60 px-2.5 py-1 rounded border border-cyan-800/60 self-start sm:self-auto">
              {dualGuideData.length} Paired Arrays Identified
            </span>
          </div>

          {dualGuideData.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {dualGuideData.map((pair) => (
                <div
                  key={pair.pair_id}
                  className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 space-y-3 hover:border-slate-700 transition-all"
                >
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="font-mono text-xs font-bold text-slate-200">{pair.pair_id}</span>
                    <span className="text-xs font-bold text-emerald-400 font-mono">
                      {pair.predicted_excision_pct} Excision
                    </span>
                  </div>

                  {/* Guides in Pair */}
                  <div className="space-y-1.5 text-xs font-mono">
                    <div className="flex items-center justify-between bg-slate-900 p-2 rounded">
                      <span className="text-slate-400">Upstream ({pair.upstream_guide.strand}):</span>
                      <span className="text-slate-200">{pair.upstream_guide.sequence} <strong className="text-cyan-400">[{pair.upstream_guide.pam}]</strong></span>
                    </div>
                    <div className="flex items-center justify-between bg-slate-900 p-2 rounded">
                      <span className="text-slate-400">Downstream ({pair.downstream_guide.strand}):</span>
                      <span className="text-slate-200">{pair.downstream_guide.sequence} <strong className="text-cyan-400">[{pair.downstream_guide.pam}]</strong></span>
                    </div>
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                    <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
                      <span className="text-slate-400 block">Excision Distance:</span>
                      <strong className="text-cyan-300 font-mono">{pair.excision_distance_bp} bp</strong>
                    </div>
                    <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
                      <span className="text-slate-400 block">PAM Synergy:</span>
                      <strong className={`font-mono ${pair.pam_orientation === 'PAM_OUT' ? 'text-emerald-400 font-bold' : 'text-slate-300'}`}>
                        {pair.pam_orientation}
                      </strong>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-normal">
                    {pair.orientation_description}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-xs text-slate-400">
              No flanking guide combinations identified within the 25-600 bp excision window.
            </div>
          )}
        </div>
      )}

      {/* TAB 4: Cohort Cross-Patient Matrix */}
      {activeTab === 'cohort' && (
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-cyan-400" /> Clinical Cohort Cross-Patient Guide Generalizability
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Comparative matrix assessing guide cutting and personal SNP collisions across benchmark patient genomes.
              </p>
            </div>
            <span className="text-xs font-mono text-cyan-400 bg-cyan-950/60 px-2.5 py-1 rounded border border-cyan-800/60 self-start sm:self-auto">
              Cohort: {cohortData?.total_cohort_samples || 0} Patients Screened
            </span>
          </div>

          {cohortData && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-mono">
                    <th className="py-2.5 px-3">Candidate Guide</th>
                    <th className="py-2.5 px-3">Cohort Coverage</th>
                    {cohortData.cohort_patients.map(p => (
                      <th key={p.sample_id} className="py-2.5 px-3 text-center">
                        <div>{p.sample_id.replace('PATIENT_', 'PT_')}</div>
                        <div className="text-[9px] font-sans text-slate-500 font-normal truncate max-w-[120px]">{p.clinical_status}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {cohortData.guide_comparison_rows.map((row) => (
                    <tr key={row.guide_id} className="hover:bg-slate-800/30">
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-200">{row.guide_id}</div>
                        <div className="text-[10px] text-slate-500 font-sans">{row.target_domain}</div>
                      </td>
                      <td className="py-3 px-3 font-sans">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          row.cohort_coverage_pct === 100
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : row.cohort_coverage_pct >= 50
                            ? 'bg-amber-950 text-amber-300 border border-amber-800'
                            : 'bg-rose-950 text-rose-300 border border-rose-800'
                        }`}>
                          {row.cohort_coverage_pct}% Universal
                        </span>
                      </td>
                      {cohortData.cohort_patients.map(p => {
                        const scoreInfo = row.patient_scores[p.sample_id];
                        if (!scoreInfo) return <td key={p.sample_id} className="text-center text-slate-600">-</td>;

                        const isColl = scoreInfo.is_collision;
                        const eff = scoreInfo.on_target_efficiency;

                        return (
                          <td key={p.sample_id} className="py-3 px-3 text-center">
                            <div className={`font-bold ${
                              isColl ? 'text-rose-400' : eff >= 0.70 ? 'text-emerald-400' : 'text-amber-400'
                            }`}>
                              {scoreInfo.cleavage_pct}
                            </div>
                            <div className="text-[9px] text-slate-500 font-sans">
                              {isColl ? 'COLLISION' : 'INTACT'}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Bottom Step-by-Step Navigation Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-3">
          <button
            onClick={() => alert("Enterprise Integration: Connecting to Synthego/IDT API for automated 1-click cart fulfillment...")}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md shadow-indigo-500/20"
          >
            <ShoppingCart className="w-4 h-4" /> 1-Click Synthego/IDT Order
          </button>
          <button
            onClick={() => {
                if (oligoData) {
                    downloadCsv(oligoData.idt_order_csv, `${oligoData.guide_id}_IDT_Order.csv`);
                } else {
                    alert("No oligo data available to export.");
                }
            }}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
          >
            <Download className="w-4 h-4 text-cyan-400" /> Export Synthesizer CSV
          </button>
        </div>
        {onProceedToRegeneration && (
          <button
            onClick={onProceedToRegeneration}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white px-5 py-2.5 rounded-lg text-xs font-bold transition-all shadow-lg shadow-purple-600/20 flex items-center gap-2"
          >
            Proceed to Stem Cell & Regeneration <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
