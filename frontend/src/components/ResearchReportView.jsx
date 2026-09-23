import React, { useState, useEffect } from 'react';
import { FileText, Download, Printer, ShieldCheck, AlertOctagon, ExternalLink, Terminal, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';

export default function ResearchReportView({
  selectedSample,
  personalSequenceData,
  candidates,
  expertReviews,
  customEvaluation
}) {
  const [reportData, setReportData] = useState(null);
  const [htmlContent, setHtmlContent] = useState('');
  const [auditLogs, setAuditLogs] = useState([]);
  const [generating, setGenerating] = useState(false);

  const fetchAuditLogs = async () => {
    try {
      const logs = await api.getAuditLogs();
      setAuditLogs(logs || []);
    } catch (e) {
      console.error(e);
    }
  };

  const generateReportData = async () => {
    if (!selectedSample || !candidates) return;
    setGenerating(true);
    try {
      const latestReview = expertReviews?.[candidates[0]?.guide_id] || null;
      const payload = {
        sample_info: selectedSample,
        personal_sequence_data: personalSequenceData || {},
        candidate_guides: candidates,
        expert_review: latestReview,
        regeneration_data: customEvaluation || null,
        citations: []
      };
      const res = await api.generateReport(payload);
      setReportData(res.report_data);
      setHtmlContent(res.html_content);
      fetchAuditLogs();
    } catch (e) {
      console.error(e);
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    generateReportData();
    fetchAuditLogs();
  }, [selectedSample, candidates, expertReviews]);

  const handlePrint = () => {
    if (!htmlContent) return;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const handleDownloadJson = () => {
    if (!reportData) return;
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportData.report_id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!candidates || candidates.length === 0 || !selectedSample) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 shadow-xl text-center space-y-4">
         <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-slate-500" />
         </div>
         <h2 className="text-lg font-bold text-white">No Data Available for Report</h2>
         <p className="text-sm text-slate-400 max-w-md mx-auto">Please complete the Sample Intake and CRISPR Design workflows to generate a comprehensive research dossier.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 bg-purple-950/60 text-purple-400 border border-purple-800/60 px-2.5 py-1 rounded-full text-xs font-mono mb-3">
            <FileText className="w-3.5 h-3.5" /> Module 8 & 9: Structured Research Dossier & Compliance Audit Trail
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Research Dossier & Verification Summary
          </h2>
          <p className="text-sm text-slate-300 mt-2 leading-relaxed">
            Exports a comprehensive, traceable scientific candidate dossier containing personal sequence reconstitutions,
            guide scores with confidence intervals, literature grounding, and the immutable cryptographic audit log.
          </p>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/70 border border-slate-800 p-4 rounded-xl">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400">Dossier Status:</span>
          <span className="font-mono text-cyan-400 font-bold">
            {reportData ? reportData.report_id : 'Generating...'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all"
          >
            <Printer className="w-3.5 h-3.5" /> Print / Export PDF
          </button>
          <button
            onClick={handleDownloadJson}
            className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md"
          >
            <Download className="w-3.5 h-3.5" /> Download JSON Dossier
          </button>
        </div>
      </div>

      {/* Report Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Styled Dossier Preview */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-2xl">
            {/* Red Mandatory Safety Banner */}
            <div className="bg-rose-950/40 border-l-4 border-rose-500 rounded-r-lg p-4 text-xs text-rose-200">
              <div className="font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                <AlertOctagon className="w-4 h-4 shrink-0" /> Mandatory Preclinical Research Warning
              </div>
              <p className="leading-relaxed text-[11px]">
                {reportData?.app_metadata?.regulatory_disclaimer ||
                  'FOR RESEARCH PURPOSES ONLY — NOT FOR CLINICAL USE. All computational guide RNA rankings, efficiency metrics, and CFD off-target predictions are research hypotheses requiring peer review and wet-lab validation.'}
              </p>
            </div>

            {/* Dossier Title & Metadata */}
            <div className="border-b border-slate-800 pb-4 flex items-baseline justify-between">
              <div>
                <h3 className="text-xl font-bold text-white">Preclinical Research Dossier</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Personalized CRISPR-Cas9 Target Analysis for {selectedSample?.target_gene}
                </p>
              </div>
              <div className="text-right text-[11px] font-mono text-slate-500">
                {reportData?.app_metadata?.generated_at?.substring(0, 10)}
              </div>
            </div>

            {/* Sample Specification Table */}
            <div className="space-y-2 text-xs">
              <span className="font-bold text-slate-300 block uppercase tracking-wider text-[11px]">
                1. Cohort & Locus Specification
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-900/60 p-3.5 rounded-xl border border-slate-800/80 font-mono text-[11px]">
                <div>
                  <span className="text-slate-500 block text-[10px]">Sample Identifier:</span>
                  <span className="font-bold text-slate-200">{selectedSample?.sample_id}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Target Locus:</span>
                  <span className="font-bold text-cyan-400">{selectedSample?.target_gene}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Reference Genome:</span>
                  <span className="text-slate-200">{selectedSample?.alignment_reference || 'GRCh38'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Sample Substrate:</span>
                  <span className="text-slate-300">{selectedSample?.sample_type}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Clinical Indication:</span>
                  <span className="text-slate-300">{selectedSample?.clinical_status}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">IRB Consent Status:</span>
                  <span className="text-emerald-400">{selectedSample?.consent_status}</span>
                </div>
              </div>
            </div>

            {/* Candidate Guide RNA Rankings */}
            <div className="space-y-2 text-xs">
              <span className="font-bold text-slate-300 block uppercase tracking-wider text-[11px]">
                2. Personalized Candidate gRNA Summary ({candidates?.length || 0} Evaluated)
              </span>
              <div className="overflow-x-auto border border-slate-800 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-900 text-slate-400 font-mono text-[11px]">
                    <tr className="border-b border-slate-800">
                      <th className="py-2.5 px-3">Guide ID</th>
                      <th className="py-2.5 px-3">Personal Sequence (5' &rarr; 3')</th>
                      <th className="py-2.5 px-3 text-center">Patient Cleavage</th>
                      <th className="py-2.5 px-3 text-center">CFD Specificity</th>
                      <th className="py-2.5 px-3">Computational Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 font-mono text-[11px]">
                    {candidates?.map((g) => (
                      <tr key={g.guide_id} className="hover:bg-slate-900/50">
                        <td className="py-2.5 px-3 font-bold text-slate-200">{g.guide_id}</td>
                        <td className="py-2.5 px-3 text-slate-300">
                          {g.patient_guide_20nt} <strong className="text-cyan-400">[{g.pam_sequence}]</strong>
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-emerald-400">
                          {Math.round(g.on_target_efficiency_patient * 100)}%
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-indigo-400">
                          {g.off_target_cfd_score} / 100
                        </td>
                        <td className="py-2.5 px-3 font-sans text-slate-400 text-[11px]">
                          {g.mutation_alert || g.notes}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Expert Review Gate Section */}
            <div className="space-y-2 text-xs">
              <span className="font-bold text-slate-300 block uppercase tracking-wider text-[11px]">
                3. Institutional Ethics & Expert Review Gate
              </span>
              {reportData?.human_expert_review_gate?.decision ? (
                <div className="bg-emerald-950/30 border border-emerald-800/60 rounded-xl p-4 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-400 flex items-center gap-1.5 text-sm">
                      <CheckCircle2 className="w-4 h-4" /> Decision: {reportData.human_expert_review_gate.decision}
                    </span>
                    <span className="font-mono text-[11px] text-slate-500">
                      {reportData.human_expert_review_gate.reviewed_at}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-300 pt-1">
                    <div>
                      <strong>Reviewer:</strong> {reportData.human_expert_review_gate.reviewer_name}
                      <div className="text-[11px] text-slate-400">
                        {reportData.human_expert_review_gate.reviewer_credentials}
                      </div>
                    </div>
                    <div>
                      <strong>Ethics Protocol:</strong> {reportData.human_expert_review_gate.irb_number}
                    </div>
                  </div>
                  <div className="bg-slate-950 p-2.5 rounded border border-slate-800 text-[11px] text-slate-300 mt-2">
                    <strong>Reviewer Directive:</strong> {reportData.human_expert_review_gate.rationale}
                  </div>
                </div>
              ) : (
                <div className="bg-amber-950/30 border border-amber-800/40 rounded-xl p-4 text-xs text-amber-300">
                  <strong>Status: Pending Human Review Gate</strong> &bull; This candidate dossier requires formal sign-off in the CRISPR Designer tab before experimental progression.
                </div>
              )}
            </div>

            {/* Regeneration Modality Section */}
            {reportData?.regeneration_data && (
              <div className="space-y-2 text-xs">
                <span className="font-bold text-slate-300 block uppercase tracking-wider text-[11px]">
                  4. Stem Cell & Regeneration Modality (Preclinical Screen)
                </span>
                <div className={`border rounded-xl p-4 space-y-2 text-xs ${
                  reportData.regeneration_data.risk_color === 'emerald' ? 'bg-emerald-950/20 border-emerald-800/60' :
                  reportData.regeneration_data.risk_color === 'amber' ? 'bg-amber-950/20 border-amber-800/60' :
                  'bg-rose-950/20 border-rose-800/60'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200">Tumorigenic Risk Score:</span>
                    <span className={`font-mono font-bold text-sm ${
                      reportData.regeneration_data.risk_color === 'emerald' ? 'text-emerald-400' :
                      reportData.regeneration_data.risk_color === 'amber' ? 'text-amber-400' : 'text-rose-400'
                    }`}>
                      {reportData.regeneration_data.tumorigenic_risk_score}
                    </span>
                  </div>
                  <div className="text-slate-300 font-medium">
                    Verdict: {reportData.regeneration_data.clinical_verdict}
                  </div>
                  {reportData.regeneration_data.oncogene_flags?.length > 0 && (
                    <div className="mt-2 text-[11px] text-rose-300">
                      <strong>Oncogene Warnings:</strong>
                      <ul className="list-disc pl-4 mt-1">
                        {reportData.regeneration_data.oncogene_flags.map((flag, idx) => (
                          <li key={idx}>{flag.factor}: {flag.warning}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Cryptographic Audit Trail */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Terminal className="w-4 h-4 text-cyan-400" /> Immutable Audit Trail
              </h4>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={fetchAuditLogs}
                  className="text-[10px] text-slate-400 hover:text-cyan-300 bg-slate-800 px-1.5 py-0.5 rounded transition-all"
                  title="Refresh audit events"
                >
                  Refresh
                </button>
                <span className="text-[10px] font-mono bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                  SHA-256
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Every query, model calculation, VCF intake, and review gate transition is recorded with cryptographic integrity hashes.
            </p>

            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {auditLogs.length > 0 ? (
                auditLogs.map((log, idx) => (
                  <div key={idx} className="bg-slate-950 p-2.5 rounded-lg border border-slate-800/80 font-mono text-[10px] space-y-1">
                    <div className="flex items-center justify-between text-slate-400">
                      <span className="font-bold text-cyan-400">{log.action}</span>
                      <span className="text-[9px]">{log.timestamp?.substring(11, 19)}Z</span>
                    </div>
                    <div className="text-slate-300 font-sans text-[11px]">
                      User: <strong>{log.user_id}</strong> &bull; Status: <span className="text-emerald-400 font-mono font-bold">{log.status}</span>
                    </div>
                    <div className="text-slate-500 break-all text-[9px] pt-0.5">
                      Hash: {log.integrity_hash?.substring(0, 24)}...
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-xs text-slate-500 text-center py-4">No audit events recorded yet.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
