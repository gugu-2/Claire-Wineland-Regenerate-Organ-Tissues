import json
from datetime import datetime, timezone
from typing import Dict, List, Optional
from core.config import APP_NAME, APP_VERSION, DISCLAIMER_TEXT
from core.security import record_audit_event

def generate_research_report(
    sample_info: Dict,
    personal_sequence_data: Dict,
    candidate_guides: List[Dict],
    expert_review: Optional[Dict] = None,
    regeneration_data: Optional[Dict] = None,
    citations: Optional[List[Dict]] = None
) -> Dict:
    """
    Generates a structured research dossier object containing all experimental parameters,
    computational predictions, safety ratings, and expert review records.
    """
    timestamp = datetime.now(timezone.utc).isoformat()
    sample_id = sample_info.get("sample_id", "UNKNOWN_SAMPLE")
    target_gene = sample_info.get("target_gene", "UNKNOWN_GENE")

    report_id = f"REP-{target_gene}-{sample_id}-{int(datetime.now().timestamp())}"

    report = {
        "report_id": report_id,
        "app_metadata": {
            "system_name": APP_NAME,
            "version": APP_VERSION,
            "generated_at": timestamp,
            "regulatory_disclaimer": DISCLAIMER_TEXT
        },
        "sample_profile": {
            "sample_id": sample_id,
            "donor_id": sample_info.get("donor_id", "N/A"),
            "sample_type": sample_info.get("sample_type", "N/A"),
            "target_gene": target_gene,
            "clinical_status": sample_info.get("clinical_status", "Preclinical Assessment"),
            "consent_status": sample_info.get("consent_status", "Verified"),
            "reference_assembly": sample_info.get("alignment_reference", "GRCh38")
        },
        "personalized_genomic_findings": {
            "chromosome": personal_sequence_data.get("chromosome", ""),
            "coordinates": personal_sequence_data.get("coordinates", ""),
            "has_personal_alterations": personal_sequence_data.get("has_personal_alterations", False),
            "applied_variants": personal_sequence_data.get("applied_variants", [])
        },
        "candidate_guides": candidate_guides,
        "regeneration_analysis": regeneration_data,
        "literature_citations": citations or [],
        "human_expert_review_gate": expert_review or {
            "status": "PENDING_EXPERT_REVIEW",
            "message": "This candidate design has not yet completed mandatory human expert review sign-off."
        }
    }

    # Record report generation in audit log
    record_audit_event(
        action="GENERATE_RESEARCH_DOSSIER",
        user_id=expert_review.get("reviewer_name", "researcher_session") if expert_review else "researcher_session",
        details={"report_id": report_id, "guide_count": len(candidate_guides)},
        sample_id=sample_id
    )

    return report

