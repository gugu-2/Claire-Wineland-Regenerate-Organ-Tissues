"""
viral_tropism_modeler.py
─────────────────────────
Phase 3 — OncoViral Therapy Planner

Inspired by Dr. Beata Halassy's self-treatment of breast cancer using Measles Virus (MV)
and Vesicular Stomatitis Virus (VSV), this module formalizes and automates the
computational design process for oncolytic virus therapy.

Provides:
  - Viral chassis recommendation by cancer type + TMB + immune status
  - Cytokine payload design (GM-CSF, IL-12, IFN-β)
  - Tumor-specific synthetic promoter selection (TERT, Survivin, CEA)
  - Immunogenicity risk assessment
  - BSL-2 containment requirements
  - Golden Gate assembly strategy output
"""
from typing import Dict, List, Optional

# ── Oncolytic Virus Backbone Database ────────────────────────────────────────
ONCOLYTIC_VIRUS_BACKBONES: Dict[str, Dict] = {
    "HSV1_T-VEC_family": {
        "id": "HSV1_T-VEC_family",
        "name": "Herpes Simplex Virus Type 1 (HSV-1 / T-VEC family)",
        "short_name": "HSV-1",
        "genome_size_kb": 152,
        "bsl_level": 2,
        "bsl_note": "Requires BSL-2 containment for viral preparation and administration.",
        "fda_precedent": "T-VEC (Talimogene laherparepvec / Imlygic) — FDA Approved Oct 2015 for Advanced Melanoma",
        "tumor_selectivity_mechanism": (
            "Exploits defective interferon (IFN) signaling in cancer cells. "
            "ICP34.5 deletion removes neurovirulence and restricts replication to IFN-pathway-deficient tumor cells. "
            "ICP47 deletion restores MHC-I antigen presentation in infected cells, enhancing immune recognition."
        ),
        "natural_tropism": ["Epithelial", "Neural", "Mucosal"],
        "payload_capacity_kb": 30,
        "intratumoral_delivery": True,
        "systemic_delivery": False,
        "required_deletions": ["ICP34.5 (RL1) — removes neurovirulence", "ICP47 (US12) — restores MHC-I"],
        "standard_payload": "GM-CSF (granulocyte-macrophage colony-stimulating factor) — T-VEC standard",
        "best_for_cancers": ["Melanoma (FDA approved)", "Head & Neck SCC", "Glioblastoma", "Breast Cancer", "Sarcoma"],
        "immune_activation_mechanism": "Local GM-CSF secretion recruits dendritic cells → systemic anti-tumor T-cell response",
        "known_clinical_trials": [
            "NCT00289016 — T-VEC in melanoma (pivotal Phase III, OPTiM trial)",
            "NCT01017589 — T-VEC + ipilimumab",
            "NCT04157543 — T-VEC in glioblastoma",
        ],
        "notable_case": None,
        "advantages": "Largest payload capacity; FDA-approved derivative (T-VEC); deep clinical safety data",
        "limitations": "Cannot be delivered systemically; pre-existing HSV immunity may reduce efficacy",
        "rank_score": 95,
    },
    "Measles_MV_Edmonston": {
        "id": "Measles_MV_Edmonston",
        "name": "Measles Virus — Edmonston strain (MV-Edm)",
        "short_name": "MV",
        "genome_size_kb": 16,
        "bsl_level": 2,
        "bsl_note": "BSL-2. Patient must NOT be immunocompromised (active morbillivirus risk). Verify vaccination status of caregivers.",
        "fda_precedent": "MV-NIS (Phase I/II trials for myeloma, ovarian cancer, GBM — Mayo Clinic)",
        "tumor_selectivity_mechanism": (
            "Preferentially enters cells overexpressing CD46 receptor (strongly upregulated on most cancer cells). "
            "Additionally, defective IFN signaling in tumor cells permits unrestricted viral replication. "
            "Healthy cells with functional IFN pathway limit replication."
        ),
        "natural_tropism": ["CD46+ cells (ubiquitous but overexpressed on cancer)"],
        "payload_capacity_kb": 6,
        "intratumoral_delivery": True,
        "systemic_delivery": True,
        "required_deletions": ["None (Edmonston strain is vaccine-derived, inherently attenuated)"],
        "standard_payload": "NIS (sodium-iodide symporter) — enables radioiodine imaging and therapy tracking",
        "best_for_cancers": ["Multiple Myeloma", "Ovarian Cancer", "Breast Cancer (Dr. Halassy case)", "GBM", "T-cell Lymphoma"],
        "immune_activation_mechanism": "Direct oncolysis + IFN-γ production + CD8+ T-cell priming at tumor site",
        "known_clinical_trials": [
            "NCT00450814 — MV-NIS in multiple myeloma (Mayo Clinic)",
            "NCT02444546 — MV-NIS in ovarian cancer",
            "NCT00390299 — MV-CEA in GBM",
        ],
        "notable_case": (
            "Dr. Beata Halassy — virologist who self-treated recurrent breast cancer by "
            "intratumorally injecting MV (Edmonston strain) followed by VSV (Indiana strain). "
            "Published in Vaccines (2024). Tumor clearance achieved; no severe systemic adverse events. "
            "First published case of oncolytic virotherapy self-treatment."
        ),
        "advantages": "Vaccine-derived (inherently safe); systemic delivery possible; strong track record",
        "limitations": "Pre-existing measles immunity (common from MMR vaccine) may reduce efficacy — screen with serology",
        "rank_score": 88,
    },
    "VSV_Indiana": {
        "id": "VSV_Indiana",
        "name": "Vesicular Stomatitis Virus — Indiana Serotype (VSV)",
        "short_name": "VSV",
        "genome_size_kb": 11,
        "bsl_level": 2,
        "bsl_note": "BSL-2. Non-pathogenic in humans (causes mild flu-like symptoms at most). Low pre-existing immunity in human population.",
        "fda_precedent": "VSV-IFNβ-NIS in Phase I/II trials (hematological malignancies, hepatocellular carcinoma — Mayo Clinic)",
        "tumor_selectivity_mechanism": (
            "Highly sensitive to IFN — normal cells activate IFN response upon infection, halting viral replication. "
            "Cancer cells with defective IFN signaling (STAT1 loss, IRF3 deletion) cannot halt VSV replication → "
            "viral spread restricted almost entirely to tumor tissue."
        ),
        "natural_tropism": ["IFN-deficient cells (almost exclusively cancer cells in humans)"],
        "payload_capacity_kb": 5,
        "intratumoral_delivery": True,
        "systemic_delivery": True,
        "required_deletions": ["M51R mutation (reduces neurotoxicity while preserving oncolysis)"],
        "standard_payload": "IFNβ (enhances normal cell protection) + NIS (imaging)",
        "best_for_cancers": ["Hepatocellular Carcinoma", "T-cell Lymphoma", "AML", "Melanoma", "Breast Cancer (Dr. Halassy combination)"],
        "immune_activation_mechanism": "Rapid oncolysis + potent innate immune activation; IFNβ payload protects normal cells",
        "known_clinical_trials": [
            "NCT01628640 — VSV-IFNβ-NIS in hematological malignancies",
            "NCT03120624 — VSV-IFNβ in hepatocellular carcinoma",
        ],
        "notable_case": (
            "Dr. Beata Halassy used VSV (Indiana strain) as the second virus in her self-treatment "
            "protocol, administered after initial MV treatment to continue tumor debulking. "
            "The combination of MV + VSV is now being studied as a rational two-virus oncolytic combination."
        ),
        "advantages": "Very low pre-existing human immunity (unlike HSV or measles); rapid replication; safe systemic delivery",
        "limitations": "Small payload capacity; M51R safety mutation reduces replication in some tumor types",
        "rank_score": 85,
    },
    "Adenovirus_Ad5_Delta24": {
        "id": "Adenovirus_Ad5_Delta24",
        "name": "Adenovirus Type 5 — Delta-24 variant (DNX-2401 family)",
        "short_name": "Ad5-Delta24",
        "genome_size_kb": 36,
        "bsl_level": 2,
        "bsl_note": "BSL-2. Adenoviruses are common respiratory viruses; modified vectors are replication-competent only in tumor cells.",
        "fda_precedent": "DNX-2401 — Phase II glioblastoma (MD Anderson; achieved 20% complete response rate in GBM)",
        "tumor_selectivity_mechanism": (
            "Delta-24 (24-bp deletion in E1A CR2 region) prevents viral E1A from binding pRb, "
            "restricting replication to cells with disrupted Rb pathway — a near-universal feature of cancer. "
            "CAR receptor (Coxsackievirus-Adenovirus Receptor) modification enables tumor-specific entry."
        ),
        "natural_tropism": ["Respiratory epithelial cells (natural); modified for tumor tropism"],
        "payload_capacity_kb": 8,
        "intratumoral_delivery": True,
        "systemic_delivery": False,
        "required_deletions": ["E1A Delta-24 (Rb-binding disruption)", "E3 (payload space expansion)"],
        "standard_payload": "TRAIL, IL-12, or GM-CSF depending on cancer type",
        "best_for_cancers": ["Glioblastoma (GBM)", "NSCLC", "Colorectal Cancer", "Pancreatic Cancer", "Ovarian Cancer"],
        "immune_activation_mechanism": "Direct Rb-pathway-selective oncolysis + optional cytokine payload",
        "known_clinical_trials": [
            "NCT00805376 — DNX-2401 in GBM (Phase I/II, MD Anderson)",
            "NCT03896568 — DNX-2401 + pembrolizumab in GBM",
        ],
        "notable_case": None,
        "advantages": "Large payload capacity; well-characterized biology; strong GBM clinical data",
        "limitations": "High pre-existing human anti-adenovirus immunity can neutralize vector before tumor reach; intratumoral only",
        "rank_score": 82,
    },
    "NDV_HUJ_strain": {
        "id": "NDV_HUJ_strain",
        "name": "Newcastle Disease Virus — HUJ Strain (NDV)",
        "short_name": "NDV",
        "genome_size_kb": 15,
        "bsl_level": 1,  # NDV is non-pathogenic in humans — BSL-1
        "bsl_note": "BSL-1 — NDV is a poultry virus, non-pathogenic in humans. Lowest biosafety requirement of any oncolytic virus.",
        "fda_precedent": "NDV-HUJ — Phase I/II trials in glioblastoma and colorectal cancer",
        "tumor_selectivity_mechanism": (
            "NDV is inherently non-pathogenic in humans due to species restriction. "
            "It replicates selectively in human cancer cells because: (1) cancer cells are highly "
            "permissive to NDV replication; (2) normal human cells activate RIG-I/IFN response that "
            "rapidly clears NDV. This creates natural tumor selectivity without genetic engineering."
        ),
        "natural_tropism": ["Permissive to cancer cells; rapidly cleared from normal cells"],
        "payload_capacity_kb": 4,
        "intratumoral_delivery": True,
        "systemic_delivery": True,
        "required_deletions": ["None (natural selectivity without modification)"],
        "standard_payload": "IL-2 or GM-CSF",
        "best_for_cancers": ["Glioblastoma", "Colorectal Cancer", "Pancreatic Cancer", "Melanoma"],
        "immune_activation_mechanism": "Potent innate immune stimulator — strongly activates NK cells and type I IFN cascade",
        "advantages": "BSL-1 (easiest to work with); no pre-existing human immunity; potent immunostimulator",
        "limitations": "Small payload; less clinical data than HSV-1 or Ad5",
        "rank_score": 75,
    },
}

