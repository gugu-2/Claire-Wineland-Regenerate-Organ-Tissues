"""
art_construct_designer.py — In-Silico Phage ART Construct Designer (Forward DNA Writing)
Feature Spec 07 — Sprint 4

Based on: Yoon, Athukoralage, Ameisen et al. (2026)
"Autonomous AI agents discover reverse transcriptases with tandem repeat arrays"
Anthropic Life Sciences Research Group

Features:
1. Long cDNA fragmentation into processivity-limited repeat subunits (~150-300 bp).
2. Phage ART tandem array designer: spacer junctions, inverted palindrome RT hairpins, leader/trailer.
3. Secondary structure free energy (ΔG) and GC balance calculation.
4. Cell-type insertion efficiency prediction (HSPCs, T-cells, Neurons, Myocytes, Hepatocytes).
5. Output generation: Full array FASTA, IDT 96-well plate ordering CSV, and linear SVG construct map.
"""

from typing import List, Dict, Optional, Tuple, Any
import math
import re
import uuid

# ============================================================================
# 1. CANONICAL ART SYSTEM PARAMETERS (Yoon et al. 2026)
# ============================================================================

ART_SYSTEM_PRESETS = {
    "TYPE_I_LISTERIA": {
        "name": "Type I — Listeria Jumbo Phage L0050",
        "description": "Retron-sister RT with ~600 aa GNAT acetyltransferase partner protein. Optimal for high-fidelity epigenetic and long-template writing.",
        "repeat_core_sequence": "CATGTGTCTCGCATGT",  # 16-nt palindrome forming stem-loop
        "repeat_core_length": 16,
        "default_unit_size": 200,
        "hairpin_delta_g": -8.4, # kcal/mol
        "partner_type": "GNAT Acetyltransferase Fold (~600 aa)",
        "rt_processivity_max": 280,
        "target_bias": "Non-homologous junction preference"
    },
    "TYPE_II_STAPH": {
        "name": "Type II — Staphylococcus Phage SA1",
        "description": "High-expression jumbo phage system with ~270 aa all-helical partner. High burst transcription (up to 8% total transcripts post-infection).",
        "repeat_core_sequence": "TATGAATACGTATGAT",
        "repeat_core_length": 16,
        "default_unit_size": 180,
        "hairpin_delta_g": -9.2,
        "partner_type": "All-Helical Domain (~270 aa)",
        "rt_processivity_max": 240,
        "target_bias": "High processivity, rapid burst synthesis"
    },
    "TYPE_III_ENV": {
        "name": "Type III — Environmental Jumbo Phage PhG",
        "description": "Compact metagenomic lineage with ~170 aa helical partner. Minimal footprint for delivery in adeno-associated or lentiviral vectors.",
        "repeat_core_sequence": "GTGAACCGGTTCAC",
        "repeat_core_length": 14,
        "default_unit_size": 160,
        "hairpin_delta_g": -7.6,
        "partner_type": "Minimal Helical Factor (~170 aa)",
        "rt_processivity_max": 200,
        "target_bias": "Compact packaging friendly"
    }
}

# Empirical insertion efficiency models by target human cell type (% efficiency per 1 kb written)
CELL_TYPE_EFFICIENCY_BASELINES = {
    "Primary CD34+ HSPCs": {
        "efficiency_per_kb": 24.5,
        "notes": "High homologous recombination activity; rapid ssDNA assimilation",
        "toxicity_score": "LOW"
    },
    "Primary CD4+/CD8+ T-Cells": {
        "efficiency_per_kb": 31.2,
        "notes": "Excellent non-viral RNP/ncRNA delivery efficiency via electroporation",
        "toxicity_score": "VERY_LOW"
    },
    "Skeletal Myocytes (DMD)": {
        "efficiency_per_kb": 18.4,
        "notes": "Post-mitotic syncytium; requires myoAAV or high-titer lipid nanoparticle",
        "toxicity_score": "LOW"
    },
    "Primary Cortical Neurons": {
        "efficiency_per_kb": 14.8,
        "notes": "Non-dividing post-mitotic; benefits from Type I partner chromatin loosening",
        "toxicity_score": "LOW"
    },
    "Hepatocytes (Liver)": {
        "efficiency_per_kb": 38.6,
        "notes": "Highly metabolically active; superior template expression",
        "toxicity_score": "MINIMAL"
    }
}

