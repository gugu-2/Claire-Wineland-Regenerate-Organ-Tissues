"""
synthesis_validator.py — Sequence Validation and Biosecurity Screening for Automated Synthesis
Feature Spec 08 — Sprint 4

Features:
1. Oligo sequence character validation (IUPAC bases A, C, G, T, U).
2. Vendor-specific synthesis length limit verification (IDT, Twist, GenScript).
3. DURC / Select Agent biosecurity screening (toxin/pathogen signature interception).
4. Synthesis complexity and secondary structure risk assessment (hairpin loops, extreme GC).
"""

from typing import List, Dict, Tuple, Optional, Any
import re

# Restricted toxin/pathogen motifs for preclinical biosecurity compliance
BIOSECURITY_HAZARDOUS_MOTIFS = [
    {"name": "Ricin Toxin A-Chain Catalytic Loop", "pattern": "TACCGTGGACACACAG", "risk": "SELECT_AGENT"},
    {"name": "Ricin Toxin A-Chain Ribosome Inactivating Motif", "pattern": "ATGAAACCGGG", "risk": "SELECT_AGENT"},
    {"name": "Botulinum Neurotoxin Zinc Endopeptidase Core", "pattern": "CATATGTTAGCACTAC", "risk": "SELECT_AGENT"},
    {"name": "Botulinum Neurotoxin Type A Catalytic Motif", "pattern": "ATGCCATTTGTTAAT", "risk": "SELECT_AGENT"},
    {"name": "Ebola Glycoprotein Fusion Loop", "pattern": "GGTTTTCCTCTTCATG", "risk": "SELECT_AGENT"},
    {"name": "Ebola Glycoprotein Receptor Binding Domain", "pattern": "ATGGGCGTTACAGGA", "risk": "SELECT_AGENT"},
    {"name": "Variola / Poxvirus Inverted Terminal Repeat", "pattern": "ATCGGATCCTAGCTAG", "risk": "RESTRICTED_VIRAL"},
    {"name": "Variola / Orthopoxvirus Essential DNA Polymerase", "pattern": "ATGAACACTACCGCA", "risk": "RESTRICTED_VIRAL"},
    {"name": "Diphtheria Toxin ADP-Ribosylation Fragment", "pattern": "TGGTTCACACCTGGTG", "risk": "SELECT_AGENT"},
    {"name": "Diphtheria Toxin Fragment A ADP-Ribosyltransferase", "pattern": "ATGGGCGCTGATGAT", "risk": "SELECT_AGENT"}
]

VENDOR_LIMITS = {
    "IDT": {
        "standard_oligo_max_nt": 100,
        "ultramer_max_nt": 200,
        "geneblock_max_bp": 3000,
        "supported_purifications": ["Standard Desalting", "PAGE", "HPLC"],
        "supported_scales": ["25nmol", "100nmol", "1umol"]
    },
    "Twist": {
        "standard_oligo_max_nt": 300,
        "ultramer_max_nt": 350,
        "geneblock_max_bp": 5000,
        "supported_purifications": ["Standard Desalting", "High-Throughput Elution"],
        "supported_scales": ["Oligo Pool (fmol)", "Clonal Gene (4ug)"]
    },
    "GenScript": {
        "standard_oligo_max_nt": 120,
        "ultramer_max_nt": 200,
        "geneblock_max_bp": 10000,
        "supported_purifications": ["Standard Desalting", "PAGE", "HPLC", "Affinity"],
        "supported_scales": ["25nmol", "100nmol", "1umol", "10mg"]
    }
}

