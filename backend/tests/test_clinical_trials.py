import pytest
from modules.clinical_trials_matcher import (
    haversine_miles,
    geocode_zip,
    score_variant_match,
    search_clinical_trials,
    get_trial_detail_by_nct,
    generate_trials_export_csv,
    CURATED_BENCHMARK_TRIALS
)

def test_haversine_distance():
    # NYC to Boston: ~190 miles
    nyc_lat, nyc_lon = 40.7128, -74.0060
    bos_lat, bos_lon = 42.3601, -71.0589
    dist = haversine_miles(nyc_lat, nyc_lon, bos_lat, bos_lon)
    assert 180.0 <= dist <= 210.0

def test_geocode_zip():
    # Test known centroid (Stanford, CA)
    geo = geocode_zip("94305")
    assert geo["zip"] == "94305"
    assert "lat" in geo and "lon" in geo
    assert geo["state"] == "CA"

    # Test unknown ZIP fallback
    fallback_geo = geocode_zip("99999")
    assert "lat" in fallback_geo and "lon" in fallback_geo

def test_score_variant_match():
    trial = CURATED_BENCHMARK_TRIALS[0] # KRYSTAL-1 (KRAS G12D/G12C in Pancreatic Cancer)
    score, matched_terms = score_variant_match(
        trial=trial,
        gene="KRAS",
        mutation="G12D",
        cancer_type="Pancreatic Cancer"
    )
    assert score >= 0.70
    assert any("KRAS" in t for t in matched_terms)

def test_search_clinical_trials():
    res = search_clinical_trials(
        gene="KRAS",
        mutation="G12D",
        cancer_type="Pancreatic Ductal Adenocarcinoma",
        patient_zip="10001", # NYC
        radius_miles=100.0,
        phases=["Phase 2", "Phase 3"]
    )
    assert res["status"] == "success"
    assert res["total_found"] >= 1
    assert "trials" in res
    top_trial = res["trials"][0]
    assert "nct_id" in top_trial
    assert "nearest_site_distance_miles" in top_trial
    assert top_trial["match_score"] > 0.0

def test_get_trial_detail_by_nct():
    trial = get_trial_detail_by_nct("NCT04956640")
    assert trial is not None
    assert trial["acronym"] == "KRYSTAL-1"
    assert len(trial["sites"]) >= 1

def test_generate_trials_export_csv():
    trials = CURATED_BENCHMARK_TRIALS[:2]
    csv_str = generate_trials_export_csv(trials)
    assert "NCT_ID,Title,Phase" in csv_str
    assert "NCT04956640" in csv_str
