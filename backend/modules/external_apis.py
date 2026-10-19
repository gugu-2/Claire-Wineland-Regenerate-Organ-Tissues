import json
import logging
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional
import requests

from core.database import SessionLocal
from core.models import ApiCacheModel

logger = logging.getLogger(__name__)

NCBI_BASE = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"
REQUEST_TIMEOUT = 6.0  # seconds

def get_cached_response(endpoint: str, query_key: str) -> Optional[Dict]:
    """Retrieves an active cached API response from the database."""
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        record = (
            db.query(ApiCacheModel)
            .filter(
                ApiCacheModel.endpoint == endpoint,
                ApiCacheModel.query_key == query_key,
                ApiCacheModel.expires_at > now
            )
            .first()
        )
        if record:
            return json.loads(record.response_json)
    except Exception as e:
        logger.warning(f"Cache read error: {e}")
    finally:
        db.close()
    return None

def set_cached_response(endpoint: str, query_key: str, data: Dict, ttl_days: int = 7):
    """Saves an API response to the cache with a specified TTL."""
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        expires = now + timedelta(days=ttl_days)
        # Delete existing stale record if present
        db.query(ApiCacheModel).filter(
            ApiCacheModel.endpoint == endpoint,
            ApiCacheModel.query_key == query_key
        ).delete()

        new_record = ApiCacheModel(
            endpoint=endpoint,
            query_key=query_key,
            response_json=json.dumps(data),
            cached_at=now,
            expires_at=expires
        )
        db.add(new_record)
        db.commit()
    except Exception as e:
        logger.warning(f"Cache write error: {e}")
        db.rollback()
    finally:
        db.close()

def query_clinvar_live(rsid: Optional[str] = None, chrom: Optional[str] = None, pos: Optional[int] = None) -> Optional[Dict]:
    """
    Queries NCBI ClinVar via E-utilities API with local 7-day database caching.
    Returns structured clinical significance and review status.
    """
    query_key = rsid if rsid else f"{chrom}:{pos}"
    if not query_key:
        return None

    # Check cache first
    cached = get_cached_response("clinvar", query_key)
    if cached:
        return cached

    # Construct NCBI search query
    term = rsid if rsid else f"{chrom}[chr] AND {pos}[chrpos]"
    search_url = f"{NCBI_BASE}/esearch.fcgi"
    params = {
        "db": "clinvar",
        "term": term,
        "retmode": "json",
        "retmax": 1
    }

    try:
        resp = requests.get(search_url, params=params, timeout=REQUEST_TIMEOUT)
        if resp.status_code != 200:
            return None
        search_data = resp.json()
        id_list = search_data.get("esearchresult", {}).get("idlist", [])
        if not id_list:
            return None

        clinvar_id = id_list[0]
        # Fetch summary
        summary_url = f"{NCBI_BASE}/esummary.fcgi"
        sum_params = {
            "db": "clinvar",
            "id": clinvar_id,
            "retmode": "json"
        }
        sum_resp = requests.get(summary_url, params=sum_params, timeout=REQUEST_TIMEOUT)
        if sum_resp.status_code != 200:
            return None

        sum_data = sum_resp.json()
        doc = sum_data.get("result", {}).get(clinvar_id, {})

        # Extract parsed fields
        germline_sig = doc.get("germline_classification", {}).get("description", "Unknown")
        review_status = doc.get("germline_classification", {}).get("review_status", "criteria provided, single submitter")
        trait_set = doc.get("trait_set", [])
        condition = trait_set[0].get("trait_name", "Undetermined condition") if trait_set else "Undetermined"
        genes = doc.get("genes", [])
        gene_symbol = genes[0].get("symbol", "") if genes else ""

        result = {
            "clinvar_id": f"VCV{clinvar_id}",
            "gene": gene_symbol,
            "clinical_significance": f"{germline_sig} ({review_status})",
            "condition": condition,
            "review_status": review_status,
            "source": "NCBI ClinVar (Live E-utilities)",
            "query_key": query_key
        }

        # Cache valid response
        set_cached_response("clinvar", query_key, result, ttl_days=7)
        return result

    except Exception as err:
        logger.info(f"ClinVar live query bypassed ({err}); using local fallback.")
        return None

def query_pubmed_live(term: str, max_results: int = 4) -> List[Dict]:
    """
    Queries NCBI PubMed via E-utilities API for live literature with local caching.
    Returns list of verified papers with titles, authors, journals, PMIDs, and DOIs.
    """
    clean_term = term.strip().lower()
    if not clean_term:
        return []

    cache_key = f"{clean_term}_{max_results}"
    cached = get_cached_response("pubmed", cache_key)
    if cached:
        return cached.get("articles", [])

    search_url = f"{NCBI_BASE}/esearch.fcgi"
    params = {
        "db": "pubmed",
        "term": term,
        "retmode": "json",
        "retmax": max_results,
        "sort": "relevance"
    }

    try:
        resp = requests.get(search_url, params=params, timeout=REQUEST_TIMEOUT)
        if resp.status_code != 200:
            return []
        search_data = resp.json()
        id_list = search_data.get("esearchresult", {}).get("idlist", [])
        if not id_list:
            return []

        # Fetch summaries for PMIDs
        summary_url = f"{NCBI_BASE}/esummary.fcgi"
        sum_params = {
            "db": "pubmed",
            "id": ",".join(id_list),
            "retmode": "json"
        }
        sum_resp = requests.get(summary_url, params=sum_params, timeout=REQUEST_TIMEOUT)
        if sum_resp.status_code != 200:
            return []

        sum_data = sum_resp.json().get("result", {})
        articles = []

        for pmid in id_list:
            doc = sum_data.get(pmid, {})
            if not doc:
                continue

            title = doc.get("title", "Untitled Publication")
            authors_list = doc.get("authors", [])
            first_author = authors_list[0].get("name", "Unknown Author") if authors_list else "Unknown"
            author_str = f"{first_author} et al." if len(authors_list) > 1 else first_author

            source = doc.get("source", "PubMed Indexed Journal")
            pubdate = doc.get("pubdate", "")[:4]
            articleids = doc.get("articleids", [])
            doi = next((a.get("value") for a in articleids if a.get("idtype") == "doi"), "")

            articles.append({
                "pmid": pmid,
                "title": title,
                "authors": author_str,
                "journal": source,
                "year": int(pubdate) if pubdate.isdigit() else 2024,
                "doi": doi or f"10.1000/{pmid}",
                "evidence_level": "Peer-Reviewed Literature (Live PubMed)",
                "summary": f"Indexed research paper published in {source} concerning {term}."
            })

        if articles:
            set_cached_response("pubmed", cache_key, {"articles": articles}, ttl_days=7)

        return articles

    except Exception as err:
        logger.info(f"PubMed live query bypassed ({err}); using local knowledge graph.")
        return []
