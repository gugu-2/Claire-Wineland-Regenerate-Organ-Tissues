import { useState, useEffect } from 'react';
import { api } from '../services/api';

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

  useEffect(() => {
    api.getArtReference().then(data => {
      setReference(data);
      setLoadingRef(false);
    }).catch(() => setLoadingRef(false));
  }, []);

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
          { id: 'scan', label: '🔍 Array Scanner' },
          { id: 'locus', label: '🗺 Locus Analyzer' },
          { id: 'rna', label: '🔬 RNA Structure' },
          { id: 'therapeutic', label: '💊 Therapeutic Potential' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
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
    </div>
  );
}