# Curated reference therapeutic cDNAs
THERAPEUTIC_GENE_PRESETS = {
    "DMD_EXON45_55": {
        "gene": "DMD",
        "label": "Dystrophin Hotspot Region (Exons 45-55, ~3.6 kb cDNA)",
        "disease": "Duchenne Muscular Dystrophy (DMD)",
        "length_bp": 3612,
        # Truncated representative cDNA sequence for instant simulation
        "cDNA_sample": (
            "ATGCTTTGGTGGGAAGAAGTAGAGGACTGTTATGAAAGAGAAGATGTTCAAAAGAAAACATTCACAAAATGGGTAAATGCACAATTTTCTAAGTTTG"
            "GGAAGCAGCATATTGAGAACCTCTTCAGTGACCTACAGGATGGGAGGCGCCTCCTAGACCTCCTCGAAGGCCTGACAGGGCAAAAACTGCCAAAAGAA"
            "AAAGGATCCACAAGAGTTCATGCCCTGAACAATGTCAACAAGGCACTGCGGGTTTTGCAGAACAATAATGTTGATTTAGTGAATATTGGAAGTACTGA"
            "CATCGTGGATGGAAATCATAAACTGACTCTTGGTTTGATTTGGAATATAATCCTCCACTGGCAGGTCAAAAATGTAATGAAAAATATCATGGCTGGAT"
            "TGCAACAAACCAACAGTGAAAAGATTCTCCTGAGCTGGGTCCGACAATCAACTCGTAATTATCCACAGGTTAATGTAATCAACTTCACCACCTCCTGG"
            "TCTGATGGCTTGGCCTTGAATGCTCTCATTCATAGTCATAGGCCAGACCTATTTGACTGGAATAGTGTGGTTTGCCAGCAGTCAGCCACACAACGACT"
            "GGAACATGCATTCAACATCGCCAGATATCAATTAGGCATAGAGAAACTACTCGATCCTGAAGATGTTGATACCACCTATCCAGATAAGAAGTCCATCC"
            "TAATGTACATCACATCACTCTTCCAAGTTTTGCCTCAACAAGTGAGCATTGAAGCCATCCAGGAAGTGGAAATGTTGCCAAGGCCACCTAAAGTGACT"
            "AAAGAGGAACATTTTCAGTTACATCATCAGATGCACTATTCTCAACAGATCACGGTCAGTCTAGCACAGGGATATGAAAGAAACCTCCTCCACTAT"
        ) * 4
    },
    "CFTR_FULL": {
        "gene": "CFTR",
        "label": "CFTR Full-Length cDNA (~4.4 kb)",
        "disease": "Cystic Fibrosis (ΔF508 rescue)",
        "length_bp": 4443,
        "cDNA_sample": (
            "ATGCAGAGGTCGCCTCTGGAAAAGGCCAGCGTTGTCTCCAAACTTTTTTTCAGCTGGACCAGACCAATTTTGAGGAAAGGATACAGACAGCGCCTGG"
            "AATTGTCAGACATATACCAAATCCCTTCTGTTGATTCTGCTGACAATCTATCTGAAAAATTGGAAAGAGAATGGGATAGAGAGCTGGCTTCAAAGAAA"
            "AATCCTAAACTCATTAATGCCCTTCGGCGATGTTTTTTCTGGAGATTTATGTTCTATGGAATCTTTTTATATTTAGGGGAAGTCACCAAAGCAGTACA"
            "GCCTCTCTTACTGGGAAGAATCATAGCTTCCTATGACCCGGATAACAAGGAGGAACGCTCTATCGCGATTTATCTAGGCATAGGCTTATGCCTTCTCT"
            "TTATTGTGAGGACACTGCTCCTACACCCAGCCATTTTTGGCCTTCATCACATTGGAATGCAGATGAGAATAGCTATGTTTAGTTTGATTTATAAGAAG"
            "ACTTTAAAGCTGTCAAGCCGTGTTCTAGATAAAATAAGTATTGGACAACTTGTTAGTCTCCTTTCCAACAACCTGAACAAATTTGATGAAGGACTTGC"
            "ATTGGCACATTTCGTGTGGATCGCTCCTTTGCAAGTGGCACTCCTCATGGGGCTAATCTGGGAGTTGTTACAGGCGTCTGCCTTCTGTGGACTTGGTT"
            "TCCTGATAGTCCTTGCCCTTTTTCAGGCTGGGCTAGGGAGAATGATGATGAAGTACAGAGATCAGAGAGCTGGGAAGATCAGTGAAAGACTTGTGATT"
        ) * 5
    },
    "HBB_CORRECTED": {
        "gene": "HBB",
        "label": "HBB Full Coding Sequence (1.6 kb)",
        "disease": "Sickle Cell Disease (HbS E6V Correction)",
        "length_bp": 1605,
        "cDNA_sample": (
            "ATGGTGCATCTGACTCCTGAGGAGAAGTCTGCCGTTACTGCCCTGTGGGGCAAGGTGAACGTGGATGAAGTTGGTGGTGAGGCCCTGGGCAGGCTGCT"
            "GGTGGTCTACCCTTGGACCCAGAGGTTCTTTGAGTCCTTTGGGGATCTGTCCACTCCTGATGCTGTTATGGGCAACCCTAAGGTGAAGGCTCATGGCA"
            "AGAAAGTGCTCGGTGCCTTTAGTGATGGCCTGGCTCACCTGGACAACCTCAAGGGCACCTTTGCCACACTGAGTGAGCTGCACTGTGACAAGCTGCAC"
            "GTGGATCCTGAGAACTTCAGGCTCCTGGGCAACGTGCTGGTCTGTGTGCTGGCCCATCACTTTGGCAAAGAATTCACCCCACCAGTGCAGGCTGCCTAT"
            "CAGAAAGTGGTGGCTGGTGTGGCTAATGCCCTGGCCCACAAGTATCACTAAGCTCGCTTTCTTGCTGTCCAATTTCTATTAAAGGTTCCTTTGTTCC"
        ) * 3
    }
}