# ── Cytokine Payload Catalog ─────────────────────────────────────────────────
CYTOKINE_PAYLOADS: Dict[str, Dict] = {
    "GM-CSF": {
        "gene": "CSF2", "protein": "Granulocyte-Macrophage Colony-Stimulating Factor",
        "size_bp": 492,
        "mechanism": "Recruits and matures dendritic cells at tumor site → enhanced antigen presentation → systemic T-cell priming",
        "clinical_precedent": "Standard payload in T-VEC (FDA approved); proven clinical benefit in melanoma",
        "best_combination": ["HSV-1", "Ad5"],
        "immune_effect": "Dendritic cell recruitment + T-cell priming",
    },
    "IL-12": {
        "gene": "IL12A + IL12B", "protein": "Interleukin-12",
        "size_bp": 1200,
        "mechanism": "Master cytokine for Th1 polarization; activates NK cells and CD8+ cytotoxic T-cells; inhibits Treg suppression",
        "clinical_precedent": "Ad-IL12 (Phase I glioblastoma); strong anti-tumor activity in preclinical models",
        "best_combination": ["Ad5", "MV"],
        "immune_effect": "NK cell + CD8+ T-cell activation; Th1 polarization; Treg inhibition",
    },
    "IFN-beta": {
        "gene": "IFNB1", "protein": "Interferon Beta",
        "size_bp": 561,
        "mechanism": "Protects normal cells from viral spread; enhances tumor cell MHC-I expression; activates NK cells",
        "clinical_precedent": "VSV-IFNβ standard construct; protects normal tissue while maintaining oncolytic activity",
        "best_combination": ["VSV"],
        "immune_effect": "Normal cell protection + tumor MHC-I upregulation",
    },
    "NIS": {
        "gene": "SLC5A5", "protein": "Sodium-Iodide Symporter",
        "size_bp": 1929,
        "mechanism": "Not directly cytotoxic — allows radioiodine (¹³¹I) uptake into virus-infected tumor cells for radiovirotherapy; also enables non-invasive imaging (¹²³I SPECT, ¹²⁴I PET) to track viral spread",
        "clinical_precedent": "MV-NIS (standard in Mayo Clinic MV trials); VSV-IFNβ-NIS",
        "best_combination": ["MV", "VSV"],
        "immune_effect": "Enables radioiodine therapy boost (radiovirotherapy); imaging reporter",
    },
    "IL-2": {
        "gene": "IL2", "protein": "Interleukin-2",
        "size_bp": 462,
        "mechanism": "T-cell growth factor; expands tumor-infiltrating lymphocytes (TILs) at tumor site; enhances NK cell cytotoxicity",
        "clinical_precedent": "NDV-IL2 (historical clinical trials); high-dose systemic IL-2 FDA-approved for melanoma/renal",
        "best_combination": ["NDV"],
        "immune_effect": "TIL expansion + NK cell enhancement",
    },
}

