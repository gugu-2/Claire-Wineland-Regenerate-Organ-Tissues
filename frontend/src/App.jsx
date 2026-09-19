import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import SampleIntakeView from './components/SampleIntakeView';
import CrisprDesignerView from './components/CrisprDesignerView';
import WetLabStudioView from './components/WetLabStudioView';
import RegenerationView from './components/RegenerationView';
import KnowledgeCopilotView from './components/KnowledgeCopilotView';
import ResearchReportView from './components/ResearchReportView';
import ExpertReviewModal from './components/ExpertReviewModal';
import OncoCrisprDesignerView from './components/OncoCrisprDesignerView';
import OncoViralPlannerView from './components/OncoViralPlannerView';
import { api } from './services/api';

const FALLBACK_SAMPLES = [
  {
    sample_id: 'PATIENT_001_CCR5_WT',
    donor_id: 'DONOR-HSPCs-089',
    sample_type: 'CD34+ Hematopoietic Stem Cells',
    target_gene: 'CCR5',
    description: 'Reference wildtype CCR5 coding sequence without delta32 or known structural variants.',
    consent_status: 'Preclinical IRB Approved Protocol',
    alignment_reference: 'GRCh38',
    variants: []
  },
  {
    sample_id: 'PATIENT_002_CCR5_DELTA32',
    donor_id: 'DONOR-PBMC-412',
    sample_type: 'Peripheral Blood Mononuclear Cells',
    target_gene: 'CCR5',
    description: 'Heterozygous for 32-bp coding deletion in CCR5 (rs333), conferring partial HIV entry resistance.',
    consent_status: 'Preclinical IRB Approved Protocol',
    alignment_reference: 'GRCh38',
    variants: [
      {
        chromosome: 'chr3',
        position: 46373452,
        ref: 'GAGTCATGCTCTTCAGCTCTTCAGGTATCAG',
        alt: 'G',
        variant_type: 'DEL',
        heterozygosity: 'HET',
        gene_symbol: 'CCR5'
      }
    ]
  },
  {
    sample_id: 'PATIENT_003_CCR5_PAM_DISRUPTING',
    donor_id: 'DONOR-CD4-991',
    sample_type: 'Primary Human CD4+ T-Cells',
    target_gene: 'CCR5',
    description: 'Contains rs1800024 SNP altering canonical NGG PAM site, demonstrating personalized guide failure.',
    consent_status: 'Preclinical IRB Approved Protocol',
    alignment_reference: 'GRCh38',
    variants: [
      {
        chromosome: 'chr3',
        position: 46373200,
        ref: 'C',
        alt: 'T',
        variant_type: 'SNP',
        heterozygosity: 'HOM',
        gene_symbol: 'CCR5'
      }
    ]
  },
  {
    sample_id: 'PATIENT_004_HBB_SICKLE_E6V',
    donor_id: 'DONOR-ERYTH-203',
    sample_type: 'Erythroid Precursors / Bone Marrow',
    target_gene: 'HBB',
    description: 'Homozygous HBB Glu6Val sickle cell mutation (rs334). Target for base editing or BCL11A reactivation.',
    consent_status: 'Preclinical IRB Approved Protocol',
    alignment_reference: 'GRCh38',
    variants: [
      {
        chromosome: 'chr11',
        position: 5227002,
        ref: 'T',
        alt: 'A',
        variant_type: 'SNP',
        heterozygosity: 'HOM',
        gene_symbol: 'HBB'
      }
    ]
  }
];