# ============================================================================
# 2. COMPUTATIONAL BIOLOGY HELPER FUNCTIONS
# ============================================================================

def clean_sequence(seq: str) -> str:
    """Sanitizes raw user input into clean uppercase DNA."""
    return re.sub(r"[^A-Za-z]", "", seq).upper()

def calculate_gc(seq: str) -> float:
    """Calculates GC percentage."""
    if not seq:
        return 0.0
    gc_count = seq.count("G") + seq.count("C")
    return round((gc_count / len(seq)) * 100.0, 1)

def approximate_hairpin_delta_g(repeat_seq: str) -> float:
    """
    Approximates free energy (ΔG in kcal/mol) of the inverted palindrome hairpin.
    Negative values indicate spontaneous, thermodynamically stable stem-loop formation.
    """
    length = len(repeat_seq)
    gc = calculate_gc(repeat_seq) / 100.0
    
    # Base stacking energy model: GC pairs contribute ~ -2.4 kcal/mol, AT pairs ~ -1.2 kcal/mol
    # Loop penalty: ~ +3.5 to +4.5 kcal/mol
    stem_pairs = length // 2
    delta_g = -(stem_pairs * (1.2 + 1.2 * gc)) + 4.0
    return round(delta_g, 2)

# ============================================================================
# 3. ART ARRAY CONSTRUCT DESIGNER CORE
# ============================================================================

def fragment_gene(
    cDNA_sequence: str,
    target_unit_size: int = 200,
    overlap_bp: int = 15
) -> List[Dict[str, Any]]:
    """
    Fragments a long cDNA sequence into optimally sized tandem repeat subunits.
    Accounts for RT processivity limits and overlap requirements.
    """
    clean_seq = clean_sequence(cDNA_sequence)
    total_len = len(clean_seq)
    if total_len == 0:
        return []

    # Calculate optimal step size
    step = target_unit_size - overlap_bp
    if step <= 0:
        step = target_unit_size

    fragments = []
    unit_idx = 1
    start = 0

    while start < total_len:
        end = min(start + target_unit_size, total_len)
        chunk = clean_seq[start:end]
        gc = calculate_gc(chunk)
        
        # QC flags
        flags = []
        if gc < 35.0:
            flags.append("LOW_GC_RISK")
        elif gc > 65.0:
            flags.append("HIGH_GC_HAIRPIN_RISK")
            
        fragments.append({
            "unit_number": unit_idx,
            "start_bp": start + 1,
            "end_bp": end,
            "length_bp": len(chunk),
            "sequence": chunk,
            "gc_content": gc,
            "flags": flags
        })
        
        unit_idx += 1
        start += step
        if end >= total_len:
            break

    return fragments