# ── Tumor-Specific Promoters ─────────────────────────────────────────────────
TUMOR_SPECIFIC_PROMOTERS: Dict[str, Dict] = {
    "TERT_promoter": {
        "name": "Telomerase Reverse Transcriptase (TERT) Promoter",
        "size_bp": 378,
        "active_in": "~90% of all cancers (telomerase reactivation is nearly universal in malignancy)",
        "inactive_in": "Most normal somatic cells (telomerase repressed after development)",
        "cancer_types": ["Pan-cancer — near-universal"],
        "selectivity": "VERY HIGH — one of the most tumor-specific promoters known",
        "clinical_precedent": "Used in multiple oncolytic adenovirus constructs (Telomelysin / OBP-301)",
    },
    "Survivin_promoter": {
        "name": "Survivin (BIRC5) Promoter",
        "size_bp": 268,
        "active_in": "Most cancers (Survivin is the most cancer-specific gene expression marker known)",
        "inactive_in": "Normal differentiated tissue (absent in most adult organs)",
        "cancer_types": ["Pan-cancer — highly specific"],
        "selectivity": "VERY HIGH",
        "clinical_precedent": "SurviCide — survivin-promoter driven adenovirus (clinical trials)",
    },
    "AFP_promoter": {
        "name": "Alpha-Fetoprotein (AFP) Promoter",
        "size_bp": 314,
        "active_in": "Hepatocellular carcinoma (HCC) — highly specific",
        "inactive_in": "Normal adult liver (AFP repressed after birth)",
        "cancer_types": ["Hepatocellular Carcinoma (HCC)"],
        "selectivity": "VERY HIGH — HCC specific",
    },
    "CEA_promoter": {
        "name": "Carcinoembryonic Antigen (CEA) Promoter",
        "size_bp": 349,
        "active_in": "Colorectal, pancreatic, lung, breast cancers",
        "inactive_in": "Normal adult epithelial tissue",
        "cancer_types": ["Colorectal", "Pancreatic", "Lung", "Breast"],
        "selectivity": "HIGH",
    },
    "HER2_promoter": {
        "name": "HER2/ErbB2 Promoter",
        "size_bp": 291,
        "active_in": "HER2+ breast cancer, gastric cancer",
        "inactive_in": "HER2-normal tissue",
        "cancer_types": ["HER2+ Breast Cancer", "Gastric Cancer"],
        "selectivity": "HIGH — HER2-amplified tumors",
    },
}