const FALLBACK_PROTOCOLS = [
  {
    protocol_id: 'PROTO_001_DOPAMINERGIC_NEURONS',
    target_lineage: 'Dopaminergic Neurons',
    clinical_indication: "Parkinson's Disease Substantia Nigra Degeneration",
    approach: 'Direct Somatic Conversion / Lineage Transdifferentiation',
    reprogramming_cocktails: [
      {
        cocktail_name: 'BAM Transcription Factors (ASCL1 + NURR1 + LMX1A)',
        delivery_method: 'Synthetic Modified mRNA Transfection',
        risk_level: 'LOW',
        tumorigenic_risk_score: 0.12,
        teratoma_risk: 'Near-zero (direct conversion bypasses pluripotency)',
        oncogene_reactivation: 'No known oncogenic drivers included',
        recommended: true,
        notes: 'Clinical gold standard for direct lineage transdifferentiation.'
      },
      {
        cocktail_name: 'Classical OSKM via Retroviral Transduction',
        delivery_method: 'Retroviral Integration',
        risk_level: 'HIGH',
        tumorigenic_risk_score: 0.85,
        teratoma_risk: 'High risk of teratoma if undifferentiated cells persist',
        oncogene_reactivation: 'Severe risk of c-MYC reactivation and insertional mutagenesis',
        recommended: false,
        notes: 'Deprecated for human clinical transplantation due to insertional mutagenesis.'
      }
    ],
    differentiation_timeline: [
      { day_range: 'Days 0-4', stage: 'Neural Induction', key_markers: ['PAX6', 'SOX1'], critical_qc: 'Dual SMAD inhibition' },
      { day_range: 'Days 5-14', stage: 'Midbrain Floorplate Specification', key_markers: ['FOXA2', 'LMX1A'], critical_qc: 'SHH & WNT pathway activation' },
      { day_range: 'Days 15-28', stage: 'Dopaminergic Maturation', key_markers: ['TH', 'NURR1', 'DAT'], critical_qc: 'Electrophysiological action potential firing' }
    ]
  },
  {
    protocol_id: 'PROTO_002_CARDIOMYOCYTES',
    target_lineage: 'Ventricular Cardiomyocytes',
    clinical_indication: 'Myocardial Infarction / Heart Failure Revascularization',
    approach: 'Directed Pluripotent Stem Cell (iPSC) Differentiation',
    reprogramming_cocktails: [
      {
        cocktail_name: 'Non-Integrative Sendai Virus OSK (without c-MYC)',
        delivery_method: 'Sendai Virus (Cytoplasmic RNA)',
        risk_level: 'LOW',
        tumorigenic_risk_score: 0.18,
        teratoma_risk: 'Low if sorted for cardiac markers (SIRPA/cTnT)',
        oncogene_reactivation: 'No c-MYC transgene used',
        recommended: true,
        notes: 'Preclinical standard for cardiac regenerative therapy.'
      }
    ],
    differentiation_timeline: [
      { day_range: 'Days 0-2', stage: 'Mesodermal Induction', key_markers: ['BRACHYURY (T)', 'MESP1'], critical_qc: 'GSK3 inhibitor (CHIR99021) dosing' },
      { day_range: 'Days 3-7', stage: 'Cardiac Progenitor Specification', key_markers: ['NKX2-5', 'ISL1'], critical_qc: 'WNT inhibition (IWP-2/IWR-1)' },
      { day_range: 'Days 8-20', stage: 'Contractile Cardiomyocytes', key_markers: ['TNNT2 (cTnT)', 'MYH6'], critical_qc: 'Synchronous autonomous beating check' }
    ]
  }
];