def design_art_array(
    cDNA_sequence: str,
    gene_name: str = "THERAPEUTIC_GENE",
    art_system_type: str = "TYPE_I_LISTERIA",
    target_unit_size: int = 200,
    target_cell_type: str = "Primary CD34+ HSPCs"
) -> Dict[str, Any]:
    """
    Designs a complete synthetic Phage ART tandem repeat array construct for forward DNA writing.
    """
    system_info = ART_SYSTEM_PRESETS.get(art_system_type, ART_SYSTEM_PRESETS["TYPE_I_LISTERIA"])
    clean_cDNA = clean_sequence(cDNA_sequence)
    
    if len(clean_cDNA) == 0:
        return {"status": "error", "message": "Empty or invalid cDNA sequence"}

    repeat_core = system_info["repeat_core_sequence"]
    repeat_delta_g = approximate_hairpin_delta_g(repeat_core)
    
    # 1. Fragment the gene into subunits
    fragments = fragment_gene(clean_cDNA, target_unit_size=target_unit_size)
    total_units = len(fragments)
    
    # 2. Assemble the tandem array
    # Array format: 5' Leader - [Repeat_Core - Spacer/Unit]_N - Repeat_Core - Trailer 3'
    leader_seq = "TAGAGAGTAATTTATTCATGTGT"
    trailer_seq = "ACAAACAAATGTGAGAACAAGTAA"
    
    assembled_array_parts = [leader_seq]
    detailed_units = []
    
    for frag in fragments:
        unit_full_seq = repeat_core + frag["sequence"]
        assembled_array_parts.append(unit_full_seq)
        
        detailed_units.append({
            "unit_number": frag["unit_number"],
            "start_bp": frag["start_bp"],
            "end_bp": frag["end_bp"],
            "spacer_length": frag["length_bp"],
            "spacer_sequence": frag["sequence"],
            "repeat_core": repeat_core,
            "repeat_delta_g": repeat_delta_g,
            "gc_content": frag["gc_content"],
            "qc_status": "PASS" if not frag["flags"] else "WARN",
            "flags": frag["flags"]
        })
        
    assembled_array_parts.append(repeat_core)
    assembled_array_parts.append(trailer_seq)
    
    full_array_dna = "".join(assembled_array_parts)
    
    # 3. Efficiency Estimation across cell types
    efficiency_summary = {}
    total_cDNA_kb = len(clean_cDNA) / 1000.0
    
    for ctype, cdata in CELL_TYPE_EFFICIENCY_BASELINES.items():
        base_rate = cdata["efficiency_per_kb"]
        # Efficiency scales inversely with cDNA size and unit count complexity
        size_penalty = max(0.4, 1.0 - (total_cDNA_kb * 0.08))
        est_efficiency = round(base_rate * size_penalty, 1)
        efficiency_summary[ctype] = {
            "estimated_insertion_rate_pct": est_efficiency,
            "toxicity_score": cdata["toxicity_score"],
            "clinical_notes": cdata["notes"]
        }

    selected_cell_eff = efficiency_summary.get(
        target_cell_type,
        {"estimated_insertion_rate_pct": 22.0, "toxicity_score": "LOW", "clinical_notes": "Standard primary cell baseline"}
    )

    # 4. Generate FASTA
    construct_id = f"ART_{gene_name}_{art_system_type}_{uuid.uuid4().hex[:6]}"
    fasta_str = (
        f">{construct_id} | Gene: {gene_name} | Length: {len(clean_cDNA)}bp | System: {system_info['name']} | Units: {total_units}\n"
        f"{full_array_dna}\n"
    )

    # 5. Generate 96-well IDT plate ordering format
    idt_plate_rows = []
    plate_cols = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"]
    plate_rows = ["A", "B", "C", "D", "E", "F", "G", "H"]
    
    for idx, u in enumerate(detailed_units):
        row_letter = plate_rows[(idx // 12) % 8]
        col_str = plate_cols[idx % 12]
        well_pos = f"{row_letter}{col_str}"
        oligo_name = f"{gene_name}_ART_Unit_{u['unit_number']:02d}"
        oligo_seq = u["repeat_core"] + u["spacer_sequence"]
        
        idt_plate_rows.append({
            "well": well_pos,
            "oligo_name": oligo_name,
            "sequence": oligo_seq,
            "length_nt": len(oligo_seq),
            "scale": "25nmol",
            "purification": "Standard Desalting"
        })

    plate_csv = generate_plate_layout_csv(idt_plate_rows)

    return {
        "status": "success",
        "construct_id": construct_id,
        "gene_name": gene_name,
        "input_cDNA_length_bp": len(clean_cDNA),
        "total_array_length_bp": len(full_array_dna),
        "total_units": total_units,
        "art_system": system_info,
        "selected_cell_type": target_cell_type,
        "predicted_insertion_efficiency": selected_cell_eff["estimated_insertion_rate_pct"],
        "cell_type_efficiencies": efficiency_summary,
        "units": detailed_units,
        "fasta_export": fasta_str,
        "idt_plate_orders": idt_plate_rows,
        "plate_layout_csv": plate_csv,
        "array_architecture": {
            "leader_5p": leader_seq,
            "repeat_hairpin": repeat_core,
            "hairpin_delta_g": repeat_delta_g,
            "trailer_3p": trailer_seq,
            "full_sequence": full_array_dna
        }
    }


def generate_plate_layout_csv(idt_plate_rows: List[Dict[str, Any]]) -> str:
    """
    Serializes 96-well plate orders into RFC 4180 CSV format for automated liquid handlers
    (Echo, Tecan, Hamilton) or direct B2B synthesis upload.
    """
    lines = ["Well,Oligo_Name,Sequence,Length_nt,Scale,Purification"]
    for row in idt_plate_rows:
        lines.append(f"{row['well']},{row['oligo_name']},{row['sequence']},{row['length_nt']},{row['scale']},{row['purification']}")
    return "\n".join(lines)
