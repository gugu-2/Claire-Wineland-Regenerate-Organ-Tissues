# Feature Spec 09 — ClinicalTrials.gov Live Patient-Trial Matching

**Version:** 1.0  
**Priority:** 🟡 High  
**Effort Estimate:** 7 days  
**Status:** Not Started  
**Depends On:** Existing `ResearchReportView.jsx`, existing FastAPI backend

---

## 1. User-Facing Description

After the system identifies a patient's somatic mutation profile (e.g., KRAS G12D in pancreatic ductal adenocarcinoma), the researcher clicks **"Find Matching Clinical Trials"** and the system:

1. **Queries ClinicalTrials.gov API v2** in real-time with the mutation, cancer type, and gene targets
2. **Filters by patient ZIP code** — shows only trials within a configurable radius (e.g., 50 miles, 100 miles, 500 miles) using geocoding + haversine distance
3. **Displays a sortable, filterable trial table** with phase, enrollment status, sponsor, eligibility criteria snippet, and distance from patient
4. **Highlights precision oncology match score** — how well each trial's inclusion criteria match the patient's variant profile
5. **Links directly to ClinicalTrials.gov** trial detail page and NCT registration

This turns the research tool into a direct clinical decision-support layer — connecting genomic findings to actionable patient care options.

---

## 2. Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                    FRONTEND                                           │
│                                                                      │
│  ResearchReportView.jsx  (Tab 5 or new Tab 6: "Clinical Trials")     │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  ClinicalTrialsMatcher.jsx                                   │   │
│  │                                                              │   │
│  │  [Patient Context Panel]                                     │   │
│  │   • Cancer type: [Pancreatic Ductal Adenocarcinoma  ▼]      │   │
│  │   • Key mutation: [KRAS G12D] (auto-filled from analysis)    │   │
│  │   • All variants: [KRAS G12D, TP53 R175H, CDKN2A del ✓]    │   │
│  │   • Patient ZIP:  [10001        ]  Radius: [100 mi ▼]       │   │
│  │   • Age range:    [18 - 75      ]  Phase:  [All ▼]          │   │
│  │                                                              │   │
│  │  [🔍 Search Trials]                                          │   │
│  │                                                              │   │
│  │  ──────────────────────────────────────────────────────────  │   │
│  │                                                              │   │
│  │  Found 14 matching trials  (3 within 50 mi, 11 within 100mi) │   │
│  │                                                              │   │
│  │  ┌──────────────────────────────────────────────────────┐  │   │
│  │  │ NCT#     │ Title         │ Phase │ Distance │ Match  │  │   │
│  │  │ NCT04... │ KRAS G12D..   │ II    │ 23 mi    │ ●●●●○  │  │   │
│  │  │ NCT05... │ KRASG12C...   │ III   │ 67 mi    │ ●●●○○  │  │   │
│  │  │ NCT03... │ Pembroliz...  │ II    │ 150 mi   │ ●●○○○  │  │   │
│  │  └──────────────────────────────────────────────────────┘  │   │
│  │                                                              │   │
│  │  [Export as PDF]  [Copy NCT IDs]                            │   │
│  └──────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────┘
         │  POST /api/clinical-trials/search
         ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    BACKEND  (FastAPI)                                 │
│                                                                      │
│  backend/routers/clinical_trials_router.py                           │
│  backend/modules/clinical_trials_matcher.py                          │
│    ├── query_clinicaltrials_api()    ← ClinicalTrials.gov API v2     │
│    ├── geocode_zip()                 ← Nominatim/OpenCage geocoder   │
│    ├── filter_by_distance()          ← Haversine formula             │
│    ├── score_variant_match()         ← NLP keyword match score       │
│    ├── parse_eligibility_criteria()  ← Extract key inclusion rules   │
│    └── cache_results()               ← SQLite api_cache table        │
└──────────────────────────────────────────────────────────────────────┘
         │  External HTTPS calls
         ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    EXTERNAL APIs                                      │