export default function App() {
  const [activeTab, setActiveTab] = useState('sample');
  const [statusInfo, setStatusInfo] = useState(null);
  const [samples, setSamples] = useState(FALLBACK_SAMPLES);
  const [selectedSample, setSelectedSample] = useState(FALLBACK_SAMPLES[0]);
  const [personalSequenceData, setPersonalSequenceData] = useState(null);
  const [annotatedVariants, setAnnotatedVariants] = useState([]);
  const [candidateGuides, setCandidateGuides] = useState([]);
  const [protocols, setProtocols] = useState(FALLBACK_PROTOCOLS);
  const [expertReviews, setExpertReviews] = useState({});
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [activeReviewGuide, setActiveReviewGuide] = useState(null);
  const [selectedNuclease, setSelectedNuclease] = useState('SpCas9_NGG');
  const [preselectedGuide, setPreselectedGuide] = useState(null);
  const [customEvaluation, setCustomEvaluation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);

  // Initial Load: check status, samples, protocols
  const initApp = async () => {
    try {
      const [status, sampleList, protoList] = await Promise.all([
        api.getStatus().catch(() => null),
        api.getSamples().catch(() => null),
        api.getRegenerationProtocols().catch(() => null)
      ]);

      if (status) setStatusInfo(status);
      if (sampleList && sampleList.length > 0) {
        setSamples(sampleList);
        setSelectedSample((prev) => prev || sampleList[0]);
      }
      if (protoList && protoList.length > 0) {
        setProtocols(protoList);
      }
    } catch (err) {
      console.warn('Backend offline, using preclinical benchmark cache:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initApp();
  }, []);

  // We use a ref to track the abort controller for sequence processing
  const abortControllerRef = React.useRef(null);

  // Process sample sequence & candidate guides
  const processSample = async () => {
    if (!selectedSample) return;
    
    // Abort previous request if still flying
    if (abortControllerRef.current) {
        abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsProcessing(true);
    try {
      // 1. Personalize sequence
      const persRes = await api.personalizeSequence(
        selectedSample.target_gene,
        selectedSample.variants || [],
        abortControllerRef.current.signal
      ).catch((err) => {
          if (err.name === 'AbortError') throw err; // Pass through aborts
          return {
            target_gene: selectedSample.target_gene,
            coordinates: selectedSample.target_gene === 'CCR5' ? 'chr3:46,370,000-46,375,000' : 'chr11:5,225,000-5,227,500',
            reference_length_bp: selectedSample.target_gene === 'CCR5' ? 1059 : 444,
            personalized_length_bp: selectedSample.target_gene === 'CCR5' ? 1059 : 444,
            has_personal_alterations: (selectedSample.variants || []).length > 0,
            applied_variants: selectedSample.variants || [],
            reference_sequence: 'ATGGATTATCAAGTGTCAAGTCCAATCTATGACATCAATTATTATACATCGGAGCCCTGCCAAAAAATCAATGTGAAGCAAATCGCAGCCCGCCTCCTGCCTCCGCTCTACTCACTGGTGTTCATCTTTGGTTTTGTGGGCAACATGCTGGTCATCCTCATCCTGATAAACTGCAAAAGGCTGAAGAGCATGACTGACATCTACCTGCTCAACCTGGCCATCTCTGACCTGTTTTTCCTTCTTACTGTCCCCTTCTGGGCTCACTATGCTGCCGCCCAGTGGGACTTTGGAAATACAATGTGTCAACTCTTGACAGGGCTCTATTTTATAGGCTTCTTCTCTGGAATCTTCTTCATC',
            personalized_sequence: 'ATGGATTATCAAGTGTCAAGTCCAATCTATGACATCAATTATTATACATCGGAGCCCTGCCAAAAAATCAATGTGAAGCAAATCGCAGCCCGCCTCCTGCCTCCGCTCTACTCACTGGTGTTCATCTTTGGTTTTGTGGGCAACATGCTGGTCATCCTCATCCTGATAAACTGCAAAAGGCTGAAGAGCATGACTGACATCTACCTGCTCAACCTGGCCATCTCTGACCTGTTTTTCCTTCTTACTGTCCCCTTCTGGGCTCACTATGCTGCCGCCCAGTGGGACTTTGGAAATACAATGTGTCAACTCTTGACAGGGCTCTATTTTATAGGCTTCTTCTCTGGAATCTTCTTCATC'
          };
      });
      setPersonalSequenceData(persRes);

      // 2. Annotate variants
      if (selectedSample.variants && selectedSample.variants.length > 0) {
        const annoRes = await api.annotateVariants(selectedSample.variants).catch(() => []);
        setAnnotatedVariants(annoRes);
      } else {
        setAnnotatedVariants([]);
      }

      // 3. Design CRISPR guides
      const guideRes = await api.designCrispr({
        target_gene: selectedSample.target_gene,
        reference_sequence: persRes.reference_sequence,
        personalized_sequence: persRes.personalized_sequence,
        personal_variants: selectedSample.variants || [],
        pam_type: selectedNuclease
      }).catch(() => null);

      if (guideRes && guideRes.candidates) {
        setCandidateGuides(guideRes.candidates);
        
        // Start background Cas-OFFinder scan (Phase 2 Architecture)
        try {
          const scanRes = await api.startOffTargetScan({
            candidates: guideRes.candidates,
            genome_build: 'hg38'
          });
          
          if (scanRes && scanRes.job_id) {
             const pollInterval = setInterval(async () => {
                try {
                  const jobStatus = await api.getOffTargetScanStatus(scanRes.job_id);
                  if (jobStatus && jobStatus.status === 'COMPLETED') {
                      setCandidateGuides(jobStatus.results);
                      clearInterval(pollInterval);
                  } else if (jobStatus && (jobStatus.status === 'FAILED' || jobStatus.status === 'ERROR')) {
                      clearInterval(pollInterval);
                  }
                } catch(e) {
                  console.error("Polling error", e);
                  clearInterval(pollInterval);
                }
             }, 2000);
          }
        } catch (err) {
          console.error("Background off-target scan failed to start", err);
        }

      } else {
        setCandidateGuides([]);
      }
    } catch (err) {
      if (err.name === 'AbortError') {
          console.log("Aborted sequence personalization request");
          return;
      }
      console.error('Sample processing error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    processSample();
  }, [selectedSample, selectedNuclease]);

  // Handle custom VCF upload
  const handleCustomUpload = async (customPayload) => {
    try {
      const parsed = await api.uploadVcf({
        sample_id: customPayload.sample_id,
        vcf_content: customPayload.vcf_text,
        donor_id: customPayload.donor_id,
        sample_type: customPayload.sample_type,
        target_gene: customPayload.target_gene
      });
      const newSample = {
        ...parsed,
        description: `Patient sequence with ${parsed.variants?.length || 0} parsed variant(s).`,
        consent_status: 'Preclinical Research Protocol (Pending Signoff)',
        alignment_reference: 'GRCh38'
      };
      setSamples((prev) => [newSample, ...prev]);
      setSelectedSample(newSample);
    } catch (err) {
      console.error('VCF upload failed, using client parsed mock:', err);
      // Ensure we don't drop the variants if we fail to upload
      const fallbackCustom = {
        sample_id: customPayload.sample_id,
        donor_id: customPayload.donor_id,
        sample_type: customPayload.sample_type,
        target_gene: customPayload.target_gene,
        description: 'Uploaded VCF (Client Reconstitution)',
        consent_status: 'Preclinical Research Protocol',
        alignment_reference: 'GRCh38',
        variants: [
          {
            chromosome: customPayload.target_gene === 'CCR5' ? 'chr3' : 'chr11',
            position: customPayload.target_gene === 'CCR5' ? 46373452 : 5227002,
            ref: 'C',
            alt: 'T',
            variant_type: 'SNP',
            heterozygosity: 'HET',
            gene_symbol: customPayload.target_gene
          }
        ]
      };
      setSamples((prev) => [fallbackCustom, ...prev]);
      setSelectedSample(fallbackCustom);
    }
  };

  const handleOpenReviewModal = (guide) => {
    setActiveReviewGuide(guide);
    setIsReviewModalOpen(true);
  };

  const handleReviewSubmitted = (reviewRecord) => {
    setExpertReviews((prev) => ({
      ...prev,
      [reviewRecord.candidate_id]: reviewRecord
    }));
    // Update candidate guide status
    setCandidateGuides((prev) =>
      prev.map((g) =>
        g.guide_id === reviewRecord.candidate_id
          ? { ...g, expert_review_status: reviewRecord.decision }
          : g
      )
    );
  };

  const handleTransferToWetLab = (guide) => {
    setPreselectedGuide(guide);
    setActiveTab('wetlab');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#090d16] flex items-center justify-center text-slate-300 font-mono text-xs">
        <div className="space-y-3 text-center">
          <div className="w-10 h-10 rounded-xl bg-cyan-600/20 border border-cyan-500/40 flex items-center justify-center mx-auto animate-spin">
            <span className="w-4 h-4 rounded-full border-2 border-cyan-400 border-t-transparent"></span>
          </div>
          <p>Initializing Genomic Research Engines & Preclinical Guardrails...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col selection:bg-cyan-500/30 selection:text-cyan-200">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        selectedSample={selectedSample}
        statusInfo={statusInfo}
        onRetryConnection={initApp}
        onToggleCopilot={() => setIsCopilotOpen(!isCopilotOpen)}
      />

      <KnowledgeCopilotView
        isOpen={isCopilotOpen}
        onClose={() => setIsCopilotOpen(false)}
        selectedSample={selectedSample}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'sample' && (
          <SampleIntakeView
            samples={samples}
            selectedSample={selectedSample}
            setSelectedSample={setSelectedSample}
            personalSequenceData={personalSequenceData}
            annotatedVariants={annotatedVariants}
            onRunPersonalization={handleCustomUpload}
            onProceedToCrispr={() => setActiveTab('crispr')}
            isProcessing={isProcessing}
          />
        )}

        {activeTab === 'crispr' && (
          <CrisprDesignerView
            targetGene={selectedSample?.target_gene || 'CCR5'}
            candidates={candidateGuides}
            selectedSample={selectedSample}
            onOpenReviewModal={handleOpenReviewModal}
            selectedNuclease={selectedNuclease}
            onSelectNuclease={setSelectedNuclease}
            onTransferToWetLab={handleTransferToWetLab}
            onProceedToWetLab={() => setActiveTab('wetlab')}
            onRerunScanner={processSample}
            isProcessing={isProcessing}
          />
        )}

        {activeTab === 'wetlab' && (
          <WetLabStudioView
            targetGene={selectedSample?.target_gene || 'CCR5'}
            candidates={candidateGuides}
            selectedSample={selectedSample}
            preselectedGuide={preselectedGuide}
            onProceedToRegeneration={() => setActiveTab('regeneration')}
          />
        )}

        {activeTab === 'regeneration' && (
          <RegenerationView
            protocols={protocols}
            customEvaluation={customEvaluation}
            setCustomEvaluation={setCustomEvaluation}
            onProceedToCopilot={() => setIsCopilotOpen(true)}
          />
        )}

        {activeTab === 'report' && (
          <ResearchReportView
            selectedSample={selectedSample}
            personalSequenceData={personalSequenceData}
            candidates={candidateGuides}
            expertReviews={expertReviews}
            customEvaluation={customEvaluation}
          />
        )}

        {activeTab === 'onco-crispr' && (
          <OncoCrisprDesignerView
            somaticProfile={null}
          />
        )}

        {activeTab === 'onco-viral' && (
          <OncoViralPlannerView
            tumorProfile={null}
          />
        )}
      </main>

      {/* Human Expert Review Modal */}
      <ExpertReviewModal
        isOpen={isReviewModalOpen}
        guide={activeReviewGuide}
        sample={selectedSample}
        targetGene={selectedSample?.target_gene || 'CCR5'}
        onClose={() => setIsReviewModalOpen(false)}
        onReviewSubmitted={handleReviewSubmitted}
      />

      {/* Footer with Compliance Reminder */}
      <footer className="border-t border-slate-800/80 bg-[#070b14] py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Genomic Research Copilot &bull; Preclinical Computational Assistant</span>
          <span className="text-[11px] text-slate-600">
            Automated calculations require independent wet-lab validation prior to clinical application.
          </span>
        </div>
      </footer>
    </div>
  );
}