def recommend_viral_chassis(
    cancer_type: str,
    tmb_classification: str = "TMB-Low",
    msi_status: str = "MSS",
    immune_status: str = "Immunocompetent",
    biopsy_site: str = "Primary Tumor",
) -> Dict:
    """
    Recommends the top 3 oncolytic virus backbones for a given patient profile.

    Ranking is based on:
    - Cancer-type match (best_for_cancers)
    - Clinical evidence quality (FDA precedent > Phase II > Phase I)
    - Immunological context (TMB-High / MSI-H → prefer highly immunogenic viruses)
    - Patient immune status (immunocompromised patients have specific restrictions)
    """
    cancer_lower = cancer_type.lower()

    # Score each backbone
    scored = []
    for virus_id, v in ONCOLYTIC_VIRUS_BACKBONES.items():
        score = v["rank_score"]

        # Boost score for cancer-type match
        cancer_match = any(
            ct.lower() in cancer_lower or cancer_lower in ct.lower()
            for ct in v["best_for_cancers"]
        )
        if cancer_match:
            score += 20

        # Boost for TMB-High (prefer highly immunogenic viruses)
        if tmb_classification == "TMB-High" and v["immune_activation_mechanism"]:
            score += 5

        # MSI-H tumors respond very well to immune activation
        if msi_status == "MSI-High":
            score += 5

        # Penalize if patient is immunocompromised and systemic delivery planned
        if immune_status == "Immunocompromised" and v["systemic_delivery"]:
            score -= 30  # Safety penalty

        # Notable case bonus (Dr. Halassy's MV+VSV)
        if v.get("notable_case"):
            score += 8

        scored.append((score, v))

    # Sort by score descending
    scored.sort(key=lambda x: -x[0])
    top_3 = scored[:3]

    recommendations = []
    for rank, (score, v) in enumerate(top_3, 1):
        recommendations.append({
            "rank": rank,
            "virus_id": v["id"],
            "name": v["name"],
            "short_name": v["short_name"],
            "score": score,
            "bsl_level": v["bsl_level"],
            "bsl_note": v["bsl_note"],
            "fda_precedent": v["fda_precedent"],
            "tumor_selectivity_mechanism": v["tumor_selectivity_mechanism"],
            "payload_capacity_kb": v["payload_capacity_kb"],
            "intratumoral_delivery": v["intratumoral_delivery"],
            "systemic_delivery": v["systemic_delivery"],
            "standard_payload": v["standard_payload"],
            "required_modifications": v["required_deletions"],
            "best_for_cancers": v["best_for_cancers"],
            "advantages": v["advantages"],
            "limitations": v["limitations"],
            "notable_case": v.get("notable_case"),
            "known_clinical_trials": v.get("known_clinical_trials", []),
        })

    return {
        "patient_cancer_type": cancer_type,
        "tmb_classification": tmb_classification,
        "msi_status": msi_status,
        "immune_status": immune_status,
        "top_3_recommendations": recommendations,
        "first_choice": recommendations[0] if recommendations else None,
        "ranking_rationale": (
            f"Ranked by cancer-type match ({cancer_type}), clinical evidence quality, "
            f"TMB-{tmb_classification} immunological context, and safety profile for "
            f"{immune_status} patient."
        ),
    }


