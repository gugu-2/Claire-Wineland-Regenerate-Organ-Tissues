import React, { useState } from 'react';
import { X, UserCheck, ShieldAlert, CheckCircle2, AlertTriangle } from 'lucide-react';
import { api } from '../services/api';

export default function ExpertReviewModal({
  guide,
  sample,
  targetGene,
  isOpen,
  onClose,
  onReviewSubmitted
}) {
  const [reviewerName, setReviewerName] = useState('');
  const [reviewerCredentials, setReviewerCredentials] = useState('Lead Geneticist, Gene Editing & Cell Therapy Institute');
  const [irbNumber, setIrbNumber] = useState('IRB-2025-GT-4081');
  const [decision, setDecision] = useState('APPROVED_WITH_CAVEATS');
  const [rationale, setRationale] = useState(
    'Candidate guide demonstrates acceptable on-target predicted cleavage. Recommend empirical validation using in-vitro cleavage assay and cellular GUIDE-seq to verify lack of non-specific cleavage.'
  );
  const [offtargetChecked, setOfftargetChecked] = useState(true);
  const [personalSnpsChecked, setPersonalSnpsChecked] = useState(true);
  const [wetlabMandated, setWetlabMandated] = useState(true);
  const [toxicityChecked, setToxicityChecked] = useState(false);
  const [gcpChecked, setGcpChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen || !guide) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!toxicityChecked || !gcpChecked) {
        setErrorMsg('Please confirm both Toxicity Check and GCP Compliance before submitting.');
        return;
    }
    setErrorMsg('');
    setSubmitting(true);
    try {
      const payload = {
        candidate_id: guide.guide_id,
        target_gene: targetGene,
        sample_id: sample?.sample_id || 'UNKNOWN_SAMPLE',
        reviewer_name: reviewerName,
        reviewer_credentials: reviewerCredentials,
        irb_number: irbNumber,
        decision: decision,
        rationale: rationale,
        checklist_offtarget_reviewed: offtargetChecked,
        checklist_personal_snps_checked: personalSnpsChecked,
        checklist_wetlab_validation_mandated: wetlabMandated
      };
      await api.submitReview(payload);
      onReviewSubmitted(payload);
      onClose();
    } catch (err) {
      console.error('Failed to submit review:', err);
      setErrorMsg('Failed to submit review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#0e1424] border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-800/80">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Human Expert Review Gate</h3>
              <p className="text-xs text-slate-400">Pre-experimental sign-off & regulatory gatekeeping</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Candidate Summary Box */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-mono font-bold text-cyan-400">{guide.guide_id}</span>
            <span className="text-slate-400">Target Locus: <strong>{targetGene}</strong></span>
          </div>
          <div className="font-mono text-slate-200 break-all bg-slate-900/60 p-2 rounded">
            {guide.patient_guide_20nt} <strong className="text-cyan-400">[{guide.pam_sequence}]</strong>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
            <div>
              <span className="text-slate-500">Patient Cleavage:</span>
              <p className="font-bold text-emerald-400">{Math.round(guide.on_target_efficiency_patient * 100)}%</p>
            </div>
            <div>
              <span className="text-slate-500">CFD Specificity:</span>
              <p className="font-bold text-indigo-400">{guide.off_target_cfd_score} / 100</p>
            </div>
            <div>
              <span className="text-slate-500">Risk Tier:</span>
              <p className="font-bold text-slate-300">{guide.off_target_risk_level}</p>
            </div>
            <div>
              <span className="text-slate-500">Personal SNP:</span>
              <p className={`font-bold ${guide.is_personalized_different ? 'text-rose-400' : 'text-emerald-400'}`}>
                {guide.is_personalized_different ? 'COLLISION' : 'CLEAR'}
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {errorMsg && (
            <div className="bg-rose-950/60 border border-rose-800 text-rose-300 px-3 py-2 rounded-lg text-[11px] font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> {errorMsg}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Reviewer Name</label>
              <input
                type="text"
                value={reviewerName}
                onChange={(e) => setReviewerName(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">IRB / Ethics Protocol Number</label>
              <input
                type="text"
                value={irbNumber}
                onChange={(e) => setIrbNumber(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Institutional Title & Affiliation</label>
            <input
              type="text"
              value={reviewerCredentials}
              onChange={(e) => setReviewerCredentials(e.target.value)}
              required
              className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Review Decision</label>
            <select
              value={decision}
              onChange={(e) => setDecision(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="EXPERT_APPROVED">EXPERT_APPROVED: Candidate cleared for in-vitro assay</option>
              <option value="APPROVED_WITH_CAVEATS">APPROVED_WITH_CAVEATS: Cleared with mandatory deep off-target assays</option>
              <option value="EXPERT_REJECTED">EXPERT_REJECTED: Candidate rejected due to off-target or SNP liability</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Scientific Rationale & Experimental Directives</label>
            <textarea
              rows={3}
              value={rationale}
              onChange={(e) => setRationale(e.target.value)}
              required
              className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 focus:outline-none focus:border-cyan-500"
            ></textarea>
          </div>

          {/* Mandatory Safety Checkboxes */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 space-y-2">
            <span className="text-slate-400 font-bold block mb-1">Mandatory Human Gating Checkpoints:</span>
            <label className="flex items-start gap-2 text-[11px] text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={offtargetChecked}
                onChange={(e) => setOfftargetChecked(e.target.checked)}
                className="mt-0.5 rounded border-slate-700 bg-slate-900 text-cyan-600 focus:ring-0"
              />
              <span>I have personally examined the CFD off-target profile and genomic homology analysis.</span>
            </label>
            <label className="flex items-start gap-2 text-[11px] text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={personalSnpsChecked}
                onChange={(e) => setPersonalSnpsChecked(e.target.checked)}
                className="mt-0.5 rounded border-slate-700 bg-slate-900 text-cyan-600 focus:ring-0"
              />
              <span>I have cross-checked this patient's personal VCF variants against the seed region (pos 1-10) and PAM motif.</span>
            </label>
            <label className="flex items-start gap-2 text-[11px] text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={wetlabMandated}
                onChange={(e) => setWetlabMandated(e.target.checked)}
                className="mt-0.5 rounded border-slate-700 bg-slate-900 text-cyan-600 focus:ring-0"
              />
              <span>I certify that this computational candidate will not be administered in vivo without complete wet-lab validation and IRB approval.</span>
            </label>
            <label className="flex items-start gap-2 text-[11px] text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={toxicityChecked}
                onChange={(e) => setToxicityChecked(e.target.checked)}
                className="mt-0.5 rounded border-slate-700 bg-slate-900 text-rose-600 focus:ring-0"
              />
              <span className="text-rose-400 font-semibold">Toxicity Check: I have reviewed patient pre-existing immunity (e.g., anti-Cas9 antibodies) and genotoxicity/oncogenesis risks for this edit.</span>
            </label>
            <label className="flex items-start gap-2 text-[11px] text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={gcpChecked}
                onChange={(e) => setGcpChecked(e.target.checked)}
                className="mt-0.5 rounded border-slate-700 bg-slate-900 text-rose-600 focus:ring-0"
              />
              <span className="text-rose-400 font-semibold">GCP Compliance: I verify this sign-off conforms to Good Clinical Practice (GCP) and IND submission readiness standards.</span>
            </label>
          </div>

          {/* Submit Action */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-slate-400 hover:text-slate-200 transition-all text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !offtargetChecked || !personalSnpsChecked || !wetlabMandated}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold px-5 py-2 rounded-lg text-xs transition-all shadow-lg shadow-emerald-600/20 flex items-center gap-2"
            >
              <UserCheck className="w-4 h-4" /> Record Sign-Off Decision
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
