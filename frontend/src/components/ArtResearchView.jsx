import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import SynthesisOrderModal from './SynthesisOrderModal';
import { Download, Copy, ShoppingCart, RefreshCw, Layers, ShieldCheck, CheckCircle, AlertTriangle, ExternalLink } from 'lucide-react';

const EXAMPLE_SEQUENCES = {
  L0050_array: "AAGAACAATCTTTAGATTATCTATACTAAGAGAGTATTTATTCATGTGTATCGCATGTTAATTTAAAGGATTTATA" +
               "CATGTGTCTCGCATGTTGAATAATGTGAATTTAAAGGATTTATTCATGTGTCTCGCATGTCTATAATTCCCTTT" +
               "GCTAAAGATCTCCATATTGACATCGGAGATGACAAGCCTCGTACGCAATTTTATTTGTAAAGAGTCTACCACATGTG" +
               "TTTCGCATGTAGAACTTTCATAATTCTTTAGATTATCTATACTAAGAGAGTATTTATTCATGTGTATCGCATGTTGG" +
               "CAAATGTATCTTTACAAACAAATGTGAGAACAAGTAAAGGATTTATTCATGTGTCTCGCATGT",
  marshill_repeat: "ATTTTATATAGAATAATATAAAATAGATCATATGAATACGTATGATCTTAATTAAAATTAAGCTATATCTTATTAAATTAAGGT" +
                   "AATCATATGAATACGTATGATTTAAATTTATTTAAGT",
  random_control: "ATCGATCGATCGTAGCTAGCTCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCG",
};

const PARTNER_COLORS = {
  TYPE_I: 'bg-amber-900/30 border-amber-500/50 text-amber-300',
  TYPE_II: 'bg-blue-900/30 border-blue-500/50 text-blue-300',
  TYPE_III: 'bg-green-900/30 border-green-500/50 text-green-300',
};