│                                                                      │
│  ClinicalTrials.gov API v2                                           │
│    Base: https://clinicaltrials.gov/api/v2/                         │
│    GET /studies?query.term={gene}&filter.overallStatus=RECRUITING   │
│    GET /studies/{nct_id}    (full study detail)                      │
│    No auth required. Rate limit: 10 req/sec.                        │
│                                                                      │
│  Nominatim (OpenStreetMap geocoding)                                 │
│    Base: https://nominatim.openstreetmap.org/                       │
│    GET /search?postalcode={zip}&country=US&format=json              │
│    Free. Rate limit: 1 req/sec. User-Agent header required.         │
│    OR: OpenCage Geocoding API (free tier: 2500/day)                 │
│    GET https://api.opencagedata.com/geocode/v1/json?q={zip}&key=..  │
└──────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    DATA LAYER                                         │
│                                                                      │
│  SQLite table: clinical_trial_searches (search history)             │
│  SQLite table: api_cache (existing) — cache geocoding responses      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 3. Technology Stack

| Layer | Technology | Package / Version | Purpose |
|-------|-----------|-------------------|---------|
| HTTP client | httpx | `httpx>=0.27` | Async calls to ClinicalTrials.gov |
| Geocoding | geopy | `geopy>=2.4` | ZIP code → lat/lon (Nominatim adapter) |
| Distance math | Custom (stdlib math) | No package | Haversine formula implementation |
| NLP matching | rapidfuzz | `rapidfuzz>=3.6` | Fuzzy text match between eligibility criteria and variant names |
| Caching | SQLite `api_cache` | Existing table | Cache geocoding + trial responses (TTL 24h) |
| Rate limiting | asyncio.Semaphore | stdlib | Stay within 10 req/sec CT.gov limit |
| PDF export | weasyprint or fpdf2 | `fpdf2>=2.7` | Export trial list as PDF report |
| Frontend table | @tanstack/react-table | `@tanstack/react-table>=8.11` | Sortable, filterable trial table |
| Frontend map (optional Phase 2) | react-leaflet | `react-leaflet>=4.2` | Map view of trial sites |

---

## 4. ClinicalTrials.gov API v2 Query Strategy

### 4.1 Primary Query Construction

```python
def build_query(
    gene: str,            # "KRAS"
    mutation: str,        # "G12D"
    cancer_type: str,     # "pancreatic cancer"
    status: str = "RECRUITING"
) -> dict:
    """
    Combine gene + mutation + cancer type into CT.gov query.term format.
    Returns query params dict.
    """
    terms = [
        gene,
        f"{gene} {mutation}",    # "KRAS G12D"
        cancer_type
    ]
    query_string = " AND ".join(f'"{t}"' for t in terms)
    return {
        "query.term": query_string,
        "filter.overallStatus": status,
        "pageSize": 200,           # max per request
        "format": "json"
    }
```

### 4.2 Pagination Handling

```python
async def query_all_pages(params: dict) -> list[dict]:
    """
    ClinicalTrials.gov API v2 uses cursor-based pagination.
    nextPageToken in response → add as pageToken param.
    Loop until nextPageToken is absent.
    """
    all_studies = []
    page_token = None
    async with asyncio.Semaphore(5):   # max 5 concurrent requests
        while True:
            if page_token:
                params["pageToken"] = page_token
            resp = await http_client.get(CT_BASE_URL + "/studies", params=params)
            data = resp.json()
            all_studies.extend(data.get("studies", []))
            page_token = data.get("nextPageToken")
            if not page_token:
                break
    return all_studies
```

### 4.3 Location Extraction

Each CT.gov study may have multiple site locations. Extract all:

```python
def extract_trial_locations(study: dict) -> list[dict]:
    """
    From CT.gov API v2 study JSON, extract:
    protocolSection.contactsLocationsModule.locations[*]
    → {facility, city, state, zip, country, lat, lon, status}
    Note: CT.gov API v2 may include geo coordinates directly (geoPoint field).
    """
```

---

## 5. Geocoding & Distance Calculation

### 5.1 ZIP Code Geocoding

```python
from geopy.geocoders import Nominatim
from geopy.exc import GeocoderTimedOut

async def geocode_zip(zip_code: str, country: str = "US") -> dict:
    """
    Convert ZIP code to lat/lon.
    Check api_cache first (TTL: 30 days — ZIP codes rarely change).
    Returns: {zip, lat, lon, city, state}
    """
    # Check cache
    cached = db.query(ApiCache).filter_by(cache_key=f"geocode:{zip_code}").first()
    if cached and not cached.is_expired():
        return json.loads(cached.response_json)

    geolocator = Nominatim(user_agent="ClaireWineland-GenomicCopilot/1.0")
    location = geolocator.geocode({"postalcode": zip_code, "country": country})
    result = {"zip": zip_code, "lat": location.latitude, "lon": location.longitude}

    # Store in cache
    db.add(ApiCache(cache_key=f"geocode:{zip_code}", response_json=json.dumps(result), ttl_hours=720))
    return result
```