def generate_html_report(report_data: Dict) -> str:
    """
    Converts the structured research report object into an elegant, publication-grade HTML report.
    """
    sample = report_data["sample_profile"]
    guides = report_data["candidate_guides"]
    review = report_data["human_expert_review_gate"]
    disclaimer = report_data["app_metadata"]["regulatory_disclaimer"]

    guides_html = ""
    for g in guides:
        is_diff = g.get("is_personalized_different", False)
        diff_badge = '<span style="background:#fee2e2; color:#b91c1c; padding:2px 8px; border-radius:9999px; font-size:11px; font-weight:bold;">PERSONAL SNP IMPACT</span>' if is_diff else '<span style="background:#dcfce7; color:#15803d; padding:2px 8px; border-radius:9999px; font-size:11px; font-weight:bold;">REFERENCE MATCH</span>'
        
        guides_html += f"""
        <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 10px; font-family: monospace; font-weight: bold;">{g['guide_id']}</td>
            <td style="padding: 10px; font-family: monospace; font-size: 13px;">{g['patient_guide_20nt']}<br><span style="color:#6b7280; font-size:11px;">PAM: {g['pam_sequence']}</span></td>
            <td style="padding: 10px; text-align: center;">{diff_badge}</td>
            <td style="padding: 10px; text-align: center; font-weight: bold; color: {'#16a34a' if g['on_target_efficiency_patient'] > 0.6 else '#dc2626'};">
                {int(g['on_target_efficiency_patient'] * 100)}%
                <div style="font-size: 10px; color: #6b7280;">95% CI: [{g['confidence_interval_95'][0]}, {g['confidence_interval_95'][1]}]</div>
            </td>
            <td style="padding: 10px; text-align: center;">
                <span style="font-weight: bold;">{g['off_target_cfd_score']}</span> / 100
                <div style="font-size: 10px; color: {'#16a34a' if g['off_target_risk_level'] == 'LOW_RISK' else '#dc2626'}; font-weight: bold;">{g['off_target_risk_level']}</div>
            </td>
            <td style="padding: 10px; font-size: 12px; color: #4b5563;">{g.get('mutation_alert') or g.get('notes', '')}</td>
        </tr>
        """

    review_html = ""
    if review and review.get("decision"):
        review_html = f"""
        <div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 16px; margin-top: 20px;">
            <h3 style="margin-top: 0; color: #166534;">Human Expert Review Gate: {review.get('decision')}</h3>
            <p style="margin: 4px 0;"><strong>Reviewer:</strong> {review.get('reviewer_name')} ({review.get('reviewer_credentials')})</p>
            <p style="margin: 4px 0;"><strong>Protocol / IRB:</strong> {review.get('irb_number')}</p>
            <p style="margin: 4px 0;"><strong>Reviewer Rationale:</strong> {review.get('rationale')}</p>
            <p style="margin: 4px 0; font-size: 12px; color: #6b7280;"><strong>Signed at:</strong> {review.get('reviewed_at')}</p>
        </div>
        """
    else:
        review_html = """
        <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 16px; margin-top: 20px;">
            <h3 style="margin-top: 0; color: #92400e;">Human Expert Review Gate: PENDING</h3>
            <p style="margin: 0; color: #78350f;">This candidate design dossier has not yet received human expert sign-off. Do not proceed to wet-lab experiments until institutional ethics and laboratory review is complete.</p>
        </div>
        """

    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Research Dossier - {sample['sample_id']}</title>
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.5; color: #111827; margin: 40px auto; max-width: 960px; padding: 0 20px; }}
            .disclaimer-banner {{ background-color: #fee2e2; border-left: 6px solid #dc2626; padding: 16px; margin-bottom: 24px; border-radius: 4px; }}
            .disclaimer-title {{ font-weight: bold; color: #991b1b; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; }}
            .disclaimer-body {{ color: #7f1d1d; font-size: 13px; margin-top: 4px; }}
            .header-table {{ width: 100%; border-collapse: collapse; margin-bottom: 24px; }}
            .header-table td {{ padding: 6px 12px; font-size: 13px; }}
            .section-title {{ font-size: 18px; font-weight: bold; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; margin-top: 32px; color: #1f2937; }}
            table.data-table {{ width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 13px; }}
            table.data-table th {{ background-color: #f9fafb; padding: 10px; text-align: left; border-bottom: 2px solid #e5e7eb; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #4b5563; }}
        </style>
    </head>
    <body>
        <div class="disclaimer-banner">
            <div class="disclaimer-title">Mandatory Safety & Compliance Notice</div>
            <div class="disclaimer-body">{disclaimer}</div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: baseline; border-bottom: 2px solid #111827; padding-bottom: 12px;">
            <div>
                <h1 style="margin: 0; font-size: 26px; color: #111827;">Genomic Research Candidate Dossier</h1>
                <div style="color: #6b7280; font-size: 13px; margin-top: 4px;">Computational Design & Personal Genome Evaluation</div>
            </div>
            <div style="text-align: right; font-size: 12px; color: #6b7280;">
                <div><strong>Dossier ID:</strong> {report_data['report_id']}</div>
                <div><strong>Date:</strong> {report_data['app_metadata']['generated_at'][:10]}</div>
            </div>
        </div>

        <div class="section-title">1. Sample & Cohort Specification</div>
        <table class="header-table" style="margin-top: 12px; background: #f9fafb; border-radius: 6px;">
            <tr>
                <td><strong>Sample ID:</strong> {sample['sample_id']}</td>
                <td><strong>Donor ID:</strong> {sample['donor_id']}</td>
                <td><strong>Target Gene:</strong> {sample['target_gene']}</td>
            </tr>
            <tr>
                <td><strong>Sample Type:</strong> {sample['sample_type']}</td>
                <td><strong>Reference Assembly:</strong> {sample['reference_assembly']}</td>
                <td><strong>Clinical Status:</strong> {sample['clinical_status']}</td>
            </tr>
            <tr>
                <td colspan="3"><strong>IRB Consent Status:</strong> {sample['consent_status']}</td>
            </tr>
        </table>

        <div class="section-title">2. Personalized Candidate gRNA Ranking & Risk Evaluation</div>
        <table class="data-table">
            <thead>
                <tr>
                    <th>Guide ID</th>
                    <th>Personal Sequence & PAM</th>
                    <th>Variant Status</th>
                    <th style="text-align: center;">On-Target Cleavage</th>
                    <th style="text-align: center;">CFD Specificity</th>
                    <th>Computational Notes & Rationale</th>
                </tr>
            </thead>
            <tbody>
                {guides_html}
            </tbody>
        </table>

        <div class="section-title">3. Institutional Ethics & Human Expert Review Gate</div>
        {review_html}

        <div style="margin-top: 40px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af; text-align: center;">
            Generated by {APP_NAME} v{APP_VERSION} | Cryptographic Audit Trace Enabled
        </div>
    </body>
    </html>
    """
    return html
