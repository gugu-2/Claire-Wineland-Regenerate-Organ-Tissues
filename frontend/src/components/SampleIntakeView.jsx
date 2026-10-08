import React, { useState } from 'react';
import { Upload, CheckCircle, AlertTriangle, Shield, ArrowRight, Dna, Info } from 'lucide-react';
import LocusTrackViewer from './LocusTrackViewer';

export default function SampleIntakeView({
  samples,
  selectedSample,
  setSelectedSample,
  personalSequenceData,
  annotatedVariants,
  onRunPersonalization,
  onProceedToCrispr,
  isProcessing
}) {
  const [activeSubTab, setActiveSubTab] = useState('benchmarks');
  const [customVcfText, setCustomVcfText] = useState('');
  const [customGene, setCustomGene] = useState('CCR5');
  const [customSampleId, setCustomSampleId] = useState('SAMPLE_EXP_2026');
  const [uploadNotice, setUploadNotice] = useState(null);

  const sampleTemplates = {
    ccr5_delta32: {
      id: 'PT_CCR5_DELTA32_VERIFIED',
      gene: 'CCR5',
      vcf: `##fileformat=VCFv4.2\n#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\tSAMPLE\nchr3\t46373452\trs333\tGAGTCATGCTCTTCAGCTCTTCAGGTATCAG\tG\t99\tPASS\tCLNSIG=Confers_resistance_to_HIV-1\tGT\t0/1`
    },
    seed_snp: {
      id: 'PT_CCR5_SEED_SNP_COLLISION',
      gene: 'CCR5',
      vcf: `##fileformat=VCFv4.2\n#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\tSAMPLE\nchr3\t46373200\trs1800024\tC\tT\t99\tPASS\tCLNSIG=Seed_PAM_Disruption\tGT\t0/1`
    },
    hbb_sickle: {
      id: 'PT_HBB_SICKLE_E6V',
      gene: 'HBB',
      vcf: `##fileformat=VCFv4.2\n#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\tSAMPLE\nchr11\t5227002\trs334\tT\tA\t99\tPASS\tCLNSIG=Pathogenic_Sickle_Cell\tGT\t0/1`
    }
  };

  const loadTemplate = (key) => {
    const tmpl = sampleTemplates[key];
    if (!tmpl) return;
    setCustomSampleId(tmpl.id);
    setCustomGene(tmpl.gene);
    setCustomVcfText(tmpl.vcf);
    setUploadNotice(`Loaded template: ${tmpl.id} (${tmpl.gene}). Click 'Parse & Personalize Locus' below.`);
  };

  const handleCustomVcfSubmit = (e) => {
    e.preventDefault();
    let textToParse = customVcfText.trim();
    let sampleIdToUse = customSampleId;
    let geneToUse = customGene;

    // If user clicked without typing, auto-load standard CCR5-Delta32 template
    if (!textToParse) {
      const tmpl = sampleTemplates.ccr5_delta32;
      textToParse = tmpl.vcf;
      sampleIdToUse = tmpl.id;
      geneToUse = tmpl.gene;
      setCustomSampleId(sampleIdToUse);
      setCustomGene(geneToUse);
      setCustomVcfText(textToParse);
    }

    onRunPersonalization({
      sample_id: sampleIdToUse,
      donor_id: 'DONOR-CLINICAL',
      sample_type: 'Patient Whole Genome / Exome VCF',
      target_gene: geneToUse,
      vcf_text: textToParse
    });

    setUploadNotice(`Personalized locus reconstituted for ${sampleIdToUse}! Personal variants incorporated.`);
    setTimeout(() => setUploadNotice(null), 5000);
  };

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 bg-cyan-950/60 text-cyan-400 border border-cyan-800/60 px-2.5 py-1 rounded-full text-xs font-mono mb-3">
            <Dna className="w-3.5 h-3.5" /> Module 1: Sample Intake & Personalized Genome Generation
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Patient-Specific Sequence Reconstitution
          </h2>
          <p className="text-sm text-slate-300 mt-2 leading-relaxed">
            Standard off-the-shelf CRISPR tools design guides against generic reference genomes (GRCh38).
            Here, every guide is computed directly against <strong className="text-cyan-400">this individual patient's personal sequence</strong>,
            identifying mutations in PAM motifs (<code className="text-cyan-300">NGG</code>) and seed regions that dictate real-world cleavage success or failure.
          </p>
        </div>
      </div>

      {/* Cohort Selector vs Custom Upload Tabs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Sample Selection */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4">
            <div className="flex border-b border-slate-800 pb-2 mb-3">
              <button
                onClick={() => setActiveSubTab('benchmarks')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  activeSubTab === 'benchmarks' ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Benchmark Cohort
              </button>
              <button
                onClick={() => setActiveSubTab('upload')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  activeSubTab === 'upload' ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Upload / Paste VCF
              </button>
            </div>

            {activeSubTab === 'benchmarks' ? (
              <div className="space-y-2.5">
                <p className="text-xs text-slate-400 font-medium mb-2">Select a validated preclinical sample:</p>
                {samples.map((s) => {
                  const isSelected = selectedSample?.sample_id === s.sample_id;
                  const isSeedSnp = s.sample_id.includes('PAM_DISRUPTING');
                  const isDelta32 = s.sample_id.includes('DELTA32');
                  return (
                    <div
                      key={s.sample_id}
                      onClick={() => setSelectedSample(s)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        isSelected
                          ? 'border-cyan-500 bg-cyan-950/30 ring-1 ring-cyan-500/40'
                          : 'border-slate-800 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-slate-200">{s.sample_id}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300">
                          {s.target_gene}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1.5 line-clamp-2">{s.description}</p>
                      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-800/60 text-[10px]">
                        {isSeedSnp && (
                          <span className="text-amber-400 font-semibold flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Personal Seed SNP
                          </span>
                        )}
                        {isDelta32 && (
                          <span className="text-emerald-400 font-semibold flex items-center gap-1">
                            <Shield className="w-3 h-3" /> Protective Δ32
                          </span>
                        )}
                        {!isSeedSnp && !isDelta32 && (
                          <span className="text-slate-400">Reference Wildtype</span>
                        )}
                        <span className="text-slate-500 ml-auto">{s.sample_type}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <form onSubmit={handleCustomVcfSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Sample ID</label>
                  <input
                    type="text"
                    value={customSampleId}
                    onChange={(e) => setCustomSampleId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Target Gene</label>
                  <select
                    value={customGene}
                    onChange={(e) => setCustomGene(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="CCR5">CCR5 (HIV Co-receptor / 3p21.31)</option>
                    <option value="HBB">HBB (Sickle Cell / 11p15.4)</option>
                    <option value="POU5F1">POU5F1 / OCT4 (Pluripotency / 6p21.33)</option>
                  </select>
                </div>
                {/* Quick Presets */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Load Benchmark Clinical Template</label>
                  <div className="grid grid-cols-3 gap-1.5 mb-2">
                    <button
                      type="button"
                      onClick={() => loadTemplate('ccr5_delta32')}
                      className="bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/50 text-cyan-300 p-1.5 rounded text-[10px] font-mono transition-all text-center"
                    >
                      CCR5-Δ32
                    </button>
                    <button
                      type="button"
                      onClick={() => loadTemplate('seed_snp')}
                      className="bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/50 text-amber-300 p-1.5 rounded text-[10px] font-mono transition-all text-center"
                    >
                      Seed SNP
                    </button>
                    <button
                      type="button"
                      onClick={() => loadTemplate('hbb_sickle')}
                      className="bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-rose-500/50 text-rose-300 p-1.5 rounded text-[10px] font-mono transition-all text-center"
                    >
                      Sickle HBB
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-300">Raw VCF 4.2 Content</label>
                    <span className="text-[10px] text-slate-500">Auto-filled if empty</span>
                  </div>
                  <textarea
                    rows={5}
                    value={customVcfText}
                    onChange={(e) => setCustomVcfText(e.target.value)}
                    placeholder="#CHROM&#9;POS&#9;ID&#9;REF&#9;ALT&#9;QUAL&#9;FILTER&#9;INFO&#9;FORMAT&#9;SAMPLE..."
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-[11px] font-mono text-slate-300 focus:outline-none focus:border-cyan-500"
                  ></textarea>
                </div>

                {uploadNotice && (
                  <div className="bg-cyan-950/80 border border-cyan-800 text-cyan-200 p-2 rounded text-[11px] font-sans flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span>{uploadNotice}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isProcessing}
                  className={`w-full ${isProcessing ? 'bg-cyan-800 cursor-not-allowed' : 'bg-cyan-600 hover:bg-cyan-500 active:scale-[0.98]'} text-white font-semibold py-2.5 rounded-lg text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-600/20`}
                >
                  {isProcessing ? (
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin"></div>
                  ) : (
                    <Upload className="w-3.5 h-3.5" /> 
                  )}
                  {isProcessing ? 'Processing...' : 'Parse & Personalize Locus'}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Right Column: Personalized Locus & Variant Annotation */}
        <div className="lg:col-span-2 space-y-4">
          {/* Sample Metadata Card */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>{selectedSample?.sample_id}</span>
                  <span className="text-xs font-normal text-slate-400">({selectedSample?.donor_id})</span>
                </h3>
                <p className="text-xs text-slate-400">{selectedSample?.description}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-slate-800 text-slate-300 px-2.5 py-1 rounded text-xs font-mono">
                  {selectedSample?.alignment_reference || 'GRCh38'}
                </span>
                <span className="bg-emerald-950 text-emerald-400 border border-emerald-800/60 px-2.5 py-1 rounded text-xs">
                  {selectedSample?.consent_status}
                </span>
              </div>
            </div>

            {/* Reconstitution Summary */}
            {personalSequenceData && (
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800/80">
                  <span className="text-slate-400 text-[11px]">Genomic Coordinates</span>
                  <p className="font-mono font-bold text-slate-200 mt-0.5">{personalSequenceData.coordinates}</p>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800/80">
                  <span className="text-slate-400 text-[11px]">Personal Alterations</span>
                  <p className={`font-mono font-bold mt-0.5 ${personalSequenceData.has_personal_alterations ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {personalSequenceData.has_personal_alterations ? 'Variants Incorporated' : 'Identical to Ref'}
                  </p>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800/80">
                  <span className="text-slate-400 text-[11px]">Sequence Length</span>
                  <p className="font-mono font-bold text-slate-200 mt-0.5">
                    {personalSequenceData.personalized_length_bp} bp
                  </p>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800/80">
                  <span className="text-slate-400 text-[11px]">Variants Applied</span>
                  <p className="font-mono font-bold text-cyan-400 mt-0.5">
                    {personalSequenceData.applied_variants?.length || 0} variant(s)
                  </p>
                </div>
              </div>
            )}

            {/* Interactive Locus Track Viewer */}
            {personalSequenceData && (
              <div className="mt-4">
                <LocusTrackViewer
                  geneSymbol={selectedSample?.target_gene || 'CCR5'}
                  sequenceLength={personalSequenceData.reference_length_bp || 1059}
                  variants={selectedSample?.variants || []}
                  coordinates={personalSequenceData.coordinates || 'chr3:46,370,000-46,375,000'}
                />
              </div>
            )}

            {/* Sequence Viewer Snippet */}
            {personalSequenceData && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-slate-300">Personalized Local Sequence (Coding Exon Fragment):</span>
                  <span className="text-[11px] font-mono text-slate-500">5' &rarr; 3' (+ strand)</span>
                </div>
                <div className="bg-[#070b14] border border-slate-800 rounded-lg p-3 font-mono text-xs text-slate-300 break-all leading-relaxed max-h-32 overflow-y-auto">
                  {personalSequenceData.personalized_sequence.substring(0, 360)}...
                </div>
              </div>
            )}
          </div>

          {/* ClinVar & gnomAD Variant Annotations Table */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5">
            <h4 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4 text-cyan-400" /> Variant Annotation & Clinical Significance
            </h4>

            {annotatedVariants && annotatedVariants.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-mono">
                      <th className="py-2 px-3">Variant (rsID / Pos)</th>
                      <th className="py-2 px-3">ClinVar Status</th>
                      <th className="py-2 px-3">Consequence</th>
                      <th className="py-2 px-3">gnomAD AF</th>
                      <th className="py-2 px-3">Clinical / CRISPR Impact</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {annotatedVariants.map((v, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/30">
                        <td className="py-2.5 px-3 font-bold text-cyan-300">
                          {v.rsid}
                          <div className="text-[10px] text-slate-500 font-normal">
                            {v.input_variant?.chromosome}:{v.input_variant?.position} ({v.input_variant?.ref}&gt;{v.input_variant?.alt})
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-sans font-semibold ${
                            v.pathogenicity_level === 'PROTECTIVE'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : v.pathogenicity_level === 'PATHOGENIC'
                              ? 'bg-rose-950 text-rose-300 border border-rose-800'
                              : 'bg-slate-800 text-slate-300'
                          }`}>
                            {v.clinical_significance}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-300 text-[11px] font-sans">
                          {v.molecular_consequence}
                        </td>
                        <td className="py-2.5 px-3 text-slate-300">
                          {(v.gnomad_af_global * 100).toFixed(2)}%
                        </td>
                        <td className="py-2.5 px-3 font-sans text-[11px] text-amber-300">
                          {v.protective_alert}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-xs text-slate-400 py-3 text-center bg-slate-950/50 rounded-lg border border-slate-800">
                No personal variants detected in this target span. Sample matches canonical reference assembly (GRCh38).
              </div>
            )}

            {/* Next Action Button */}
            <div className="mt-5 flex justify-end">
              <button
                onClick={onProceedToCrispr}
                className="bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white px-5 py-2.5 rounded-lg text-xs font-bold transition-all shadow-lg shadow-cyan-500/20 flex items-center gap-2"
              >
                Proceed to Personalized CRISPR Guide Design <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