export default function ArtResearchView() {
  const [activeTab, setActiveTab] = useState('overview');
  const [reference, setReference] = useState(null);
  const [loadingRef, setLoadingRef] = useState(true);

  // Array scan state
  const [scanSeq, setScanSeq] = useState(EXAMPLE_SEQUENCES.L0050_array);
  const [scanResult, setScanResult] = useState(null);
  const [scanLoading, setScanLoading] = useState(false);

  // Locus analysis state
  const [locusUpstream, setLocusUpstream] = useState(EXAMPLE_SEQUENCES.L0050_array);
  const [locusRtSeq, setLocusRtSeq] = useState('');
  const [locusPartnerAnnotation, setLocusPartnerAnnotation] = useState('GNAT acetyltransferase-like hypothetical protein');
  const [locusGenomeSource, setLocusGenomeSource] = useState('Jumbo bacteriophage MarsHill (Listeria phage)');
  const [locusResult, setLocusResult] = useState(null);
  const [locusLoading, setLocusLoading] = useState(false);

  // RNA structure state
  const [rnaSeq, setRnaSeq] = useState('CATGTGTATCGCATGTTAATTTAAAGGATTTATA');
  const [rnaResult, setRnaResult] = useState(null);
  const [rnaLoading, setRnaLoading] = useState(false);

  // Therapeutic potential state
  const [tpGene, setTpGene] = useState('KRAS');
  const [tpEditType, setTpEditType] = useState('substitution');
  const [tpDelivery, setTpDelivery] = useState('lentiviral');
  const [tpCancer, setTpCancer] = useState('pancreatic adenocarcinoma');
  const [tpResult, setTpResult] = useState(null);
  const [tpLoading, setTpLoading] = useState(false);

  // ── SPRINT 4: FORWARD ART CONSTRUCT WRITER STATE (Spec 07 & 08) ───────────
  const [fwGenePreset, setFwGenePreset] = useState('DMD_EXON45_55');
  const [fwGeneName, setFwGeneName] = useState('DMD');
  const [fwSequence, setFwSequence] = useState('');
  const [fwArtSystem, setFwArtSystem] = useState('TYPE_I_LISTERIA');
  const [fwTargetCell, setFwTargetCell] = useState('Primary CD34+ HSPCs');
  const [fwUnitSize, setFwUnitSize] = useState(200);
  const [fwLoading, setFwLoading] = useState(false);
  const [fwResult, setFwResult] = useState(null);
  const [fwError, setFwError] = useState('');
  const [presetsData, setPresetsData] = useState(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [copiedArrayFasta, setCopiedArrayFasta] = useState(false);

  // ── SPRINT 6: RETRON & DGR SYNTHESIZER STATE (Spec 12) ───────────────────
  const [retroSubTab, setRetroSubTab] = useState('retron'); // 'retron' | 'dgr' | 'modality'
  const [retroPresets, setRetroPresets] = useState([]);

  // Retron State
  const [retronGene, setRetronGene] = useState('KRAS');
  const [retronMutation, setRetronMutation] = useState('c.35G>A (p.G12D)');
  const [retronChassis, setRetronChassis] = useState('Eco1');
  const [retronDonor, setRetronDonor] = useState('TGTGGTAGTTGGAGCTGGTGGCGTAGGCAAGAGTGCCTTGACGATACAGCTAATTCAGAATCATTTTGTGGACGAATAT');
  const [retronResult, setRetronResult] = useState(null);
  const [retronLoading, setRetronLoading] = useState(false);
  const [copiedRetronFasta, setCopiedRetronFasta] = useState(false);

  // DGR State
  const [dgrProtein, setDgrProtein] = useState('Trastuzumab scFv (anti-HER2)');
  const [dgrLoop, setDgrLoop] = useState('WGGDGFYAMDY');
  const [dgrSystem, setDgrSystem] = useState('Bordetella_BPP1');
  const [dgrResult, setDgrResult] = useState(null);
  const [dgrLoading, setDgrLoading] = useState(false);
  const [copiedDgrLibrary, setCopiedDgrLibrary] = useState(false);

  // Modality State
  const [compGene, setCompGene] = useState('KRAS');
  const [compMutation, setCompMutation] = useState('G12D');
  const [compEditType, setCompEditType] = useState('POINT_MUTATION');
  const [compLength, setCompLength] = useState(1);
  const [compResult, setCompResult] = useState(null);
  const [compLoading, setCompLoading] = useState(false);

  useEffect(() => {
    api.getArtReference().then(data => {
      setReference(data);
      setLoadingRef(false);
    }).catch(() => setLoadingRef(false));

    api.getArtPresets().then(data => {
      setPresetsData(data);
      if (data.therapeutic_genes && data.therapeutic_genes['DMD_EXON45_55']) {
        setFwSequence(data.therapeutic_genes['DMD_EXON45_55'].cDNA_sample);
      }
    }).catch(() => {});
  }, []);

  const handlePresetChange = (presetKey) => {
    setFwGenePreset(presetKey);
    if (presetsData?.therapeutic_genes?.[presetKey]) {
      const g = presetsData.therapeutic_genes[presetKey];
      setFwGeneName(g.gene);
      setFwSequence(g.cDNA_sample);
    }
  };

  const runForwardArtDesigner = async () => {
    if (!fwSequence) return;
    setFwLoading(true);
    setFwError('');
    try {
      const res = await api.designArtConstruct({
        cDNA_sequence: fwSequence.replace(/\s+/g, ''),
        gene_name: fwGeneName || 'THERAPEUTIC_GENE',
        art_system_type: fwArtSystem,
        target_unit_size: Number(fwUnitSize),
        target_cell_type: fwTargetCell
      });
      setFwResult(res);
    } catch (err) {
      setFwError(err.message || 'Construct design failed');
    } finally {
      setFwLoading(false);
    }
  };

  const fetchRetroPresets = async () => {
    try {
      const res = await api.getRetroelementPresets();
      if (res?.presets) setRetroPresets(res.presets);
    } catch (e) {
      console.warn('Failed loading retroelement presets:', e);
    }
  };

  const applyRetroPreset = (p) => {
    if (p.modality === 'RETRON_EDITOR') {
      setRetroSubTab('retron');
      setRetronGene(p.target_gene);
      setRetronMutation(p.target_mutation);
      setRetronChassis(p.retron_chassis);
      if (p.donor_payload_seq) setRetronDonor(p.donor_payload_seq);
    } else if (p.modality === 'DGR_MUTAGENESIS') {
      setRetroSubTab('dgr');
      setDgrProtein(p.target_protein);
      setDgrLoop(p.loop_sequence);
      setDgrSystem(p.dgr_system);
    }
  };

  const runDesignRetron = async () => {
    setRetronLoading(true);
    try {
      const res = await api.designRetron({
        target_gene: retronGene,
        target_mutation: retronMutation,
        donor_payload_seq: retronDonor,
        retron_chassis: retronChassis
      });
      setRetronResult(res.design);
    } catch (e) {
      console.error(e);
    } finally {
      setRetronLoading(false);
    }
  };

  const runDesignDgr = async () => {
    setDgrLoading(true);
    try {
      const res = await api.designDgrLibrary({
        target_protein_name: dgrProtein,
        loop_sequence: dgrLoop,
        dgr_system: dgrSystem
      });
      setDgrResult(res.library);
    } catch (e) {
      console.error(e);
    } finally {
      setDgrLoading(false);
    }
  };

  const runModalityComparison = async () => {
    setCompLoading(true);
    try {
      const res = await api.compareModalities({
        target_gene: compGene,
        target_mutation: compMutation,
        desired_edit_type: compEditType,
        target_length_bp: parseInt(compLength) || 1
      });
      setCompResult(res.comparison);
    } catch (e) {
      console.error(e);
    } finally {
      setCompLoading(false);
    }
  };

  const copyFasta = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedArrayFasta(true);
    setTimeout(() => setCopiedArrayFasta(false), 3000);
  };

  const downloadIdtCsv = (units, gene) => {
    const headers = "Well,Oligo_Name,Sequence,Length_nt,Scale,Purification\n";
    const rows = units.map(u => `${u.well},${u.oligo_name},${u.sequence},${u.length_nt},${u.scale},${u.purification}`).join("\n");
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${gene}_ART_96Well_Plate_IDT_Order.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const runScan = async () => {
    setScanLoading(true);
    setScanResult(null);
    try {
      const res = await api.artScanArray(scanSeq.replace(/\s/g, ''));
      setScanResult(res);
    } catch (e) {
      setScanResult({ error: e.message });
    }
    setScanLoading(false);
  };

  const runLocusAnalysis = async () => {
    setLocusLoading(true);
    setLocusResult(null);
    try {
      const res = await api.artAnalyzeLocus(
        locusUpstream.replace(/\s/g, ''),
        locusRtSeq.replace(/\s/g, '') || null,
        locusPartnerAnnotation || null,
        locusGenomeSource || null
      );
      setLocusResult(res);
    } catch (e) {
      setLocusResult({ error: e.message });
    }
    setLocusLoading(false);
  };

  const runRnaStructure = async () => {
    setRnaLoading(true);
    setRnaResult(null);
    try {
      const res = await api.artPredictRnaStructure(rnaSeq.replace(/\s/g, ''));
      setRnaResult(res);
    } catch (e) {
      setRnaResult({ error: e.message });
    }
    setRnaLoading(false);
  };

  const runTherapeuticPotential = async () => {
    setTpLoading(true);
    setTpResult(null);
    try {
      const res = await api.artTherapeuticPotential(tpGene, tpEditType, tpDelivery, tpCancer);
      setTpResult(res);
    } catch (e) {
      setTpResult({ error: e.message });
    }
    setTpLoading(false);
  };

  const ConfidenceBadge = ({ confidence }) => {
    const colors = {
      'HIGH': 'bg-green-900 text-green-300',
      'MODERATE': 'bg-yellow-900 text-yellow-300',
      'LOW': 'bg-red-900 text-red-300',
      'N/A': 'bg-gray-800 text-gray-400',
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-bold ${colors[confidence] || colors['N/A']}`}>
        {confidence}
      </span>
    );
  };

  const ScoreBar = ({ score, max = 100 }) => (
    <div className="w-full bg-gray-800 rounded-full h-3 mt-1">
      <div
        className={`h-3 rounded-full transition-all ${score >= 60 ? 'bg-green-500' : score >= 35 ? 'bg-yellow-500' : 'bg-red-500'}`}
        style={{ width: `${Math.min(100, (score / max) * 100)}%` }}
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">🧬</span>
          <div>
            <h1 className="text-2xl font-bold text-violet-400">
              ART Research Module
            </h1>
            <p className="text-sm text-gray-400">
              Array-Associated Reverse Transcriptases — Yoon, Athukoralage et al. (Anthropic, Sep 2026)
            </p>
          </div>
          <span className="ml-auto px-3 py-1 bg-violet-900/40 border border-violet-500/30 rounded text-violet-300 text-xs font-bold">
            NOVEL SYSTEM • FUNCTION UNKNOWN
          </span>
        </div>
        <div className="bg-violet-950/30 border border-violet-500/30 rounded-lg p-3 text-sm text-violet-200">
          <strong>Discovery:</strong> Claude AI agents autonomously discovered ART by reading raw phage DNA sequences and recognizing
          CRISPR-like tandem repeat arrays upstream of a novel reverse transcriptase family. 949 agent sessions,
          215.6M tokens, 21.5 hours — without human intervention.
          <a href="https://www.anthropic.com/news/claude-discovers-novel-enzyme-system" target="_blank"
            rel="noopener noreferrer" className="ml-2 text-violet-400 underline hover:text-violet-300">
            Read the paper →
          </a>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-800">
        {[
          { id: 'overview', label: '📖 Overview' },
          { id: 'forward_writer', label: '🚀 Forward ART Designer (Sprint 4)' },
          { id: 'retroelements', label: '🧬 Retron & DGR Synthesizer (Sprint 6)' },
          { id: 'scan', label: '🔍 Array Scanner' },
          { id: 'locus', label: '🗺 Locus Analyzer' },
          { id: 'rna', label: '🔬 RNA Structure' },
          { id: 'therapeutic', label: '💊 Therapeutic Potential' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              if (tab.id === 'retroelements' && retroPresets.length === 0) fetchRetroPresets();
            }}
            className={`px-4 py-2 text-sm rounded-t transition-colors ${
              activeTab === tab.id
                ? 'bg-violet-900/50 text-violet-300 border-b-2 border-violet-400'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* === OVERVIEW TAB === */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {loadingRef ? (
            <div className="text-gray-400 text-center py-10">Loading ART reference data...</div>
          ) : reference ? (
            <>
              {/* 3-Component Architecture */}
              <div>
                <h2 className="text-lg font-bold text-violet-300 mb-3">ART System Architecture</h2>
                <div className="grid grid-cols-3 gap-4">
                  {Object.entries(reference.system_components || {}).map(([key, comp]) => (
                    <div key={key} className="bg-gray-900 border border-gray-700 rounded-lg p-4">
                      <div className="text-xs font-bold text-violet-400 uppercase mb-2">
                        Component {key.split('_')[0]}
                      </div>
                      <div className="font-semibold text-white mb-2">{comp.description}</div>
                      {comp.unit_size_nt && (
                        <div className="space-y-1 text-sm text-gray-300">
                          <div>Unit size: <span className="text-violet-300">{comp.unit_size_nt} nt</span></div>
                          <div>Repeat core: <span className="text-violet-300">{comp.repeat_core_length_nt} nt</span></div>
                          <div className="text-xs text-gray-400">{comp.repeat_core_feature}</div>
                          <div className="text-xs text-amber-300 mt-1">▶ {comp.expression}</div>
                        </div>
                      )}
                      {comp.ntd_length_aa && (
                        <div className="space-y-1 text-sm text-gray-300">
                          <div>NTD: <span className="text-violet-300">{comp.ntd_length_aa}</span></div>
                          <div>Motif: <span className="font-mono text-green-300">{comp.catalytic_motif}</span></div>
                          <div className="text-xs text-gray-400">Phylogeny: {comp.phylogeny}</div>
                        </div>
                      )}
                      {comp.types && (
                        <div className="space-y-2 mt-2">
                          {Object.entries(comp.types).map(([typeKey, typeInfo]) => (
                            <div key={typeKey} className={`rounded p-2 border text-xs ${PARTNER_COLORS[typeKey]}`}>
                              <div className="font-bold">{typeKey}: {typeInfo.name}</div>
                              <div>{typeInfo.approx_aa_length} aa • {typeInfo.phage_clade}</div>
                              <div className="text-gray-400 mt-1 text-xs">{typeInfo.functional_hypothesis.substring(0, 80)}...</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* ART vs CRISPR */}
              <div>
                <h2 className="text-lg font-bold text-violet-300 mb-3">ART vs. CRISPR Comparison</h2>
                <div className="bg-gray-900 rounded-lg overflow-hidden border border-gray-700">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-800 text-left">
                        <th className="p-3 text-gray-400">Property</th>
                        <th className="p-3 text-blue-300">CRISPR</th>
                        <th className="p-3 text-violet-300">ART</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reference.vs_crispr && Object.entries(reference.vs_crispr).map(([key, val]) => (
                        <tr key={key} className="border-t border-gray-800">
                          <td className="p-3 text-gray-400 capitalize">{key.replace(/_/g, ' ')}</td>
                          <td className="p-3 text-blue-200">
                            {typeof val.CRISPR === 'object' ? JSON.stringify(val.CRISPR) : String(val.CRISPR)}
                          </td>
                          <td className="p-3 text-violet-200">
                            {typeof val.ART === 'object' ? JSON.stringify(val.ART) : String(val.ART)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Current Status */}
              <div className="bg-amber-950/30 border border-amber-500/30 rounded-lg p-4">
                <h3 className="text-amber-400 font-bold mb-2">⚠ Current Research Status</h3>
                <p className="text-amber-200 text-sm">{reference.current_status}</p>
                <p className="text-gray-400 text-xs mt-2">{reference.therapeutic_outlook}</p>
              </div>

              {/* Discovery metadata */}
              <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
                <h3 className="text-violet-300 font-bold mb-3">Discovery Details</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-gray-400">Paper: </span><span className="text-gray-200">{reference.discovery?.paper}</span></div>
                  <div><span className="text-gray-400">Date: </span><span className="text-gray-200">{reference.discovery?.date}</span></div>
                  <div><span className="text-gray-400">Method: </span><span className="text-violet-300">{reference.discovery?.discovery_method}</span></div>
                  <div>
                    <a href={reference.discovery?.preprint_url} target="_blank" rel="noopener noreferrer"
                      className="text-violet-400 underline hover:text-violet-300">
                      Download Preprint PDF →
                    </a>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-red-400 text-sm">Failed to load reference data. Is the backend running?</div>
          )}
        </div>
      )}

      {/* === ARRAY SCANNER TAB === */}
      {activeTab === 'scan' && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-violet-300">ART Repeat Array Scanner</h2>
          <p className="text-sm text-gray-400">
            Scans a DNA sequence for CRISPR-like tandem repeat arrays characteristic of ART systems.
            The repeat core is ~16-17 nt with an inverted palindrome, spaced by ~200 nt units.
          </p>
          <div className="flex gap-2 flex-wrap">
            {Object.entries(EXAMPLE_SEQUENCES).map(([name, seq]) => (
              <button key={name} onClick={() => setScanSeq(seq)}
                className="px-3 py-1 text-xs bg-gray-800 text-gray-300 border border-gray-600 rounded hover:bg-gray-700">
                Load: {name}
              </button>
            ))}
          </div>
          <textarea
            value={scanSeq}
            onChange={e => setScanSeq(e.target.value)}
            className="w-full h-40 bg-gray-900 border border-gray-700 rounded p-3 font-mono text-sm text-green-300 focus:outline-none focus:border-violet-500"
            placeholder="Paste DNA sequence to scan for ART repeat arrays..."
          />
          <button onClick={runScan} disabled={scanLoading}
            className="px-6 py-2 bg-violet-700 hover:bg-violet-600 disabled:opacity-50 rounded text-white font-bold">
            {scanLoading ? '⏳ Scanning...' : '🔍 Scan for ART Arrays'}
          </button>
          {scanResult && (
            <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 space-y-3">
              <div className={`text-sm font-bold ${scanResult.arrays_found?.length > 0 ? 'text-green-400' : 'text-gray-400'}`}>
                {scanResult.summary}
              </div>
              {scanResult.known_core_hits?.map((hit, i) => (
                <div key={i} className="bg-green-950/30 border border-green-500/30 rounded p-3 text-sm">
                  <div className="font-bold text-green-400 mb-1">✓ Known ART Repeat: {hit.known_system}</div>
                  <div className="font-mono text-xs text-green-300 mb-1">{hit.core_sequence}</div>
                  <div className="text-gray-300">Copies found: {hit.n_copies_found} | Mean spacer: {hit.mean_spacer_nt} nt | Strand: {hit.strand}</div>
                </div>
              ))}
              {scanResult.de_novo_repeats?.filter(r => r.art_array_candidate).map((rep, i) => (
                <div key={i} className="bg-violet-950/30 border border-violet-500/30 rounded p-3 text-sm">
                  <div className="font-bold text-violet-400 mb-1">Candidate ART Array ({rep.n_copies} copies)</div>
                  <div className="font-mono text-xs text-violet-300 mb-1">{rep.kmer} ({rep.kmer_length} nt)</div>
                  <div className="text-gray-300">
                    Mean spacer: {rep.mean_spacer_nt} nt | Palindrome score: {rep.palindrome_score} | CRISPR-like: {rep.is_crispr_like ? '✓' : '✗'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* === LOCUS ANALYZER TAB === */}
      {activeTab === 'locus' && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-violet-300">ART Locus Analyzer</h2>
          <p className="text-sm text-gray-400">
            Analyzes a genomic locus against all 4 ART hallmarks and returns a scored classification.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Upstream DNA Sequence (5′ of RT gene)</label>
              <textarea value={locusUpstream} onChange={e => setLocusUpstream(e.target.value)}
                className="w-full h-36 bg-gray-900 border border-gray-700 rounded p-2 font-mono text-xs text-green-300 focus:outline-none focus:border-violet-500"
                placeholder="DNA sequence upstream of RT..." />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">RT Protein Sequence (optional)</label>
              <textarea value={locusRtSeq} onChange={e => setLocusRtSeq(e.target.value)}
                className="w-full h-36 bg-gray-900 border border-gray-700 rounded p-2 font-mono text-xs text-yellow-300 focus:outline-none focus:border-violet-500"
                placeholder="RT amino acid sequence (optional)..." />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Downstream Gene Annotation</label>
              <input value={locusPartnerAnnotation} onChange={e => setLocusPartnerAnnotation(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-sm focus:outline-none focus:border-violet-500"
                placeholder="e.g. 'GNAT acetyltransferase hypothetical protein'" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Genome Source</label>
              <input value={locusGenomeSource} onChange={e => setLocusGenomeSource(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-sm focus:outline-none focus:border-violet-500"
                placeholder="e.g. 'Jumbo bacteriophage SA1 (Staphylococcus)'" />
            </div>
          </div>
          <button onClick={runLocusAnalysis} disabled={locusLoading}
            className="px-6 py-2 bg-violet-700 hover:bg-violet-600 disabled:opacity-50 rounded text-white font-bold">
            {locusLoading ? '⏳ Analyzing...' : '🗺 Analyze ART Locus'}
          </button>
          {locusResult && !locusResult.error && (
            <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-3">
                <span className={`text-lg font-bold ${locusResult.confidence === 'HIGH' ? 'text-green-400' : locusResult.confidence === 'MODERATE' ? 'text-yellow-400' : 'text-red-400'}`}>
                  {locusResult.classification}
                </span>
                <ConfidenceBadge confidence={locusResult.confidence} />
                <span className="ml-auto text-gray-400 text-sm">Score: {locusResult.total_score}/100</span>
              </div>
              <ScoreBar score={locusResult.total_score} />
              <div>
                <div className="text-sm text-gray-400 mb-2">Evidence:</div>
                <ul className="space-y-1">
                  {locusResult.evidence?.map((e, i) => (
                    <li key={i} className="text-sm text-gray-300 flex gap-2">
                      <span className="text-green-400">✓</span>{e}
                    </li>
                  ))}
                </ul>
              </div>
              {locusResult.flags?.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {locusResult.flags.map(flag => (
                    <span key={flag} className="px-2 py-1 text-xs bg-violet-900 text-violet-300 rounded">{flag}</span>
                  ))}
                </div>
              )}
              <div className="bg-blue-950/30 border border-blue-500/30 rounded p-3 text-sm text-blue-200">
                <strong>Recommendation: </strong>{locusResult.recommendation}
              </div>
            </div>
          )}
        </div>
      )}

      {/* === RNA STRUCTURE TAB === */}
      {activeTab === 'rna' && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-violet-300">ART Repeat RNA Hairpin Predictor</h2>
          <p className="text-sm text-gray-400">
            ART repeat cores contain inverted palindromes that fold into RNA hairpins when transcribed.
            These stem-loop structures may scaffold the RT-ncRNA complex (analogous to retron msr RNA).
          </p>
          <div>
            <label className="block text-sm text-gray-400 mb-1">ART Repeat Unit / Core DNA Sequence</label>
            <input value={rnaSeq} onChange={e => setRnaSeq(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded p-3 font-mono text-sm text-green-300 focus:outline-none focus:border-violet-500"
              placeholder="Enter ART repeat core DNA sequence..." />
            <div className="text-xs text-gray-500 mt-1">
              Example cores: L0050: CATGTGTATCGCATGT | MarsHill: TATGAATACGTAT
            </div>
          </div>
          <button onClick={runRnaStructure} disabled={rnaLoading}
            className="px-6 py-2 bg-violet-700 hover:bg-violet-600 disabled:opacity-50 rounded text-white font-bold">
            {rnaLoading ? '⏳ Predicting...' : '🔬 Predict RNA Hairpin'}
          </button>
          {rnaResult && !rnaResult.error && (
            <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 space-y-3">
              <div className={`text-lg font-bold ${rnaResult.art_ncRNA_candidate ? 'text-green-400' : 'text-gray-400'}`}>
                {rnaResult.stability_classification}
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="bg-gray-800 rounded p-3">
                  <div className="text-gray-400 text-xs">ΔG (hairpin)</div>
                  <div className={`text-xl font-bold ${rnaResult.predicted_hairpin_dg_kcal_mol <= -6 ? 'text-green-400' : rnaResult.predicted_hairpin_dg_kcal_mol <= -3 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {rnaResult.predicted_hairpin_dg_kcal_mol} kcal/mol
                  </div>
                </div>
                <div className="bg-gray-800 rounded p-3">
                  <div className="text-gray-400 text-xs">Stem Length</div>
                  <div className="text-xl font-bold text-violet-300">{rnaResult.stem_length_bp} bp</div>
                  <div className="text-xs text-gray-400">{rnaResult.base_pairs_in_stem} base pairs</div>
                </div>
                <div className="bg-gray-800 rounded p-3">
                  <div className="text-gray-400 text-xs">Loop Size</div>
                  <div className="text-xl font-bold text-blue-300">{rnaResult.loop_size_nt} nt</div>
                  <div className="text-xs text-gray-400">RNA: {rnaResult.rna_length_nt} nt total</div>
                </div>
              </div>
              {rnaResult.stem_sequence && (
                <div className="bg-gray-800 rounded p-3">
                  <div className="text-gray-400 text-xs mb-1">Best Stem Sequence</div>
                  <div className="font-mono text-green-300 text-sm">{rnaResult.stem_sequence}</div>
                </div>
              )}
              <div className="text-xs text-gray-400 italic">{rnaResult.structural_note}</div>
              {rnaResult.art_ncRNA_candidate && (
                <div className="bg-green-950/30 border border-green-500/30 rounded p-3 text-sm text-green-200">
                  ✓ This repeat core is predicted to form a stable RNA hairpin consistent with ART ncRNA function.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* === THERAPEUTIC POTENTIAL TAB === */}
      {activeTab === 'therapeutic' && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-violet-300">ART Therapeutic Potential Evaluator</h2>
          <div className="bg-amber-950/30 border border-amber-500/30 rounded-lg p-3 text-sm text-amber-200">
            ⚠ <strong>Research Hypothesis Only.</strong> ART's molecular function is completely unknown as of September 2026.
            All therapeutic applications are speculative research directions. TRL 1.
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Target Gene</label>
              <input value={tpGene} onChange={e => setTpGene(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-sm focus:outline-none focus:border-violet-500"
                placeholder="e.g. KRAS, TP53, BRCA2" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Edit Type</label>
              <select value={tpEditType} onChange={e => setTpEditType(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-sm focus:outline-none focus:border-violet-500">
                <option value="substitution">Substitution (SNV correction)</option>
                <option value="insertion">Insertion</option>
                <option value="deletion">Deletion</option>
                <option value="methylation">Methylation (epigenome)</option>
                <option value="acetylation">Acetylation (Type I GNAT)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Delivery System</label>
              <select value={tpDelivery} onChange={e => setTpDelivery(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-sm focus:outline-none focus:border-violet-500">
                <option value="lentiviral">Lentiviral</option>
                <option value="AAV">AAV</option>
                <option value="LNP">LNP (mRNA)</option>
                <option value="phage">Phage (bacteriophage delivery)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Cancer Context (optional)</label>
              <input value={tpCancer} onChange={e => setTpCancer(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-sm focus:outline-none focus:border-violet-500"
                placeholder="e.g. pancreatic adenocarcinoma, NSCLC, lymphoma" />
            </div>
          </div>
          <button onClick={runTherapeuticPotential} disabled={tpLoading}
            className="px-6 py-2 bg-violet-700 hover:bg-violet-600 disabled:opacity-50 rounded text-white font-bold">
            {tpLoading ? '⏳ Evaluating...' : '💊 Evaluate Therapeutic Potential'}
          </button>
          {tpResult && !tpResult.error && (
            <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 space-y-4">
              <div className="flex items-center gap-4">
                <div>
                  <div className="text-gray-400 text-xs">Technology Readiness Level</div>
                  <div className="text-yellow-300 font-bold">{tpResult.technology_readiness_level}</div>
                  <div className="text-xs text-gray-400">{tpResult.trl_description}</div>
                </div>
                <div>
                  <div className="text-gray-400 text-xs">Estimated Timeline</div>
                  <div className="text-red-300 font-bold">{tpResult.estimated_years_to_therapeutic_application}</div>
                </div>
              </div>

              {tpResult.oncology_relevance && (
                <div className="bg-blue-950/30 border border-blue-500/30 rounded p-3 text-sm text-blue-200">
                  <strong>Oncology Relevance: </strong>{tpResult.oncology_relevance}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-green-400 font-bold text-sm mb-2">Potential Advantages</div>
                  <ul className="space-y-1">
                    {tpResult.advantages?.map((a, i) => (
                      <li key={i} className="text-xs text-gray-300 flex gap-2"><span className="text-green-400 mt-0.5">+</span>{a}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="text-red-400 font-bold text-sm mb-2">Current Limitations</div>
                  <ul className="space-y-1">
                    {tpResult.limitations?.map((l, i) => (
                      <li key={i} className="text-xs text-gray-300 flex gap-2"><span className="text-red-400 mt-0.5">−</span>{l}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div>
                <div className="text-violet-400 font-bold text-sm mb-2">Required Experimental Steps (Before Any Application)</div>
                <ol className="space-y-1">
                  {tpResult.next_experimental_steps?.map((step, i) => (
                    <li key={i} className="text-xs text-gray-300">{step}</li>
                  ))}
                </ol>
              </div>

              <div className="bg-blue-950/30 border border-blue-500/30 rounded p-3 text-xs">
                <div className="text-blue-300 font-bold mb-1">ART vs Prime Editing</div>
                <div className="text-gray-300"><strong>Prime Editing:</strong> {tpResult.comparison_to_prime_editing?.prime_editing}</div>
                <div className="text-violet-300 mt-1"><strong>ART Potential:</strong> {tpResult.comparison_to_prime_editing?.art_potential}</div>
              </div>

              <div className="text-xs text-gray-500 italic">{tpResult.research_status_disclaimer}</div>
            </div>
          )}
        </div>
      )}

      {/* === SPRINT 4: FORWARD ART CONSTRUCT DESIGNER TAB === */}
      {activeTab === 'forward_writer' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Input & Configuration (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>🚀</span> Forward DNA Writing Configuration
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  Designs tandem repeat ncDNA arrays to write large therapeutic cDNAs in human cells using phage ART systems.
                </p>
              </div>

              {/* Preset Selector */}
              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1 uppercase tracking-wider">
                  Therapeutic Target Preset:
                </label>
                <select
                  value={fwGenePreset}
                  onChange={(e) => handlePresetChange(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-700 text-gray-200 text-xs rounded-lg p-2.5 font-medium focus:ring-1 focus:ring-violet-500 focus:outline-none"
                >
                  <option value="DMD_EXON45_55">DMD Exons 45-55 (Duchenne Muscular Dystrophy - 3.6 kb)</option>
                  <option value="CFTR_FULL">CFTR Full-Length cDNA (Cystic Fibrosis - 4.4 kb)</option>
                  <option value="HBB_CORRECTED">HBB Corrected Coding cDNA (Sickle Cell - 1.6 kb)</option>
                  <option value="CUSTOM">Custom cDNA Sequence</option>
                </select>
              </div>

              {/* Gene Name & cDNA Input */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <label className="font-semibold text-gray-300 uppercase tracking-wider">cDNA Coding Sequence:</label>
                  <span className="font-mono text-cyan-400">{fwSequence.replace(/\s+/g, '').length} bp</span>
                </div>
                <textarea
                  value={fwSequence}
                  onChange={(e) => setFwSequence(e.target.value)}
                  placeholder="Paste coding cDNA sequence (A, C, G, T)..."
                  rows={5}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg p-2.5 text-xs font-mono text-gray-300 focus:border-violet-500 focus:outline-none break-all"
                />
              </div>

              {/* ART System Selector */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-300 block uppercase tracking-wider">
                  ART Effector System:
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { id: 'TYPE_I_LISTERIA', name: 'Type I (Listeria L0050)', partner: 'GNAT Acetyltransferase fold (~600 aa)', badge: 'Epigenetic & Long-Template' },
                    { id: 'TYPE_II_STAPH', name: 'Type II (Staph SA1)', partner: 'All-Helical fold (~270 aa)', badge: 'High Burst Transcription' },
                    { id: 'TYPE_III_ENV', name: 'Type III (Metagenomic)', partner: 'Minimal Helical (~170 aa)', badge: 'AAV/Lentiviral Compact' }
                  ].map((sys) => (
                    <button
                      key={sys.id}
                      type="button"
                      onClick={() => setFwArtSystem(sys.id)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        fwArtSystem === sys.id
                          ? 'bg-violet-950/60 border-violet-500 shadow-sm ring-1 ring-violet-500/50'
                          : 'bg-gray-950 border-gray-800 hover:border-gray-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-white">{sys.name}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-900/60 text-violet-300 border border-violet-700 font-semibold">
                          {sys.badge}
                        </span>
                      </div>
                      <div className="text-[11px] text-gray-400 mt-1">{sys.partner}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Target Cell Type */}
              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1 uppercase tracking-wider">
                  Target Human Cell Lineage:
                </label>
                <select
                  value={fwTargetCell}
                  onChange={(e) => setFwTargetCell(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-700 text-gray-200 text-xs rounded-lg p-2.5 font-medium focus:ring-1 focus:ring-violet-500 focus:outline-none"
                >
                  <option value="Primary CD34+ HSPCs">Primary CD34+ HSPCs (Bone Marrow)</option>
                  <option value="Primary CD4+/CD8+ T-Cells">Primary CD4+/CD8+ T-Cells (Adoptive Transfer)</option>
                  <option value="Skeletal Myocytes (DMD)">Skeletal Myocytes (Duchenne / Muscular)</option>
                  <option value="Primary Cortical Neurons">Primary Cortical Neurons (CNS)</option>
                  <option value="Hepatocytes (Liver)">Hepatocytes (Metabolic Liver Diseases)</option>
                </select>
              </div>

              {/* Processivity Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-300 font-semibold uppercase">RT Processivity Unit Size:</span>
                  <span className="font-mono font-bold text-violet-300">{fwUnitSize} bp / unit</span>
                </div>
                <input
                  type="range"
                  min={120}
                  max={280}
                  step={10}
                  value={fwUnitSize}
                  onChange={(e) => setFwUnitSize(e.target.value)}
                  className="w-full accent-violet-500"
                />
                <div className="flex justify-between text-[10px] text-gray-500">
                  <span>120 bp (Ultra-High Fidelity)</span>
                  <span>200 bp (Optimal)</span>
                  <span>280 bp (Max Processivity)</span>
                </div>
              </div>

              {fwError && (
                <div className="p-3 bg-red-950/60 border border-red-800 text-red-300 rounded-lg text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" /> {fwError}
                </div>
              )}

              <button
                type="button"
                onClick={runForwardArtDesigner}
                disabled={fwLoading || !fwSequence}
                className="w-full py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-violet-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {fwLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>⚡ Synthesize ART Tandem Array</span>}
              </button>
            </div>
          </div>

          {/* Right: Construct Map, Efficiency & Order Actions (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            {fwLoading ? (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-16 text-center text-gray-400 text-xs">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-violet-400" />
                Fragmenting cDNA and assembling phage ART repeat hairpin array...
              </div>
            ) : fwResult ? (
              <div className="space-y-4">
                {/* Construct Summary Card */}
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-800">
                    <div>
                      <div className="text-base font-bold text-white font-mono flex items-center gap-2">
                        <span>{fwResult.construct_id}</span>
                        <span className="text-xs px-2 py-0.5 bg-violet-900/60 border border-violet-700 text-violet-300 rounded font-sans font-semibold">
                          {fwResult.total_units} Tandem Units
                        </span>
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        cDNA Input: <strong className="text-gray-200">{fwResult.input_cDNA_length_bp} bp</strong> &bull; Total Array: <strong className="text-violet-300">{fwResult.total_array_length_bp} bp</strong>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs text-gray-400">Predicted Efficiency:</div>
                      <div className="text-xl font-bold font-mono text-emerald-400">
                        {fwResult.predicted_insertion_efficiency}%
                      </div>
                    </div>
                  </div>

                  {/* 5' -> 3' Linear Array Map */}
                  <div className="bg-gray-950 p-4 rounded-xl border border-gray-800 space-y-2.5">
                    <div className="text-xs font-semibold text-gray-300 uppercase tracking-wider flex items-center justify-between">
                      <span>Phage ART Tandem Repeat Architecture (5' &rarr; 3')</span>
                      <span className="text-[11px] text-gray-500 font-mono">Leader &bull; [Repeat Core + Spacer]_N &bull; Trailer</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1 text-xs font-mono">
                      <span className="px-2 py-1 rounded bg-gray-800 text-gray-400 border border-gray-700">5' Leader</span>
                      <span className="text-gray-600">&rarr;</span>
                      {fwResult.units.slice(0, 6).map((u) => (
                        <React.Fragment key={u.unit_number}>
                          <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800/80 font-bold text-[11px]">
                            Hairpin
                          </span>
                          <span className="px-2 py-0.5 rounded bg-violet-950 text-violet-200 border border-violet-800 text-[11px]">
                            U{u.unit_number} ({u.spacer_length}bp)
                          </span>
                          <span className="text-gray-600">&rarr;</span>
                        </React.Fragment>
                      ))}
                      {fwResult.total_units > 6 && (
                        <span className="text-gray-500 px-1 font-bold">+ {fwResult.total_units - 6} more units &rarr;</span>
                      )}
                      <span className="px-2 py-1 rounded bg-gray-800 text-gray-400 border border-gray-700">Trailer 3'</span>
                    </div>
                  </div>

                  {/* Cell-type Efficiency Bars */}
                  <div className="bg-gray-950/60 p-4 rounded-xl border border-gray-800 space-y-2.5">
                    <div className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                      Predicted Cell-Type Insertion Efficiencies (%):
                    </div>
                    <div className="space-y-2 text-xs">
                      {Object.entries(fwResult.cell_type_efficiencies || {}).map(([ctype, cinfo]) => (
                        <div key={ctype}>
                          <div className="flex justify-between text-gray-300 mb-0.5">
                            <span>{ctype}</span>
                            <span className="font-mono font-bold text-emerald-400">{cinfo.estimated_insertion_rate_pct}%</span>
                          </div>
                          <div className="w-full bg-gray-800 rounded-full h-2">
                            <div
                              className="bg-gradient-to-r from-violet-500 to-emerald-400 h-2 rounded-full"
                              style={{ width: `${Math.min(100, cinfo.estimated_insertion_rate_pct * 2.2)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions Row */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-gray-800">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => copyFasta(fwResult.fasta_export)}
                        className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>{copiedArrayFasta ? 'Copied FASTA!' : 'Copy FASTA'}</span>
                      </button>
                      <button
                        onClick={() => downloadIdtCsv(fwResult.idt_plate_orders, fwResult.gene_name)}
                        className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download IDT Plate CSV</span>
                      </button>
                    </div>

                    <button
                      onClick={() => setIsOrderModalOpen(true)}
                      className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-lg shadow-cyan-600/20 transition-all"
                    >
                      <ShoppingCart className="w-4 h-4" />
                      <span>Order from Synthesis Partner</span>
                    </button>
                  </div>
                </div>

                {/* Tandem Units Detail Table */}
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
                  <div className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                    Fragment Subunits Breakdown ({fwResult.units.length} Units)
                  </div>
                  <div className="max-h-64 overflow-y-auto pr-1">
                    <table className="w-full text-xs text-left">
                      <thead className="text-[11px] text-gray-400 uppercase bg-gray-950 sticky top-0">
                        <tr>
                          <th className="py-2 px-2.5">Unit</th>
                          <th className="py-2 px-2.5">cDNA Span</th>
                          <th className="py-2 px-2.5">Length</th>
                          <th className="py-2 px-2.5">GC%</th>
                          <th className="py-2 px-2.5">ΔG (Hairpin)</th>
                          <th className="py-2 px-2.5">QC</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800 font-mono">
                        {fwResult.units.map((u) => (
                          <tr key={u.unit_number} className="hover:bg-gray-800/40">
                            <td className="py-2 px-2.5 font-bold text-violet-300">#{u.unit_number}</td>
                            <td className="py-2 px-2.5 text-gray-300">{u.start_bp} - {u.end_bp} bp</td>
                            <td className="py-2 px-2.5">{u.spacer_length} nt</td>
                            <td className="py-2 px-2.5">{u.gc_content}%</td>
                            <td className="py-2 px-2.5 text-cyan-400">{u.repeat_delta_g} kcal/mol</td>
                            <td className="py-2 px-2.5">
                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                                u.qc_status === 'PASS'
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                  : 'bg-amber-950 text-amber-300 border border-amber-800'
                              }`}>
                                {u.qc_status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-16 text-center text-gray-500 text-xs">
                Configure your target gene on the left and click "Synthesize ART Tandem Array" to generate the forward writing construct blueprint.
              </div>
            )}
          </div>
        </div>
      )}

      {/* === SPRINT 6: BACTERIAL RETRON & DGR SYNTHESIZER TAB (Spec 12) === */}
      {activeTab === 'retroelements' && (
        <div className="space-y-6">
          {/* Preset Selector Banner */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Curated Retron & DGR Clinical Benchmarks (Click to Preload)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-2">
              {[
                {
                  id: 'kras_g12d',
                  label: 'KRAS G12D Retron',
                  modality: 'RETRON_EDITOR',
                  gene: 'KRAS',
                  mut: 'c.35G>A (p.G12D)',
                  chassis: 'Eco1',
                  donor: 'TGTGGTAGTTGGAGCTGGTGGCGTAGGCAAGAGTGCCTTGACGATACAGCTAATTCAGAATCATTTTGTGGACGAATAT',
                  badge: 'Eco1 msDNA'
                },
                {
                  id: 'tp53_r248w',
                  label: 'TP53 R248W Retron',
                  modality: 'RETRON_EDITOR',
                  gene: 'TP53',
                  mut: 'c.742C>T (p.R248W)',
                  chassis: 'Eco1',
                  donor: 'CATGGGCGGCATGAACCGGAGGCCCATCCTCACCATCATCACACTGGAAGACTCCAGTGGTAATCTACTGGGACGGAAC',
                  badge: 'DNA-Binding Restoration'
                },
                {
                  id: 'hbb_sickle',
                  label: 'HBB Sickle Cell Retron',
                  modality: 'RETRON_EDITOR',
                  gene: 'HBB',
                  mut: 'c.20A>T (p.E6V)',
                  chassis: 'Ec86',
                  donor: 'ACTCCTGAGGAGAAGTCTGCCGTTACTGCCCTGTGGGGCAAGGTGAACGTGGATGAAGTTGGTGGTGAGGCCCTGGGC',
                  badge: 'Ec86 Break-Free'
                },
                {
                  id: 'her2_dgr',
                  label: 'Anti-HER2 scFv DGR',
                  modality: 'DGR_MUTAGENESIS',
                  protein: 'Trastuzumab scFv (anti-HER2)',
                  loop: 'WGGDGFYAMDY',
                  system: 'Bordetella_BPP1',
                  badge: '4^6 Variants'
                },
                {
                  id: 'egfr_dgr',
                  label: 'Anti-EGFRvIII CAR DGR',
                  modality: 'DGR_MUTAGENESIS',
                  protein: 'anti-EGFRvIII scFv 2173',
                  loop: 'ARDGYDDYGAFDY',
                  system: 'Treponema_TdDGR',
                  badge: '4^9 Variants'
                }
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    if (p.modality === 'RETRON_EDITOR') {
                      setRetroSubTab('retron');
                      setRetronGene(p.gene);
                      setRetronMutation(p.mut);
                      setRetronChassis(p.chassis);
                      setRetronDonor(p.donor);
                    } else {
                      setRetroSubTab('dgr');
                      setDgrProtein(p.protein);
                      setDgrLoop(p.loop);
                      setDgrSystem(p.system);
                    }
                  }}
                  className="p-2.5 text-left bg-gray-950 border border-gray-800 hover:border-violet-500/50 rounded-lg transition-all group"
                >
                  <div className="text-xs font-bold text-gray-200 group-hover:text-violet-300">{p.label}</div>
                  <div className="text-[10px] text-violet-400 font-mono mt-0.5">{p.badge}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Sub-tab pills */}
          <div className="flex gap-2 border-b border-gray-800 pb-2">
            {[
              { id: 'retron', label: '🧬 Retron msDNA Editor' },
              { id: 'dgr', label: '🎲 DGR Targeted Hypermutagenesis' },
              { id: 'modality', label: '⚖️ 7-Modality Precision Comparison' }
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setRetroSubTab(st.id)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  retroSubTab === st.id
                    ? 'bg-violet-600 text-white shadow-md shadow-violet-900/30'
                    : 'bg-gray-900 text-gray-400 hover:text-white'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          {/* SUB-TAB 1: Retron msDNA Editor */}
          {retroSubTab === 'retron' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Inputs */}
              <div className="lg:col-span-5 bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center justify-between">
                  <span>msDNA Retron Configuration</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono">
                    DSB-Free HDR
                  </span>
                </h3>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Target Gene</label>
                    <input
                      type="text"
                      value={retronGene}
                      onChange={(e) => setRetronGene(e.target.value)}
                      className="w-full bg-gray-950 border border-gray-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-violet-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Mutation Target</label>
                    <input
                      type="text"
                      value={retronMutation}
                      onChange={(e) => setRetronMutation(e.target.value)}
                      className="w-full bg-gray-950 border border-gray-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-violet-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-400 block mb-1">Retron Chassis</label>
                  <select
                    value={retronChassis}
                    onChange={(e) => setRetronChassis(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500"
                  >
                    <option value="Eco1">Eco1 (E. coli — RetronEditor Broad 2022 Benchmark, 3.8x HDR)</option>
                    <option value="Ec86">Ec86 (E. coli Canonical high-yield, 2.5x HDR)</option>
                    <option value="Ec48">Ec48 (E. coli Thermotolerant 37°C-42°C, 3.2x HDR)</option>
                    <option value="Mx162">Mx162 (Myxococcus xanthus Large Cargo)</option>
                  </select>
                </div>

                <div>
                  <div className="flex justify-between items-center text-xs text-gray-400 mb-1">
                    <span>Donor Repair Sequence (msd loop):</span>
                    <span className="font-mono text-cyan-400">{retronDonor.replace(/\s+/g, '').length} nt</span>
                  </div>
                  <textarea
                    value={retronDonor}
                    onChange={(e) => setRetronDonor(e.target.value)}
                    rows={4}
                    className="w-full bg-gray-950 border border-gray-800 rounded-lg p-2.5 text-xs font-mono text-gray-200 focus:outline-none focus:border-violet-500 break-all"
                  />
                </div>

                <button
                  onClick={runDesignRetron}
                  disabled={retronLoading}
                  className="w-full py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-bold rounded-lg transition-all shadow-lg shadow-violet-900/30 flex items-center justify-center gap-2"
                >
                  {retronLoading ? 'Designing msDNA Cassette...' : 'Synthesize Retron msDNA Editor'}
                </button>
              </div>

              {/* Outputs */}
              <div className="lg:col-span-7 space-y-4">
                {retronResult ? (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="bg-gray-900 border border-gray-800 rounded-xl p-3">
                        <div className="text-[10px] uppercase font-bold text-gray-500">HDR Score</div>
                        <div className="text-2xl font-black text-emerald-400 mt-1 font-mono">
                          {retronResult.hdr_efficiency_score}
                        </div>
                        <div className="text-[10px] text-gray-400 mt-0.5">{retronResult.hdr_fold_increase_vs_naked_dna} vs naked DNA</div>
                      </div>
                      <div className="bg-gray-900 border border-gray-800 rounded-xl p-3">
                        <div className="text-[10px] uppercase font-bold text-gray-500">Stem ΔG</div>
                        <div className="text-2xl font-black text-cyan-400 mt-1 font-mono">
                          {retronResult.hairpin_delta_g_kcal_mol} <span className="text-xs">kcal/mol</span>
                        </div>
                        <div className="text-[10px] text-gray-400 mt-0.5">Thermodynamic stability</div>
                      </div>
                      <div className="bg-gray-900 border border-gray-800 rounded-xl p-3">
                        <div className="text-[10px] uppercase font-bold text-gray-500">Donor Length</div>
                        <div className="text-2xl font-black text-violet-400 mt-1 font-mono">
                          {retronResult.donor_length_nt} <span className="text-xs">nt</span>
                        </div>
                        <div className="text-[10px] text-gray-400 mt-0.5">GC: {retronResult.donor_gc_pct}%</div>
                      </div>
                      <div className="bg-gray-900 border border-gray-800 rounded-xl p-3">
                        <div className="text-[10px] uppercase font-bold text-gray-500">Branched Linkage</div>
                        <div className="text-2xl font-black text-amber-400 mt-1 font-mono text-sm">
                          2'-5' G Link
                        </div>
                        <div className="text-[10px] text-gray-400 mt-0.5">{retronResult.branched_guanosine_position}</div>
                      </div>
                    </div>

                    {/* Golden Gate Primers */}
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-2">
                      <div className="text-xs font-bold text-white uppercase tracking-wider flex items-center justify-between">
                        <span>Golden Gate BsaI Cloning Primers</span>
                        <span className="text-[10px] text-violet-400 font-mono">
                          Vector: {retronResult.golden_gate_assembly.expression_vector}
                        </span>
                      </div>
                      <div className="space-y-1.5 font-mono text-xs">
                        <div className="p-2 bg-gray-950 rounded border border-gray-800 text-gray-300">
                          <span className="text-emerald-400 font-bold">5' Primer (Overhang {retronResult.golden_gate_assembly.overhang_5p}): </span>
                          {retronResult.golden_gate_assembly.forward_cloning_primer}
                        </div>
                        <div className="p-2 bg-gray-950 rounded border border-gray-800 text-gray-300">
                          <span className="text-cyan-400 font-bold">3' Primer (Overhang {retronResult.golden_gate_assembly.overhang_3p}): </span>
                          {retronResult.golden_gate_assembly.reverse_cloning_primer}
                        </div>
                      </div>
                    </div>

                    {/* FASTA View & Export */}
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white uppercase tracking-wider">
                          Full Expression Plasmid Insert FASTA
                        </span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(retronResult.full_plasmid_insert_fasta);
                              setCopiedRetronFasta(true);
                              setTimeout(() => setCopiedRetronFasta(false), 2000);
                            }}
                            className="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-semibold rounded transition-colors flex items-center gap-1"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            <span>{copiedRetronFasta ? 'Copied!' : 'Copy FASTA'}</span>
                          </button>
                          <a
                            href={api.getRetronExportCsvUrl(retronResult.design_id)}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-semibold rounded transition-colors flex items-center gap-1"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Export CSV</span>
                          </a>
                        </div>
                      </div>
                      <pre className="p-3 bg-gray-950 rounded-lg border border-gray-800 font-mono text-[11px] text-gray-300 overflow-x-auto break-all whitespace-pre-wrap max-h-40">
                        {retronResult.full_plasmid_insert_fasta}
                      </pre>
                    </div>
                  </>
                ) : (
                  <div className="bg-gray-900 border border-gray-800 rounded-xl p-16 text-center text-gray-500 text-xs">
                    Configure your mutation and click <strong>Synthesize Retron msDNA Editor</strong> to generate the donor cassette.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SUB-TAB 2: DGR Mutagenesis Library */}
          {retroSubTab === 'dgr' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Inputs */}
              <div className="lg:col-span-5 bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center justify-between">
                  <span>DGR Targeted Hypermutagenesis</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800 font-mono">
                    Adenine-Specific (A &rarr; N)
                  </span>
                </h3>

                <div>
                  <label className="text-xs text-gray-400 block mb-1">Target Protein / scFv / Nanobody</label>
                  <input
                    type="text"
                    value={dgrProtein}
                    onChange={(e) => setDgrProtein(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-violet-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center text-xs text-gray-400 mb-1">
                    <span>Target Antigen-Binding Loop (CDR-H3 / Variable Loop):</span>
                    <span className="font-mono text-cyan-400">{dgrLoop.length} aa</span>
                  </div>
                  <input
                    type="text"
                    value={dgrLoop}
                    onChange={(e) => setDgrLoop(e.target.value.toUpperCase())}
                    placeholder="e.g. WGGDGFYAMDY"
                    className="w-full bg-gray-950 border border-gray-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-violet-500"
                  />
                  <p className="text-[10px] text-gray-500 mt-1">
                    Adenines in the corresponding codons will be hypermutated by DGR reverse transcriptase at &gt;50% error rate.
                  </p>
                </div>

                <div>
                  <label className="text-xs text-gray-400 block mb-1">DGR Effector System</label>
                  <select
                    value={dgrSystem}
                    onChange={(e) => setDgrSystem(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500"
                  >
                    <option value="Bordetella_BPP1">Bordetella Phage BPP-1 (bprt RT, Canonical &gt;10^14 Diversity)</option>
                    <option value="Treponema_TdDGR">Treponema denticola (TdDGR Mammalian-Compatible)</option>
                    <option value="Vibrio_VcDGR">Vibrio campbellii (VcDGR High Processivity)</option>
                  </select>
                </div>

                <button
                  onClick={runDesignDgr}
                  disabled={dgrLoading}
                  className="w-full py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-bold rounded-lg transition-all shadow-lg shadow-amber-900/30 flex items-center justify-center gap-2"
                >
                  {dgrLoading ? 'Designing DGR Library...' : 'Generate DGR Combinatorial Library'}
                </button>
              </div>

              {/* Outputs */}
              <div className="lg:col-span-7 space-y-4">
                {dgrResult ? (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="bg-gray-900 border border-gray-800 rounded-xl p-3">
                        <div className="text-[10px] uppercase font-bold text-gray-500">Mutable Adenines</div>
                        <div className="text-2xl font-black text-amber-400 mt-1 font-mono">
                          {dgrResult.mutable_adenine_count} <span className="text-xs">bases</span>
                        </div>
                        <div className="text-[10px] text-gray-400 mt-0.5">A &rarr; N targets</div>
                      </div>
                      <div className="bg-gray-900 border border-gray-800 rounded-xl p-3">
                        <div className="text-[10px] uppercase font-bold text-gray-500">Diversity Space</div>
                        <div className="text-lg font-black text-emerald-400 mt-1 font-mono truncate">
                          {dgrResult.theoretical_diversity_space}
                        </div>
                        <div className="text-[10px] text-gray-400 mt-0.5">Combinatorial variants</div>
                      </div>
                      <div className="bg-gray-900 border border-gray-800 rounded-xl p-3">
                        <div className="text-[10px] uppercase font-bold text-gray-500">In-Frame %</div>
                        <div className="text-2xl font-black text-cyan-400 mt-1 font-mono">
                          {dgrResult.productive_in_frame_pct}%
                        </div>
                        <div className="text-[10px] text-gray-400 mt-0.5">Stop-codon avoidance</div>
                      </div>
                      <div className="bg-gray-900 border border-gray-800 rounded-xl p-3">
                        <div className="text-[10px] uppercase font-bold text-gray-500">RT Fidelity</div>
                        <div className="text-2xl font-black text-purple-400 mt-1 font-mono text-sm">
                          &gt;99.9%
                        </div>
                        <div className="text-[10px] text-gray-400 mt-0.5">Non-A bases preserved</div>
                      </div>
                    </div>

                    {/* Degenerate IUPAC Library & Actions */}
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white uppercase tracking-wider">
                          Degenerate Oligo IUPAC Sequence
                        </span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(dgrResult.degenerate_iupac_library);
                              setCopiedDgrLibrary(true);
                              setTimeout(() => setCopiedDgrLibrary(false), 2000);
                            }}
                            className="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-semibold rounded transition-colors flex items-center gap-1"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            <span>{copiedDgrLibrary ? 'Copied!' : 'Copy IUPAC'}</span>
                          </button>
                          <a
                            href={api.getDgrExportCsvUrl(dgrResult.design_id)}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-semibold rounded transition-colors flex items-center gap-1"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Export CSV</span>
                          </a>
                        </div>
                      </div>
                      <div className="p-3 bg-gray-950 rounded-lg border border-gray-800 font-mono text-xs text-amber-300 break-all">
                        {dgrResult.degenerate_iupac_library}
                      </div>

                      <button
                        onClick={() => setIsOrderModalOpen(true)}
                        className="w-full py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-cyan-900/30"
                      >
                        <ShoppingCart className="w-4 h-4" />
                        <span>Order DGR Library via Commercial Foundry (IDT/Twist)</span>
                      </button>
                    </div>

                    {/* Codon Profile Table */}
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-2">
                      <span className="text-xs font-bold text-white uppercase tracking-wider block">
                        Loop Codon Breakdown & Mutability
                      </span>
                      <div className="overflow-x-auto max-h-48 overflow-y-auto">
                        <table className="w-full text-xs text-left">
                          <thead className="text-[10px] uppercase font-mono text-gray-500 bg-gray-950 sticky top-0">
                            <tr>
                              <th className="py-1.5 px-2">Pos</th>
                              <th className="py-1.5 px-2">Residue</th>
                              <th className="py-1.5 px-2">Codon</th>
                              <th className="py-1.5 px-2">Mutable Adenines</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-800 font-mono text-gray-300">
                            {dgrResult.codon_profile.map((c, i) => (
                              <tr key={i} className="hover:bg-gray-800/50">
                                <td className="py-1 px-2 text-gray-500">{i + 1}</td>
                                <td className="py-1 px-2 font-bold text-white">{c.amino_acid}</td>
                                <td className="py-1 px-2 text-cyan-300">{c.codon}</td>
                                <td className="py-1 px-2">
                                  {c.mutable_adenines > 0 ? (
                                    <span className="px-1.5 py-0.5 rounded bg-amber-950 text-amber-400 font-bold">
                                      {c.mutable_adenines} (A &rarr; N)
                                    </span>
                                  ) : (
                                    <span className="text-gray-500">0</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="bg-gray-900 border border-gray-800 rounded-xl p-16 text-center text-gray-500 text-xs">
                    Input your target binding loop and click <strong>Generate DGR Combinatorial Library</strong> to model adenine mutagenesis.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SUB-TAB 3: 7-Modality Comparison Matrix */}
          {retroSubTab === 'modality' && (
            <div className="space-y-4">
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-wrap items-end gap-3">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Target Gene</label>
                  <input
                    type="text"
                    value={compGene}
                    onChange={(e) => setCompGene(e.target.value)}
                    className="bg-gray-950 border border-gray-800 rounded-lg px-2.5 py-1.5 text-xs text-white w-28 focus:outline-none focus:border-violet-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Mutation / Variant</label>
                  <input
                    type="text"
                    value={compMutation}
                    onChange={(e) => setCompMutation(e.target.value)}
                    className="bg-gray-950 border border-gray-800 rounded-lg px-2.5 py-1.5 text-xs text-white w-28 focus:outline-none focus:border-violet-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Desired Edit Type</label>
                  <select
                    value={compEditType}
                    onChange={(e) => setCompEditType(e.target.value)}
                    className="bg-gray-950 border border-gray-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-violet-500"
                  >
                    <option value="POINT_MUTATION">Single Point Mutation (Transition/Transversion)</option>
                    <option value="INSERTION">Insertion (1 to 5000 bp)</option>
                    <option value="DELETION">Exon Deletion / Frame Restoration</option>
                    <option value="LIBRARY">Targeted Affinity Library / Directed Evolution</option>
                    <option value="KNOCKOUT">Gene Knockout / Disruption</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Target Length (bp)</label>
                  <input
                    type="number"
                    value={compLength}
                    onChange={(e) => setCompLength(e.target.value)}
                    className="bg-gray-950 border border-gray-800 rounded-lg px-2.5 py-1.5 text-xs text-white w-24 focus:outline-none focus:border-violet-500"
                  />
                </div>
                <button
                  onClick={runModalityComparison}
                  disabled={compLoading}
                  className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold rounded-lg transition-colors shadow-md shadow-violet-900/30"
                >
                  {compLoading ? 'Evaluating...' : 'Evaluate 7 Modalities'}
                </button>
              </div>

              {compResult && (
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                        Comparative Modality Assessment Matrix
                      </h3>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        Top Recommendation: <span className="font-bold text-emerald-400">{compResult.top_recommended_modality}</span>
                      </p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="text-[10px] uppercase font-mono text-gray-500 bg-gray-950">
                        <tr>
                          <th className="py-2.5 px-3">Modality</th>
                          <th className="py-2.5 px-3">Suitability</th>
                          <th className="py-2.5 px-3">Indel Risk</th>
                          <th className="py-2.5 px-3">DSB-Free</th>
                          <th className="py-2.5 px-3">Max Payload</th>
                          <th className="py-2.5 px-3">Clinical Maturity</th>
                          <th className="py-2.5 px-3">Key Advantage</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800 text-gray-300">
                        {compResult.modalities_ranked.map((m, i) => (
                          <tr key={m.modality_id} className="hover:bg-gray-800/40">
                            <td className="py-2.5 px-3 font-bold text-white">
                              {i === 0 && <span className="text-emerald-400 mr-1.5">★</span>}
                              {m.name}
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold text-emerald-400">
                              {m.suitability_score}/100
                            </td>
                            <td className="py-2.5 px-3 font-mono">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                                m.indel_risk_pct < 5 ? 'bg-emerald-950 text-emerald-400' :
                                m.indel_risk_pct < 15 ? 'bg-amber-950 text-amber-400' :
                                'bg-rose-950 text-rose-400'
                              }`}>
                                {m.indel_risk_pct}%
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              {m.ds_break_free ? (
                                <span className="text-emerald-400 font-bold">✓ Yes</span>
                              ) : (
                                <span className="text-rose-400 font-bold">✗ DSB</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-cyan-300">
                              {m.max_payload_bp > 1000 ? `${m.max_payload_bp/1000} kb` : `${m.max_payload_bp} bp`}
                            </td>
                            <td className="py-2.5 px-3 text-gray-400 text-[11px]">{m.clinical_maturity}</td>
                            <td className="py-2.5 px-3 text-slate-300 text-[11px]">{m.key_advantage}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Synthesis Partner Order Modal (Spec 08 & Spec 12 DGR Library) */}
      <SynthesisOrderModal
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        initialSequences={
          activeTab === 'retroelements' && dgrResult?.synthesis_items?.length
            ? dgrResult.synthesis_items.map(item => ({
                name: item.oligo_name,
                sequence: item.sequence,
                scale: item.scale || '100nmol',
                purification: item.purification || 'HPLC'
              }))
            : fwResult?.idt_plate_orders?.slice(0, 8).map(u => ({
                name: u.oligo_name,
                sequence: u.sequence,
                scale: u.scale,
                purification: u.purification
              })) || []
        }
      />
    </div>
  );
}
