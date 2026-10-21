"""
Structure Fetcher Module for Precision Oncology OS
Feature Spec 01: Atomistic WebGL 3D Molecular Viewer

Manages fetching, caching, and annotating macromolecular crystal structures
(PDB / mmCIF) from RCSB PDB for Cas9, Cas12a, SaCas9, and Base Editors.
"""

import json
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional
import requests

from core.database import SessionLocal
from core.models import ApiCacheModel

logger = logging.getLogger(__name__)

# Pre-curated metadata for key CRISPR & editing complexes
STRUCTURE_METADATA: Dict[str, Dict[str, Any]] = {
    "4ZT0": {
        "pdb_id": "4ZT0",
        "title": "Crystal structure of Streptococcus pyogenes Cas9 in complex with sgRNA and target DNA",
        "short_name": "SpCas9 Complex (Wildtype)",
        "resolution_angstrom": 2.5,
        "method": "X-RAY DIFFRACTION",
        "organism": "Streptococcus pyogenes",
        "deposition_date": "2015-08-26",
        "chains": {
            "A": "SpCas9 Protein (1368 aa)",
            "B": "sgRNA Single Guide RNA",
            "C": "Target DNA Strand (Protospacer)",
            "D": "Non-Target DNA Strand"
        },
        "catalytic_residues": [
            {
                "chain": "A",
                "residue_number": 840,
                "residue_name": "HIS",
                "domain": "HNH",
                "role": "Target strand cleavage nucleophile",
                "color": "#ef4444"
            },
            {
                "chain": "A",
                "residue_number": 10,
                "residue_name": "ASP",
                "domain": "RuvC",
                "role": "Non-target strand cleavage active site",
                "color": "#dc2626"
            },
            {
                "chain": "A",
                "residue_number": 863,
                "residue_name": "ASN",
                "domain": "HNH",
                "role": "Divalent metal ion coordinator",
                "color": "#f87171"
            }
        ],
        "pam_residues": [
            {
                "chain": "A",
                "residue_number": 1333,
                "residue_name": "ARG",
                "role": "Major groove NGG PAM dG2 bidentate H-bonding",
                "color": "#10b981"
            },
            {
                "chain": "A",
                "residue_number": 1335,
                "residue_name": "ARG",
                "role": "Major groove NGG PAM dG3 bidentate H-bonding",
                "color": "#059669"
            }
        ],
        "guide_chain": "B",
        "target_dna_chain": "C",
        "non_target_dna_chain": "D",
        "pam_motif": "NGG"
    },
    "6O0Y": {
        "pdb_id": "6O0Y",
        "title": "Crystal structure of Acidaminococcus sp. Cas12a (Cpf1) bound to crRNA and target DNA",
        "short_name": "AsCas12a Complex (Staggered Cut)",
        "resolution_angstrom": 2.7,
        "method": "X-RAY DIFFRACTION",
        "organism": "Acidaminococcus sp. BV3L6",
        "deposition_date": "2019-02-14",
        "chains": {
            "A": "AsCas12a Nuclease",
            "B": "crRNA Guide",
            "C": "Target DNA Strand",
            "D": "Non-Target DNA Strand"
        },
        "catalytic_residues": [
            {
                "chain": "A",
                "residue_number": 925,
                "residue_name": "GLU",
                "domain": "RuvC",
                "role": "Catalytic nucleophile (staggered 5'-overhang cut)",
                "color": "#ef4444"
            },
            {
                "chain": "A",
                "residue_number": 908,
                "residue_name": "ASP",
                "domain": "RuvC",
                "role": "Divalent Mg2+ cofactor coordination",
                "color": "#dc2626"
            }
        ],
        "pam_residues": [
            {
                "chain": "A",
                "residue_number": 603,
                "residue_name": "LYS",
                "role": "TTTV PAM 5'-end recognition pocket",
                "color": "#10b981"
            }
        ],
        "guide_chain": "B",
        "target_dna_chain": "C",
        "non_target_dna_chain": "D",
        "pam_motif": "TTTV"
    },
    "6MCB": {
        "pdb_id": "6MCB",
        "title": "Crystal structure of Staphylococcus aureus Cas9 (SaCas9) with sgRNA and DNA target",
        "short_name": "SaCas9 Compact Complex (AAV Delivery)",
        "resolution_angstrom": 2.6,
        "method": "X-RAY DIFFRACTION",
        "organism": "Staphylococcus aureus",
        "deposition_date": "2018-09-20",
        "chains": {
            "A": "SaCas9 Protein (1053 aa)",
            "B": "sgRNA",
            "C": "Target DNA",
            "D": "Non-Target DNA"
        },
        "catalytic_residues": [
            {
                "chain": "A",
                "residue_number": 580,
                "residue_name": "HIS",
                "domain": "HNH",
                "role": "Target strand cleavage",
                "color": "#ef4444"
            },
            {
                "chain": "A",
                "residue_number": 10,
                "residue_name": "ASP",
                "domain": "RuvC",
                "role": "Non-target strand cleavage",
                "color": "#dc2626"
            }
        ],
        "pam_residues": [
            {
                "chain": "A",
                "residue_number": 1015,
                "residue_name": "ARG",
                "role": "NNGRRT PAM recognition lobe",
                "color": "#10b981"
            }
        ],
        "guide_chain": "B",
        "target_dna_chain": "C",
        "non_target_dna_chain": "D",
        "pam_motif": "NNGRRT"
    },
    "7T2E": {
        "pdb_id": "7T2E",
        "title": "Cryo-EM structure of SpCas9-Cytidine Base Editor (CBE) bound to target DNA",
        "short_name": "Cytidine Base Editor (SpCas9-rAPOBEC1)",
        "resolution_angstrom": 3.1,
        "method": "ELECTRON MICROSCOPY",
        "organism": "Engineered Complex",
        "deposition_date": "2021-12-08",
        "chains": {
            "A": "SpCas9 Nickase (D10A)",
            "B": "rAPOBEC1 Deaminase Domain",
            "C": "sgRNA",
            "D": "Target DNA"
        },
        "catalytic_residues": [
            {
                "chain": "B",
                "residue_number": 56,
                "residue_name": "GLU",
                "domain": "Deaminase Active Site",
                "role": "Target C-to-U deamination catalytic proton donor",
                "color": "#f59e0b"
            }
        ],
        "pam_residues": [
            {
                "chain": "A",
                "residue_number": 1333,
                "residue_name": "ARG",
                "role": "NGG PAM contact",
                "color": "#10b981"
            }
        ],
        "guide_chain": "C",
        "target_dna_chain": "D",
        "non_target_dna_chain": "",
        "pam_motif": "NGG"
    }
}