def design_viral_blueprint(
    virus_id: str,
    cancer_type: str,
    cytokine_payload: str = "GM-CSF",
    promoter: str = "TERT_promoter",
) -> Dict:
    """
    Designs a complete viral therapy blueprint for a selected backbone.

    Returns a full engineering specification including:
    - Required genomic deletions from the viral backbone
    - Cytokine payload insertion
    - Tumor-specific promoter selection
    - BSL requirements
    - Estimated Golden Gate assembly strategy
    - IBC pre-approval checklist
    """
    virus = ONCOLYTIC_VIRUS_BACKBONES.get(virus_id)
    if not virus:
        return {"error": f"Unknown virus ID: {virus_id}. Available: {list(ONCOLYTIC_VIRUS_BACKBONES.keys())}"}

    payload = CYTOKINE_PAYLOADS.get(cytokine_payload, CYTOKINE_PAYLOADS["GM-CSF"])
    tumor_promoter = TUMOR_SPECIFIC_PROMOTERS.get(promoter, TUMOR_SPECIFIC_PROMOTERS["TERT_promoter"])

    # Check payload fits within capacity
    payload_fits = payload["size_bp"] / 1000 <= virus["payload_capacity_kb"]

    return {
        "blueprint_title": f"{virus['short_name']} Oncolytic Virus Blueprint — {cancer_type}",
        "selected_backbone": {
            "id": virus["id"],
            "name": virus["name"],
            "genome_size_kb": virus["genome_size_kb"],
            "bsl_level": virus["bsl_level"],
            "bsl_note": virus["bsl_note"],
        },
        "required_genomic_deletions": virus["required_deletions"],
        "payload_design": {
            "cytokine": cytokine_payload,
            "gene": payload["gene"],
            "protein_name": payload["protein"],
            "size_bp": payload["size_bp"],
            "mechanism": payload["mechanism"],
            "clinical_precedent": payload["clinical_precedent"],
            "fits_within_capacity": payload_fits,
            "capacity_warning": (
                None if payload_fits else
                f"⚠️ Payload size ({payload['size_bp']} bp = {payload['size_bp']/1000:.1f} kb) "
                f"exceeds backbone payload capacity ({virus['payload_capacity_kb']} kb). "
                "Consider using a truncated cytokine sequence or switching to a higher-capacity backbone."
            ),
        },
        "tumor_specific_promoter": {
            "name": tumor_promoter["name"],
            "size_bp": tumor_promoter["size_bp"],
            "active_in": tumor_promoter["active_in"],
            "inactive_in": tumor_promoter["inactive_in"],
            "selectivity": tumor_promoter["selectivity"],
        },
        "assembly_strategy": {
            "method": "Golden Gate Assembly (BsaI Type IIS restriction enzyme)",
            "insert_order": [
                f"1. Viral backbone PCR amplification (with planned deletion cassettes)",
                f"2. Tumor-specific promoter synthesis ({tumor_promoter['size_bp']} bp — {tumor_promoter['name']})",
                f"3. Cytokine cDNA synthesis ({payload['size_bp']} bp — {payload['protein']})",
                f"4. Poly-A signal + reporter (NIS or GFP for tracking)",
                f"5. Golden Gate ligation → verify by Sanger sequencing",
                f"6. Large-scale production in permissive cell line (Vero cells for HSV-1/VSV; Detroit 548 for MV)",
                f"7. Viral titer determination (TCID50 assay) — target: 1×10⁶–1×10⁸ TCID50/mL",
                f"8. Safety testing: Sterility, mycoplasma, replication-competent revertant testing",
            ],
        },
        "delivery_protocol": {
            "route": "Intratumoral injection" if virus["intratumoral_delivery"] and not virus["systemic_delivery"] else "Intratumoral (preferred) or Intravenous",
            "volume_per_injection": "Up to 4 mL per accessible lesion",
            "dosing_schedule": "Every 2 weeks × 6 cycles (adapt to T-VEC standard for HSV-1)",
            "monitoring_required": ["Vital signs every 30 minutes post-injection", "Cytokine levels at 24h", "CBC weekly"],
        },
        "ibc_approval_checklist": [
            "☐ BSL-2 institutional certification active and current",
            "☐ Personnel trained in BSL-2 viral work",
            "☐ Biosafety cabinet class II type A2 available",
            "☐ Viral inactivation protocol documented",
            "☐ Patient immune status screened (pre-existing virus immunity serology)",
            "☐ Emergency containment plan filed with IBC",
            "☐ IBC protocol number assigned before any viral preparation begins",
            "☐ IRB approval covers viral therapy arm of study",
        ],
        "oncology_disclaimer": (
            "⚠️ RESEARCH USE ONLY. This viral therapy blueprint is a computational design "
            "output for preclinical research planning. All viral constructs require: "
            "(1) Institutional Biosafety Committee (IBC) pre-approval, "
            "(2) CLIA-certified viral manufacturing (GMP-grade), "
            "(3) Preclinical in vitro and in vivo validation, "
            "(4) FDA IND application before any human administration. "
            "No patient administration without full regulatory approval."
        ),
    }
