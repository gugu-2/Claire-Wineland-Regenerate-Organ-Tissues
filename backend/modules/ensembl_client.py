import logging
import requests
from typing import Dict, Optional
from modules.external_apis import get_cached_response, set_cached_response

logger = logging.getLogger(__name__)

ENSEMBL_REST_SERVER = "https://rest.ensembl.org"
HEADERS = {"Content-Type": "application/json"}
REQUEST_TIMEOUT = 30.0

def fetch_gene_data_ensembl(gene_symbol: str) -> Optional[Dict]:
    """
    Fetches gene coordinates, exons, and sequence from Ensembl REST API.
    Uses local database caching.
    """
    cache_key = f"ensembl_gene_{gene_symbol.upper()}"
    cached = get_cached_response("ensembl", cache_key)
    if cached:
        return cached

    try:
        # 1. Lookup gene ID and coordinates
        lookup_ext = f"/lookup/symbol/homo_sapiens/{gene_symbol}?expand=1"
        res = requests.get(ENSEMBL_REST_SERVER + lookup_ext, headers=HEADERS, timeout=REQUEST_TIMEOUT)
        
        if not res.ok:
            logger.warning(f"Ensembl lookup failed for {gene_symbol}: {res.status_code}")
            return None
            
        gene_data = res.json()
        
        chromosome = gene_data.get("seq_region_name")
        # Ensure 'chr' prefix
        if not str(chromosome).startswith("chr"):
            chromosome = f"chr{chromosome}"
            
        start = gene_data.get("start")
        end = gene_data.get("end")
        strand = gene_data.get("strand", 1)
        
        # 2. Extract exons from canonical transcript (or first transcript)
        transcripts = gene_data.get("Transcript", [])
        canonical_transcript = next((t for t in transcripts if t.get("is_canonical")), transcripts[0] if transcripts else None)
        
        exons = []
        if canonical_transcript:
            for ex in canonical_transcript.get("Exon", []):
                exons.append({
                    "id": ex.get("id"),
                    "start": ex.get("start"),
                    "end": ex.get("end")
                })
        
        # Sort exons computationally by start position
        exons.sort(key=lambda x: x["start"])

        # 3. Fetch genomic sequence
        region_str = f"{gene_data.get('seq_region_name')}:{start}..{end}:{gene_data.get('strand')}"
        seq_ext = f"/sequence/region/homo_sapiens/{region_str}"
        
        seq_res = requests.get(ENSEMBL_REST_SERVER + seq_ext, headers=HEADERS, timeout=REQUEST_TIMEOUT)
        if not seq_res.ok:
            logger.warning(f"Ensembl sequence fetch failed for {region_str}")
            return None
            
        sequence = seq_res.json().get("seq", "")

        result = {
            "gene_symbol": gene_symbol.upper(),
            "chromosome": chromosome,
            "start": start,
            "end": end,
            "strand": strand,
            "coding_genomic_start": start,  # Approximated to gene start for coordinate mapping
            "exons": exons,
            "reference_sequence": sequence,
            "source": "Ensembl REST API"
        }

        # Cache for 30 days since genomic reference rarely changes
        set_cached_response("ensembl", cache_key, result, ttl_days=30)
        return result

    except Exception as e:
        logger.error(f"Error fetching Ensembl data for {gene_symbol}: {e}")
        return None
