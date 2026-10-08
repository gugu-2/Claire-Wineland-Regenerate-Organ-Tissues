"""
conftest.py — Pytest fixtures and configuration for the Genomic Research Copilot test suite.
Sets up an in-memory test database and provides shared fixtures for all tests.
"""
import pytest
import sys
import os

# Ensure the backend directory is on the path so all imports work
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from core.database import Base


# ---------------------------------------------------------------------------
# In-memory SQLite test database (isolated from the real genom.db)
# ---------------------------------------------------------------------------

TEST_DB_URL = "sqlite:///:memory:"

@pytest.fixture(scope="session")
def test_engine():
    engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    yield engine
    engine.dispose()


@pytest.fixture(scope="function")
def test_db(test_engine):
    """Provides a clean database session per test function, rolled back after each test."""
    TestSession = sessionmaker(bind=test_engine)
    session = TestSession()
    yield session
    session.rollback()
    session.close()


# ---------------------------------------------------------------------------
# Shared test data fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(scope="module")
def ccr5_guide_sequence():
    """Primary CCR5 clinical guide sequence (ECL2 / HIV co-receptor locus)."""
    return "GATAGTCATCTTGGGGCTGG"


@pytest.fixture(scope="module")
def hbb_sickle_guide():
    """HBB Exon 1 guide for sickle cell disease locus."""
    return "CCTGACTCCTGAGGAGAAGT"


@pytest.fixture(scope="module")
def ccr5_vcf_variants():
    """CCR5-Δ32 deletion variant for collision testing."""
    return [{
        "chromosome": "chr3",
        "position": 46373148,
        "ref": "GAGTCATCTTGGGGCTGG",
        "alt": "-",
        "variant_type": "deletion",
        "rsid": "rs333",
        "zygosity": "heterozygous",
        "clinical_significance": "Protective against HIV-1",
        "allele_frequency_gnomad": 0.111,
    }]


@pytest.fixture(scope="module")
def ccr5_seed_snp_variants():
    """CCR5 seed region SNP (chr3:46373140 C>T) for guide disruption testing."""
    return [{
        "chromosome": "chr3",
        "position": 46373140,
        "ref": "C",
        "alt": "T",
        "variant_type": "SNV",
        "rsid": "rs113010081",
        "zygosity": "homozygous",
    }]


@pytest.fixture(scope="module")
def kras_g12d_sequences():
    """KRAS G12D tumor/wildtype sequences for allele-specific design testing."""
    # 40nt context around codon 12 (GGT->GAT = G12D mutation)
    wildtype  = "ATGACTGAATATAAACTTGTGGTAG" + "TTGGAGCTGGTGGCGTAGGCAAGAG"
    tumor     = "ATGACTGAATATAAACTTGTGGTAG" + "TTGGAGCTA" + "GTGGCGTAGGCAAGAG"
    #                                                       ^^^ G->A at codon 12 pos 2
    return {"tumor": tumor, "wildtype": wildtype}