def validate_oligo_sequence(sequence: str, vendor: str = "IDT", product_type: str = "oligo") -> Dict[str, Any]:
    """
    Validates an oligo sequence against IUPAC requirements, vendor length bounds,
    and DURC biosecurity screening rules.
    """
    clean_seq = re.sub(r"\s+", "", sequence).upper()
    
    if not clean_seq:
        return {
            "valid": False,
            "is_approved": False,
            "status": "REJECTED",
            "vendor_rejection_code": "VENDOR_REJECT_EMPTY_SEQUENCE",
            "message": "Sequence is empty",
            "biosecurity_cleared": False
        }
        
    # Check for invalid characters
    invalid_chars = set(re.findall(r"[^ACGTU]", clean_seq))
    if invalid_chars:
        return {
            "valid": False,
            "is_approved": False,
            "status": "INVALID_CHARACTERS",
            "vendor_rejection_code": "VENDOR_REJECT_INVALID_BASES",
            "message": f"Contains non-canonical or ambiguous nucleotide bases: {', '.join(sorted(invalid_chars))}",
            "biosecurity_cleared": False
        }
        
    length = len(clean_seq)
    vendor_spec = VENDOR_LIMITS.get(vendor, VENDOR_LIMITS["IDT"])
    
    # Check vendor length limits
    if product_type == "oligo":
        max_allowed = vendor_spec["ultramer_max_nt"]
    else:
        max_allowed = vendor_spec["geneblock_max_bp"]
        
    if length > max_allowed:
        return {
            "valid": False,
            "is_approved": False,
            "status": "LENGTH_EXCEEDED",
            "vendor_rejection_code": "VENDOR_REJECT_LENGTH_EXCEEDED",
            "message": f"Sequence length ({length} nt) exceeds vendor {vendor} limit for {product_type} ({max_allowed} nt)",
            "biosecurity_cleared": False
        }
        
    # DURC Biosecurity Screening
    biosecurity_alerts = []
    for motif in BIOSECURITY_HAZARDOUS_MOTIFS:
        if motif["pattern"] in clean_seq:
            biosecurity_alerts.append(motif)
            
    if biosecurity_alerts:
        return {
            "valid": False,
            "is_approved": False,
            "status": "BIOSECURITY_FLAGGED",
            "vendor_rejection_code": "VENDOR_REJECT_DURC_SELECT_AGENT",
            "message": f"Blocked by Preclinical Biosecurity Gate: Motifs match regulated pathogen/toxin signature ({biosecurity_alerts[0]['name']})",
            "biosecurity_cleared": False,
            "alerts": biosecurity_alerts
        }

    # Complexity checks (Poly-N homopolymer tracts)
    warnings = []
    if re.search(r"A{8,}|C{8,}|G{8,}|T{8,}", clean_seq):
        warnings.append("High homopolymer tract (>=8 identical bases) detected — may reduce synthesis yield")
        
    gc_count = clean_seq.count("G") + clean_seq.count("C")
    gc_pct = round((gc_count / length) * 100.0, 1)
    if gc_pct < 25.0:
        warnings.append("Low GC content (<25%) — may cause secondary structure destabilization")
    elif gc_pct > 75.0:
        warnings.append("High GC content (>75%) — strong secondary structure risk during coupling")

    return {
        "valid": True,
        "is_approved": True,
        "status": "PASSED",
        "vendor_rejection_code": None,
        "length_nt": length,
        "gc_content": gc_pct,
        "biosecurity_cleared": True,
        "warnings": warnings,
        "vendor": vendor,
        "message": "Sequence cleared for commercial oligonucleotide synthesis"
    }


def validate_synthesis_request(request: Dict[str, Any]) -> Dict[str, Any]:
    """
    Standard interface for whole-request synthesis screening.
    Supports single sequence dicts or batched item lists.
    """
    if "sequence" in request:
        seq = request.get("sequence", "")
        vendor = request.get("vendor", "IDT")
        product_type = request.get("product_type", "oligo")
        result = validate_oligo_sequence(seq, vendor=vendor, product_type=product_type)
        return {
            "is_approved": result["is_approved"],
            "violation_reason": result["message"] if not result["is_approved"] else None,
            "vendor_rejection_code": result.get("vendor_rejection_code"),
            **result
        }
    
    # Multi-sequence request
    sequences = request.get("sequences", [])
    vendor = request.get("vendor", "IDT")
    for item in sequences:
        seq = item.get("sequence", "") if isinstance(item, dict) else str(item)
        res = validate_oligo_sequence(seq, vendor=vendor)
        if not res["is_approved"]:
            return {
                "is_approved": False,
                "violation_reason": res["message"],
                "vendor_rejection_code": res.get("vendor_rejection_code"),
                "failed_item": item,
                **res
            }
            
    return {
        "is_approved": True,
        "violation_reason": None,
        "vendor_rejection_code": None,
        "status": "PASSED",
        "biosecurity_cleared": True,
        "message": f"All {len(sequences)} sequences cleared biosecurity & physical constraints"
    }