# Fallback minimal mmCIF format in case RCSB is unreachable offline
MINIMAL_OFFLINE_CIF = """data_4ZT0
# 
_entry.id   4ZT0 
# 
_audit_conform.dict_name       mmcif_pdbx.dic 
_audit_conform.dict_version    5.279 
# 
loop_
_atom_site.group_PDB 
_atom_site.id 
_atom_site.type_symbol 
_atom_site.label_atom_id 
_atom_site.label_alt_id 
_atom_site.label_comp_id 
_atom_site.label_asym_id 
_atom_site.label_entity_id 
_atom_site.label_seq_id 
_atom_site.pdbx_PDB_ins_code 
_atom_site.Cartn_x 
_atom_site.Cartn_y 
_atom_site.Cartn_z 
_atom_site.occupancy 
_atom_site.B_iso_or_equiv 
_atom_site.auth_seq_id 
_atom_site.auth_comp_id 
_atom_site.auth_asym_id 
_atom_site.auth_atom_id 
_atom_site.pdbx_PDB_model_num 
ATOM 1 N N . ASP A 1 10 ? 12.340 45.670 78.910 1.00 32.10 10 ASP A N 1
ATOM 2 C CA . ASP A 1 10 ? 13.560 46.210 79.450 1.00 31.80 10 ASP A CA 1
ATOM 3 C C . ASP A 1 10 ? 14.120 45.430 80.620 1.00 30.50 10 ASP A C 1
ATOM 4 O O . ASP A 1 10 ? 13.890 44.220 80.850 1.00 30.20 10 ASP A O 1
ATOM 5 N N . HIS A 1 840 ? 25.120 32.450 41.230 1.00 28.50 840 HIS A N 1
ATOM 6 C CA . HIS A 1 840 ? 26.340 33.100 41.800 1.00 27.90 840 HIS A CA 1
ATOM 7 N N . ARG A 1 1333 ? 35.600 50.120 62.400 1.00 34.00 1333 ARG A N 1
ATOM 8 N N . ARG A 1 1335 ? 38.100 52.800 64.900 1.00 36.20 1335 ARG A N 1
#
"""

