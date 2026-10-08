from typing import Dict, List
from modules.sample_intake import load_benchmark_samples, load_reference_genes, build_personalized_sequence
from modules.crispr_designer import scan_candidate_guides

def generate_cohort_comparison_matrix(target_gene: str = "CCR5") -> Dict:
    """
    Evaluates candidate guide RNAs across all benchmark patient profiles simultaneously,
    generating a cross-patient comparative efficiency and variant collision matrix.
    """
    ref_genes = load_reference_genes()
    if target_gene not in ref_genes:
        target_gene = "CCR5"
        
    ref_seq = ref_genes[target_gene]["reference_sequence"]
    benchmark_samples = load_benchmark_samples()

    # Filter samples that match this gene or general cohorts
    relevant_samples = [
        s for s in benchmark_samples 
        if s.get("target_gene") == target_gene or s.get("sample_id") == "PATIENT_001_WT"
    ]
    if not relevant_samples:
        relevant_samples = benchmark_samples[:4]

    patient_columns = []
    guide_rows: Dict[str, Dict] = {}

    for sample in relevant_samples:
        sample_id = sample["sample_id"]
        donor_id = sample.get("donor_id", "Donor")
        clinical_status = sample.get("clinical_status", "General")
        patient_columns.append({
            "sample_id": sample_id,
            "donor_id": donor_id,
            "clinical_status": clinical_status,
            "has_variants": len(sample.get("variants", [])) > 0
        })

        # Reconstitute personal sequence
        pers_data = build_personalized_sequence(target_gene, sample.get("variants", []))

        # Scan candidate guides
        candidates = scan_candidate_guides(
            target_gene=target_gene,
            reference_sequence=ref_seq,
            personalized_sequence=pers_data["personalized_sequence"],
            personal_variants=pers_data["applied_variants"],
            pam_type="SpCas9_NGG"
        )

        for c in candidates:
            g_id = c["guide_id"]
            if g_id not in guide_rows:
                guide_rows[g_id] = {
                    "guide_id": g_id,
                    "target_domain": c["target_domain"],
                    "reference_sequence": c["reference_guide_20nt"],
                    "pam": c["pam_sequence"],
                    "reference_efficiency": c["on_target_efficiency_reference"],
                    "patient_scores": {}
                }

            guide_rows[g_id]["patient_scores"][sample_id] = {
                "on_target_efficiency": c["on_target_efficiency_patient"],
                "cleavage_pct": c["predicted_cleavage_efficiency"],
                "pam_status": c["pam_status"],
                "is_collision": c["is_personalized_different"],
                "cfd_risk": c["off_target_risk_level"],
                "mutation_alert": c["mutation_alert"]
            }

    # Calculate cohort coverage (percentage of cohort with >= 60% efficiency)
    processed_rows = []
    for g_id, row_data in guide_rows.items():
        scores = row_data["patient_scores"].values()
        effective_count = sum(1 for s in scores if s["on_target_efficiency"] >= 0.60 and not s["is_collision"])
        coverage_pct = round((effective_count / max(1, len(patient_columns))) * 100, 1)

        row_data["cohort_coverage_pct"] = coverage_pct
        row_data["is_universal_guide"] = (coverage_pct == 100.0)
        processed_rows.append(row_data)

    # Sort rows by cohort coverage descending
    processed_rows.sort(key=lambda r: r["cohort_coverage_pct"], reverse=True)

    return {
        "target_gene": target_gene,
        "total_cohort_samples": len(patient_columns),
        "cohort_patients": patient_columns,
        "guide_comparison_rows": processed_rows
    }
