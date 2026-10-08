from typing import Dict, List, Optional
from modules.azimuth_cfd import reverse_complement, calculate_gc_content

PLASMID_PROFILES = {
    "PX459_BbsI": {
        "name": "pSpCas9(BB)-2A-Puro (PX459) / PX458",
        "cloning_enzyme": "BbsI (BpiI)",
        "vector_type": "Transient Mammalian Expression Plasmid",
        "description": "Standard Zhang lab all-in-one Cas9 + sgRNA cloning plasmid with Puromycin selection.",
        "top_prefix": "CACC",
        "bottom_prefix": "AAAC",
        "addgene_id": "62988"
    },
    "lentiCRISPRv2_BsmBI": {
        "name": "lentiCRISPR v2 (GeCKO v2)",
        "cloning_enzyme": "BsmBI (Esp3I)",
        "vector_type": "Lentiviral Transfer Vector",
        "description": "High-titer third-generation lentiviral vector for stable genomic knockout.",
        "top_prefix": "CACC",
        "bottom_prefix": "AAAC",
        "addgene_id": "52961"
    },
    "pX330_BbsI": {
        "name": "pX330-U6-Chimeric_BB-CBh-hSpCas9",
        "cloning_enzyme": "BbsI",
        "vector_type": "Transient Dual-Expression Plasmid",
        "description": "Minimal non-selection Cas9 vector for microinjection or transient transfection.",
        "top_prefix": "CACC",
        "bottom_prefix": "AAAC",
        "addgene_id": "42230"
    }
}

# Standard 80-nt chimeric sgRNA constant tracrRNA scaffold sequence
SGRNA_SCAFFOLD = "GTTTTAGAGCTAGAAATAGCAAGTTAAAATAAGGCTAGTCCGTTATCAACTTGAAAAAGTGGCACCGAGTCGGTGCTTTT"

def calculate_oligo_tm(seq: str) -> float:
    """Calculates approximate melting temperature (Tm) using nearest-neighbor/basic formula."""
    seq_u = seq.upper()
    g_c = seq_u.count("G") + seq_u.count("C")
    a_t = seq_u.count("A") + seq_u.count("T")
    if len(seq_u) < 14:
        tm = (a_t * 2) + (g_c * 4)
    else:
        tm = 64.9 + 41 * (g_c - 16.4) / len(seq_u)
    return round(tm, 1)

def generate_cloning_oligos(guide_seq_20nt: str, plasmid_type: str = "PX459_BbsI", guide_id: str = "sgRNA_01") -> Dict:
    """
    Generates forward (top) and reverse (bottom) cloning oligonucleotides with Golden Gate
    overhangs compatible with designated Cas9 cloning vectors, plus modified Alt-R synthetic sgRNA.
    """
    profile = PLASMID_PROFILES.get(plasmid_type, PLASMID_PROFILES["PX459_BbsI"])
    g = guide_seq_20nt.upper().strip()
    if len(g) != 20:
        g = g[:20].ljust(20, "N")

    # U6 promoter preference: U6 initiates transcription with Guanine.
    # If the protospacer does not start with G, add an extra 5' G to the top strand.
    has_leading_g = g.startswith("G")
    prepended_g = not has_leading_g

    if prepended_g:
        top_insert = "G" + g
        bottom_insert = reverse_complement(g) + "C"
    else:
        top_insert = g
        bottom_insert = reverse_complement(g)

    top_oligo = profile["top_prefix"] + top_insert
    bottom_oligo = profile["bottom_prefix"] + reverse_complement(top_insert)

    # Synthetic Modified sgRNA (IDT Alt-R / Synthego standard format)
    # Includes 2'-O-methyl and 3'-phosphorothioate linkages on terminal 3 bases (represented as mN*)
    full_sgRNA_seq = g + SGRNA_SCAFFOLD
    modified_notation = (
        f"m{g[0]}*m{g[1]}*m{g[2]}*" + g[3:] + SGRNA_SCAFFOLD[:-3] +
        f"*m{SGRNA_SCAFFOLD[-3]}*m{SGRNA_SCAFFOLD[-2]}*m{SGRNA_SCAFFOLD[-1]}"
    )

    # Generate CSV ordering format (compatible with IDT Bulk Input & GenScript)
    csv_rows = [
        "Sequence Name,Sequence,Purification,Scale",
        f"{guide_id}_Top,{top_oligo},Standard Desalt,25nm",
        f"{guide_id}_Bottom,{bottom_oligo},Standard Desalt,25nm",
        f"{guide_id}_Synthetic_sgRNA,{full_sgRNA_seq},PAGE,2nm"
    ]
    idt_csv_content = "\n".join(csv_rows)

    return {
        "guide_id": guide_id,
        "protospacer": g,
        "plasmid_type": plasmid_type,
        "plasmid_name": profile["name"],
        "cloning_enzyme": profile["cloning_enzyme"],
        "addgene_id": profile["addgene_id"],
        "prepended_leading_g": prepended_g,
        "top_oligo": {
            "name": f"{guide_id}_Top",
            "sequence": top_oligo,
            "length_nt": len(top_oligo),
            "gc_content_pct": calculate_gc_content(top_oligo),
            "tm_celsius": calculate_oligo_tm(top_oligo),
            "overhang": profile["top_prefix"],
            "insert": top_insert
        },
        "bottom_oligo": {
            "name": f"{guide_id}_Bottom",
            "sequence": bottom_oligo,
            "length_nt": len(bottom_oligo),
            "gc_content_pct": calculate_gc_content(bottom_oligo),
            "tm_celsius": calculate_oligo_tm(bottom_oligo),
            "overhang": profile["bottom_prefix"],
            "insert": reverse_complement(top_insert)
        },
        "synthetic_modified_sgRNA": {
            "name": f"{guide_id}_AltR_sgRNA",
            "full_sequence": full_sgRNA_seq,
            "total_length_nt": len(full_sgRNA_seq),
            "chemically_modified_notation": modified_notation,
            "modifications": "2'-O-methyl 3'-phosphorothioate on terminal 3 bases (prevents intracellular exonuclease degradation)"
        },
        "idt_order_csv": idt_csv_content
    }