def fetch_pdb_structure(pdb_id: str) -> Dict[str, Any]:
    """
    Retrieves the structure file (.cif) for a given PDB ID.
    Checks SQLite api_cache first. If absent, fetches from RCSB PDB CDN
    and caches locally for 7 days.
    """
    pdb_id = pdb_id.upper().strip()
    cache_key = f"pdb_cif_{pdb_id}"
    
    metadata = STRUCTURE_METADATA.get(pdb_id, {
        "pdb_id": pdb_id,
        "title": f"Crystal/Cryo-EM Structure of PDB {pdb_id}",
        "short_name": f"PDB {pdb_id}",
        "resolution_angstrom": None,
        "method": "EXPERIMENTAL",
        "organism": "Unknown",
        "deposition_date": "N/A",
        "chains": {},
        "catalytic_residues": [],
        "pam_residues": [],
        "guide_chain": "B",
        "target_dna_chain": "C",
        "non_target_dna_chain": "D",
        "pam_motif": "N/A"
    })
    
    # Check database cache
    db = SessionLocal()
    try:
        cached = db.query(ApiCacheModel).filter(
            ApiCacheModel.endpoint == "rcsb_cif",
            ApiCacheModel.query_key == cache_key
        ).first()
        
        now = datetime.now(timezone.utc)
        if cached and cached.expires_at and cached.expires_at > now and cached.response_json:
            logger.info(f"Loaded structure {pdb_id} from local SQLite cache")
            return {
                "pdb_id": pdb_id,
                "cif_data": cached.response_json,
                "metadata": metadata,
                "source": "cache",
                "cached": True
            }
    except Exception as e:
        logger.warning(f"Error querying structure cache: {e}")
    finally:
        db.close()
        
    # Fetch from RCSB PDB CDN
    rcsb_url = f"https://files.rcsb.org/download/{pdb_id}.cif"
    cif_text = None
    try:
        logger.info(f"Fetching structure {pdb_id} from RCSB PDB ({rcsb_url})")
        resp = requests.get(rcsb_url, timeout=12)
        if resp.status_code == 200 and len(resp.text) > 100:
            cif_text = resp.text
        else:
            logger.warning(f"RCSB PDB returned status {resp.status_code} for {pdb_id}")
    except Exception as e:
        logger.error(f"Failed to fetch {pdb_id} from RCSB PDB: {e}")

    # Fallback if offline/failed; only cache genuine RCSB fetched data to prevent cache poisoning
    if cif_text:
        try:
            db = SessionLocal()
            db.query(ApiCacheModel).filter(
                ApiCacheModel.endpoint == "rcsb_cif",
                ApiCacheModel.query_key == cache_key
            ).delete()
            
            expires_at = datetime.now(timezone.utc) + timedelta(days=7)
            new_cache = ApiCacheModel(
                endpoint="rcsb_cif",
                query_key=cache_key,
                response_json=cif_text,
                expires_at=expires_at
            )
            db.add(new_cache)
            db.commit()
        except Exception as e:
            logger.warning(f"Could not write structure {pdb_id} to api_cache: {e}")
        finally:
            db.close()
    else:
        logger.info(f"Using offline structural data for {pdb_id}")
        cif_text = MINIMAL_OFFLINE_CIF

    return {
        "pdb_id": pdb_id,
        "cif_data": cif_text,
        "metadata": metadata,
        "source": "rcsb" if cif_text != MINIMAL_OFFLINE_CIF else "offline_fallback",
        "cached": False
    }

def get_structure_annotations(
    pdb_id: str,
    guide_seq: Optional[str] = None,
    mutation_label: Optional[str] = None,
    mutation_pos: Optional[int] = None
) -> Dict[str, Any]:
    """
    Returns atomistic annotations for highlighting in the 3D Mol* canvas:
    - Active catalytic residues
    - PAM interaction amino acids
    - sgRNA guide chain coordinates
    - Target DNA strand coordinates
    - Patient mutation position & distance calculations
    """
    pdb_id = pdb_id.upper().strip()
    meta = STRUCTURE_METADATA.get(pdb_id, STRUCTURE_METADATA["4ZT0"])
    
    target_chain = meta.get("target_dna_chain", "C")
    guide_chain = meta.get("guide_chain", "B")
    
    # Calculate patient mutation annotation
    mutation_annotation = None
    if mutation_label or mutation_pos is not None:
        pos = mutation_pos if mutation_pos is not None else 12
        mutation_annotation = {
            "chain": target_chain,
            "residue_number": pos,
            "label": mutation_label or "Patient Mutation",
            "color": "#f59e0b",  # Amber
            "description": f"Somatic mutation {mutation_label or ''} situated on target DNA strand (chain {target_chain})"
        }

    # Guide annotation
    guide_annotation = {
        "chain": guide_chain,
        "sequence": guide_seq or "GATAGTCATCTTGGGGCTGG",
        "color": "#38bdf8",  # Sky blue
        "description": "Engineered single-guide RNA bound in Cas9 central channel"
    }

    return {
        "pdb_id": pdb_id,
        "metadata": meta,
        "catalytic_residues": meta.get("catalytic_residues", []),
        "pam_residues": meta.get("pam_residues", []),
        "guide_annotation": guide_annotation,
        "mutation_annotation": mutation_annotation,
        "chains": meta.get("chains", {}),
        "pam_motif": meta.get("pam_motif", "NGG")
    }

def list_supported_structures() -> list[Dict[str, Any]]:
    """Returns list of curated structures available for instant selection."""
    return [
        {
            "pdb_id": p_id,
            "short_name": data["short_name"],
            "title": data["title"],
            "resolution": f"{data['resolution_angstrom']} Å" if data['resolution_angstrom'] else "Cryo-EM",
            "organism": data["organism"],
            "pam_motif": data["pam_motif"]
        }
        for p_id, data in STRUCTURE_METADATA.items()
    ]