### 5.2 Haversine Distance

```python
import math

def haversine_miles(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate great-circle distance between two lat/lon points.
    Returns distance in miles.
    """
    R = 3958.8  # Earth radius in miles
    φ1, φ2 = math.radians(lat1), math.radians(lat2)
    Δφ = math.radians(lat2 - lat1)
    Δλ = math.radians(lon2 - lon1)
    a = math.sin(Δφ/2)**2 + math.cos(φ1) * math.cos(φ2) * math.sin(Δλ/2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
```

---

## 6. Variant Match Scoring

```python
def score_variant_match(
    study: dict,
    patient_variants: list[str],  # ["KRAS G12D", "TP53 R175H"]
    cancer_type: str
) -> float:
    """
    Score 0.0–1.0 how well a trial matches the patient's variant profile.

    Algorithm:
    1. Extract title + brief summary + eligibility criteria text from study JSON
    2. For each patient_variant:
       a. Exact match in text → +0.4 points
       b. Fuzzy match (rapidfuzz ratio > 80) → +0.2 points
       c. Gene name only match (no mutation) → +0.1 points
    3. Cancer type match in title → +0.2 points
    4. Normalize to 0.0–1.0
    5. Return score + matched_terms list
    """
```

---

## 7. Backend Module Design

### `backend/modules/clinical_trials_matcher.py`

```python
CT_BASE_URL = "https://clinicaltrials.gov/api/v2"

async def search_trials(
    gene: str,
    mutation: str,
    cancer_type: str,
    patient_zip: str,
    radius_miles: float = 100.0,
    age_min: int = 18,
    age_max: int = 99,
    phases: list[str] = None,    # None = all phases
    status: str = "RECRUITING"
) -> TrialSearchResult:
    """
    Main entry point. Orchestrates:
    1. build_query()
    2. query_all_pages()
    3. geocode_zip(patient_zip)
    4. For each study: extract_trial_locations()
    5. For each location: haversine_miles() → filter by radius
    6. score_variant_match() for each study
    7. Sort by (distance ASC, match_score DESC)
    Returns: TrialSearchResult with matched studies
    """

async def get_trial_detail(nct_id: str) -> dict:
    """Fetch full study detail from CT.gov for modal view."""
```

### `backend/routers/clinical_trials_router.py`

```python
@router.post("/api/clinical-trials/search")
async def search_clinical_trials(payload: TrialSearchPayload) -> TrialSearchResult:
    """Main search endpoint. Returns matched, distance-filtered, scored trials."""

@router.get("/api/clinical-trials/{nct_id}")
async def get_trial_detail(nct_id: str) -> dict:
    """Full detail for a single trial."""

@router.get("/api/clinical-trials/history")
async def get_search_history() -> list[TrialSearch]:
    """Return past searches from clinical_trial_searches table."""

@router.get("/api/clinical-trials/export/{search_id}")
async def export_trial_pdf(search_id: int) -> FileResponse:
    """Generate and download PDF report of matched trials."""
```

### Pydantic Models

```python
class TrialSearchPayload(BaseModel):
    gene: str
    mutation: str
    cancer_type: str
    patient_zip: str
    patient_variants: list[str] = []     # all variants for scoring
    radius_miles: float = 100.0
    age_min: int = 18
    age_max: int = 99
    phases: list[str] = []               # empty = all
    status: str = "RECRUITING"

class TrialMatch(BaseModel):
    nct_id: str
    title: str
    phase: str
    overall_status: str
    sponsor: str
    brief_summary: str
    eligibility_snippet: str
    nearest_site_city: str
    nearest_site_distance_miles: float
    all_sites: list[dict]
    match_score: float                   # 0.0–1.0
    matched_terms: list[str]
    url: str                             # https://clinicaltrials.gov/study/{nct_id}

class TrialSearchResult(BaseModel):
    query: TrialSearchPayload
    total_found: int
    within_radius: int
    trials: list[TrialMatch]
    search_id: int
    searched_at: str
```

---

## 8. Database Schema

