import pytest
import numpy as np
import pandas as pd
from modules.scrna_processor import (
    process_scrna_expression_matrix,
    calculate_csc_score,
    generate_benchmark_pdac_scrna,
    generate_spatial_visium_grid
)

def test_calculate_csc_score():
    # Construct small test dataframe with stem genes high in cell 0, low in cell 1
    df = pd.DataFrame({
        "CD44": [25.0, 1.0],
        "SOX2": [18.0, 0.0],
        "ALDH1A1": [15.0, 0.5],
        "MYC": [20.0, 1.0],
        "ACTB": [10.0, 10.0]
    }, index=["CELL_STEM", "CELL_DIFF"])

    scores = calculate_csc_score(df)
    assert len(scores) == 2
    assert scores[0] > scores[1]
    assert 0.0 <= scores[0] <= 1.0

def test_process_scrna_expression_matrix():
    # 50 cells, 20 genes
    np.random.seed(42)
    genes = [f"GENE_{i}" for i in range(20)]
    barcodes = [f"BC_{j}" for j in range(50)]
    data = np.random.poisson(lam=2.0, size=(50, 20))
    df = pd.DataFrame(data, index=barcodes, columns=genes)

    res = process_scrna_expression_matrix(df, dataset_name="TEST_RUN", n_clusters=3)
    assert res["status"] == "success"
    assert res["total_cells"] == 50
    assert res["total_genes"] == 20
    assert len(res["cell_points"]) == 50
    # Every cell point must have x, y, cluster, csc_score
    c0 = res["cell_points"][0]
    assert "x" in c0 and "y" in c0 and "cluster" in c0 and "csc_score" in c0

def test_generate_benchmark_pdac_scrna():
    bench = generate_benchmark_pdac_scrna(n_cells=1200)
    assert bench["status"] == "success"
    assert bench["total_cells"] == 1200
    assert bench["n_clusters"] >= 4
    # Must identify resistant CSC clone
    assert bench["has_resistant_csc_clone"] is True
    # Verify cluster summaries
    assert len(bench["clusters_summary"]) >= 4
    # Check marker genes contain log2fc and p_value
    c0_markers = bench["cluster_markers"][0]
    assert len(c0_markers) > 0
    assert "log2fc" in c0_markers[0]
    assert "p_value" in c0_markers[0]
    assert len(bench["clusters_summary"]) >= 4

def test_generate_spatial_visium_grid():
    grid = generate_spatial_visium_grid(n_spots_x=10, n_spots_y=10)
    assert grid["status"] == "success"
    assert grid["total_spots"] == 100
    assert len(grid["spots"]) == 100
    spot = grid["spots"][0]
    assert "x_coord" in spot and "y_coord" in spot
    assert "histological_zone" in spot
    assert "kras_tpm" in spot
    assert "cd44_tpm" in spot