```sql
CREATE TABLE clinical_trial_searches (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    gene            TEXT NOT NULL,
    mutation        TEXT,
    cancer_type     TEXT,
    patient_zip     TEXT,
    radius_miles    REAL DEFAULT 100,
    result_count    INTEGER,
    results_json    TEXT,              -- full TrialSearchResult JSON
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## 9. Frontend Component Design

### `ClinicalTrialsMatcher.jsx`

```
┌─────────────────────────────────────────────────────────────────┐
│  🏥 Clinical Trial Finder                                        │
│─────────────────────────────────────────────────────────────────│
│  [Mutation context auto-populated from CRISPR analysis]          │
│                                                                  │
│  Gene: [KRAS    ]  Mutation: [G12D  ]  Cancer: [Pancreatic ▼]  │
│                                                                  │
│  Patient ZIP: [10001  ]  Radius: [○ 50mi  ● 100mi  ○ 500mi]    │
│                                                                  │
│  Phase filter: [☑ I] [☑ II] [☑ III] [☑ IV] [☑ N/A]           │
│                                                                  │
│  [🔍 Search Trials Now]                                          │
│─────────────────────────────────────────────────────────────────│
│  ✅ 14 recruiting trials found  •  3 within 50 mi               │
│─────────────────────────────────────────────────────────────────│
│  Sort by: [Distance ▼]  [Filter: Phase II ▼]                    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ NCT04956640                               ●●●●○ 4/5 match│   │
│  │ "MRTX849 + Pembrolizumab in KRAS G12C..."               │   │
│  │ Phase II  |  📍 Memorial Sloan Kettering, NY  23 mi     │   │
│  │ Sponsor: Mirati Therapeutics                             │   │
│  │ [View Full Details]   [Open on ClinicalTrials.gov ↗]    │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ NCT05379946                               ●●●○○ 3/5 match│   │
│  │ "Sotorasib (AMG 510) in KRAS G12C NSCLC..."             │   │
│  │ Phase III |  📍 Johns Hopkins, MD  67 mi                │   │
│  │ Sponsor: Amgen                                           │   │
│  │ [View Full Details]   [Open on ClinicalTrials.gov ↗]    │   │
│  └─────────────────────────────────────────────────────────┘   │
│─────────────────────────────────────────────────────────────────│
│  [📄 Export as PDF Report]   [📋 Copy All NCT IDs]              │
└─────────────────────────────────────────────────────────────────┘
```

---

## 10. Integration Points with Existing Code

| Existing File | How It Integrates |
|---------------|-------------------|
| `frontend/src/components/ResearchReportView.jsx` | Add "Clinical Trials" as a new tab; pass `gene`, `mutation`, `cancer_type` as props from the active analysis |
| `frontend/src/components/CrisprDesignerView.jsx` | "Find Clinical Trials" button on mutation analysis results — opens `ClinicalTrialsMatcher` with pre-filled fields |
| `backend/models.py` → `api_cache` table | Cache geocoding results (30-day TTL) and trial search results (6-hour TTL) |
| `backend/main.py` | Include `clinical_trials_router` |
| `backend/modules/neoantigen_predictor.py` | After neoantigen analysis, surface trials targeting identified neoantigens (e.g., shared tumor antigens) |

---

## 11. Day-by-Day Execution Plan

| Day | Task |
|-----|------|
| 1 | Install `httpx`, `geopy`, `rapidfuzz`, `fpdf2`. Scaffold `clinical_trials_matcher.py` with stub functions. Create `clinical_trial_searches` DB table. |
| 2 | Implement `query_all_pages()` with CT.gov API v2. Test with "KRAS G12D pancreatic cancer" query manually. |
| 3 | Implement `geocode_zip()` with Nominatim + caching. Implement `haversine_miles()`. Write unit tests. |
| 4 | Implement `extract_trial_locations()`, `filter_by_distance()`, `score_variant_match()`. Test scoring logic with mock data. |
| 5 | Wire all together in `search_trials()`. Build all endpoints in `clinical_trials_router.py`. Manual end-to-end API test. |
| 6 | Build `ClinicalTrialsMatcher.jsx` — search form + results table + match score display. |
| 7 | Add "Clinical Trials" tab to `ResearchReportView.jsx`. Add "Find Clinical Trials" button to `CrisprDesignerView.jsx`. PDF export. Push. |
