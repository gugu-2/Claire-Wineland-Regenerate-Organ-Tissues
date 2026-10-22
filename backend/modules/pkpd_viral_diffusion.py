"""
pkpd_viral_diffusion.py — Pharmacokinetic / Pharmacodynamic (PK/PD) Intratumoral Virus Diffusion Solver
Feature Spec 06 — Sprint 6

Simulates the spatiotemporal reaction-diffusion transport of oncolytic viruses
(HSV-1, MV, VSV, Adenovirus, Vaccinia) within solid tumors, accounting for:
1. Fibrous stroma / desmoplasia barrier permeability (collagen/hyaluronan matrix).
2. Interstitial fluid pressure (IFP) convective resistance.
3. Intratumoral (I.T.) direct bolus injection vs. Intravenous (I.V.) systemic delivery.
4. Pre-existing vs. de-novo neutralizing antibody clearance (anti-viral immunity).
5. Viral replication, cell lysis, burst size kinetics, and bystander killing radius.
"""

import math
import uuid
import datetime
from typing import Dict, List, Optional, Any, Tuple

# ── 1. ONCOLYTIC VIRUS BIOPHYSICAL CHARACTERISTICS ───────────────────────────────
PKPD_VIRUS_PROFILES: Dict[str, Dict[str, Any]] = {
    "HSV1_T-VEC_family": {
        "id": "HSV1_T-VEC_family",
        "name": "Herpes Simplex Virus Type 1 (HSV-1 / T-VEC / Imlygic)",
        "virion_diameter_nm": 180,
        "baseline_diffusivity_cm2_s": 1.2e-9,  # Large enveloped DNA virus
        "burst_size": 500,
        "burst_time_hours": 18.0,
        "infectivity_rate": 0.0025,
        "syncytia_factor": 1.0,  # Focal lytic spread
        "iv_hepatic_clearance_pct": 94.0,  # Severely cleared by liver/spleen in IV
        "antibody_neutralization_sensitivity": 0.85,  # High pre-existing HSV-1 seroprevalence (~60-70%)
        "recommended_route": "INTRATUMORAL_DIRECT",
        "standard_dose_tcid50": 1e8,
        "half_life_hours": 20.0
    },
    "Measles_MV_Edmonston": {
        "id": "Measles_MV_Edmonston",
        "name": "Measles Virus — Edmonston strain (MV-Edm / MV-NIS)",
        "virion_diameter_nm": 150,
        "baseline_diffusivity_cm2_s": 1.8e-9,
        "burst_size": 300,
        "burst_time_hours": 24.0,
        "infectivity_rate": 0.0032,
        "syncytia_factor": 1.85,  # Strong syncytia cell-cell fusion (Dr. Halassy mechanism)
        "iv_hepatic_clearance_pct": 75.0,
        "antibody_neutralization_sensitivity": 0.75,  # MMR vaccine seropositivity
        "recommended_route": "INTRATUMORAL_DIRECT",
        "standard_dose_tcid50": 1e8,
        "half_life_hours": 16.0
    },
    "VSV_Indiana": {
        "id": "VSV_Indiana",
        "name": "Vesicular Stomatitis Virus (VSV-Δ51 / Dr. Halassy Case)",
        "virion_diameter_nm": 70,  # Small bullet-shaped virus
        "baseline_diffusivity_cm2_s": 4.5e-9,  # High tissue penetration
        "burst_size": 1000,
        "burst_time_hours": 12.0,  # Fast replication kinetics
        "infectivity_rate": 0.0065,
        "syncytia_factor": 1.15,
        "iv_hepatic_clearance_pct": 60.0,
        "antibody_neutralization_sensitivity": 0.25,  # Extremely rare human seroprevalence
        "recommended_route": "INTRATUMORAL_DIRECT",
        "standard_dose_tcid50": 1e9,
        "half_life_hours": 12.0
    },
    "Adenovirus_Onyx015": {
        "id": "Adenovirus_Onyx015",
        "name": "Adenovirus Serotype 5 (Onyx-015 / H101 / Delta-24)",
        "virion_diameter_nm": 90,
        "baseline_diffusivity_cm2_s": 3.0e-9,
        "burst_size": 800,
        "burst_time_hours": 20.0,
        "infectivity_rate": 0.0038,
        "syncytia_factor": 1.0,
        "iv_hepatic_clearance_pct": 92.0,  # Trapped by CAR receptors and Kupffer cells
        "antibody_neutralization_sensitivity": 0.80,  # High Ad5 human neutralizing antibodies
        "recommended_route": "INTRATUMORAL_DIRECT",
        "standard_dose_tcid50": 1e9,
        "half_life_hours": 18.0
    },
    "Vaccinia_PexaVec": {
        "id": "Vaccinia_PexaVec",
        "name": "Vaccinia Virus (Pexa-Vec / JX-594 / Copenhagen strain)",
        "virion_diameter_nm": 250,  # Large brick-shaped poxvirus
        "baseline_diffusivity_cm2_s": 0.9e-9,
        "burst_size": 600,
        "burst_time_hours": 22.0,
        "infectivity_rate": 0.0028,
        "syncytia_factor": 1.25,
        "iv_hepatic_clearance_pct": 45.0,  # Extracellular enveloped virions resist complement & liver traps
        "antibody_neutralization_sensitivity": 0.35,  # Low seroprevalence in post-smallpox eradication population
        "recommended_route": "INTRAVENOUS_SYSTEMIC",
        "standard_dose_tcid50": 5e8,
        "half_life_hours": 26.0
    }
}

# ── 2. CANCER INDICATION DESMOPLASIA STROMA BENCHMARKS ───────────────────────────
DESMOPLASIA_BENCHMARKS: Dict[str, Dict[str, Any]] = {
    "Pancreatic Cancer (PDAC)": {
        "desmoplasia_factor": 0.85,
        "description": "Extremely dense, avascular hyaluronan/collagen stroma; high IFP (25-35 mmHg); primary cause of viral exclusion.",
        "fibrotic_barrier_level": "VERY_HIGH"
    },
    "Metastatic Melanoma": {
        "desmoplasia_factor": 0.30,
        "description": "Soft parenchymal tissue with high microvascular density; favorable for direct oncolysis.",
        "fibrotic_barrier_level": "LOW"
    },
    "Triple-Negative Breast Cancer": {
        "desmoplasia_factor": 0.50,
        "description": "Moderate fibrotic stroma with peripheral immune cell infiltration; responsive to dual viral regimens.",
        "fibrotic_barrier_level": "MODERATE"
    },
    "Glioblastoma (GBM)": {
        "desmoplasia_factor": 0.20,
        "description": "Brain neural parenchyma with low fibrillar collagen; limited by blood-brain barrier for IV but high local diffusivity.",
        "fibrotic_barrier_level": "MINIMAL"
    },
    "Colorectal Adenocarcinoma": {
        "desmoplasia_factor": 0.60,
        "description": "Prominent myofibroblast activity and moderate extracellular collagen deposits.",
        "fibrotic_barrier_level": "HIGH"
    }
}

# ── 3. CURATED CLINICAL BENCHMARK PRESETS ────────────────────────────────────────
CURATED_PKPD_PRESETS: List[Dict[str, Any]] = [
    {
        "preset_id": "PRESET_PDAC_DESMOPLASIA",
        "title": "Pancreatic Ductal Adenocarcinoma (PDAC) Desmoplastic Barrier",
        "cancer_type": "Pancreatic Cancer (PDAC)",
        "viral_chassis": "VSV_Indiana",
        "delivery_route": "INTRATUMORAL_DIRECT",
        "initial_dose_tcid50": 1e9,
        "tumor_radius_mm": 18.0,
        "desmoplasia_factor": 0.85,
        "serology_neutralization": "LOW",
        "simulation_hours": 72,
        "rationale": "Evaluates small bullet-shaped VSV penetration through dense collagen matrix where large viruses like HSV-1 get immobilized."
    },
    {
        "preset_id": "PRESET_MELANOMA_TVEC",
        "title": "Metastatic Cutaneous Melanoma (FDA T-VEC Standard)",
        "cancer_type": "Metastatic Melanoma",
        "viral_chassis": "HSV1_T-VEC_family",
        "delivery_route": "INTRATUMORAL_DIRECT",
        "initial_dose_tcid50": 1e8,
        "tumor_radius_mm": 12.0,
        "desmoplasia_factor": 0.30,
        "serology_neutralization": "MODERATE",
        "simulation_hours": 72,
        "rationale": "FDA-approved T-VEC (Imlygic) clinical benchmark protocol with direct intratumoral injection every 14 days."
    },
    {
        "preset_id": "PRESET_BREAST_HALASSY",
        "title": "Recurrent Breast Cancer (Dr. Beata Halassy MV + VSV Case)",
        "cancer_type": "Triple-Negative Breast Cancer",
        "viral_chassis": "Measles_MV_Edmonston",
        "delivery_route": "INTRATUMORAL_DIRECT",
        "initial_dose_tcid50": 1e8,
        "tumor_radius_mm": 15.0,
        "desmoplasia_factor": 0.50,
        "serology_neutralization": "MODERATE",
        "simulation_hours": 96,
        "rationale": "Models syncytia formation and bystander oncolysis observed in published 2024 self-treatment case."
    },
    {
        "preset_id": "PRESET_GBM_CONVECTION",
        "title": "Recurrent Glioblastoma (Delta-24 / Convection-Enhanced)",
        "cancer_type": "Glioblastoma (GBM)",
        "viral_chassis": "Adenovirus_Onyx015",
        "delivery_route": "INTRATUMORAL_DIRECT",
        "initial_dose_tcid50": 1e9,
        "tumor_radius_mm": 20.0,
        "desmoplasia_factor": 0.20,
        "serology_neutralization": "HIGH",
        "simulation_hours": 72,
        "rationale": "High interstitial fluid pressure in brain tumor core treated with direct catheter infusion."
    }
]

# ── 4. NUMERICAL REACTION-DIFFUSION SOLVER ───────────────────────────────────────
def simulate_pkpd_viral_diffusion(
    viral_chassis: str = "HSV1_T-VEC_family",
    delivery_route: str = "INTRATUMORAL_DIRECT",
    initial_dose_tcid50: float = 1e8,
    tumor_radius_mm: float = 15.0,
    desmoplasia_factor: float = 0.45,
    serology_neutralization: str = "MODERATE",
    simulation_hours: int = 72,
    db_session = None
) -> Dict[str, Any]:
    """
    Executes numerical integration of the 5-variable spatiotemporal viral
    reaction-diffusion model across N concentric tumor shells.
    """
    # 1. Lookup virus profile
    virus = PKPD_VIRUS_PROFILES.get(viral_chassis, PKPD_VIRUS_PROFILES["HSV1_T-VEC_family"])
    
    # Bound inputs defensively
    tumor_radius_mm = max(3.0, min(50.0, float(tumor_radius_mm)))
    desmoplasia_factor = max(0.0, min(0.95, float(desmoplasia_factor)))
    initial_dose_tcid50 = max(1e5, min(1e12, float(initial_dose_tcid50)))
    simulation_hours = max(24, min(168, int(simulation_hours)))

    # Serology multiplier for neutralization
    serology_weights = {"NONE": 0.05, "LOW": 0.30, "MODERATE": 0.70, "HIGH": 1.0}
    ab_weight = serology_weights.get(serology_neutralization.upper(), 0.70)
    effective_ab_neutralization = virus["antibody_neutralization_sensitivity"] * ab_weight

    # 2. Radial Discretization: 15 Concentric Shells
    NUM_SHELLS = 15
    dr = tumor_radius_mm / NUM_SHELLS
    radii = [(i + 0.5) * dr for i in range(NUM_SHELLS)]  # Midpoint radius per shell in mm
    
    # Calculate volume of each shell (in mm^3): V_shell = 4/3 * pi * (r_outer^3 - r_inner^3)
    shell_volumes = []
    for i in range(NUM_SHELLS):
        r_inner = i * dr
        r_outer = (i + 1) * dr
        v_shell = (4.0 / 3.0) * math.pi * (r_outer**3 - r_inner**3)
        shell_volumes.append(v_shell)

    total_tumor_volume_mm3 = (4.0 / 3.0) * math.pi * (tumor_radius_mm**3)

    # Cancer cell density: ~10^6 cells / mm^3
    CELL_DENSITY = 1.0e6
    initial_cells_per_shell = [v * CELL_DENSITY for v in shell_volumes]
    total_initial_cells = sum(initial_cells_per_shell)

    # 3. Matrix Barrier Diffusivity Correction:
    # D_eff = D0 * (1 - desmoplasia)^1.5 (per percolation and fiber matrix theory)
    diffusivity_raw = virus["baseline_diffusivity_cm2_s"] * 100.0  # cm^2/s -> mm^2/s
    diffusivity_per_hour = diffusivity_raw * 3600.0  # mm^2 / hour
    effective_diffusivity = diffusivity_per_hour * max(0.02, (1.0 - desmoplasia_factor)**1.5)

    # 4. Initial Delivery Distribution:
    # State vectors for each shell i:
    U = list(initial_cells_per_shell)  # Uninfected cells
    I = [0.0] * NUM_SHELLS              # Infected cells
    V = [0.0] * NUM_SHELLS              # Free virions
    K = [0.0] * NUM_SHELLS              # Dead / lysed cells
    A = [effective_ab_neutralization * 50.0] * NUM_SHELLS # Antibody level in ug/mL

    if delivery_route.upper() == "INTRATUMORAL_DIRECT":
        # Direct bolus injection into the inner 3 shells (central core: r <= 20% of radius)
        core_shells = max(1, int(NUM_SHELLS * 0.25))
        core_volume = sum(shell_volumes[:core_shells])
        for i in range(core_shells):
            V[i] = (initial_dose_tcid50 * (shell_volumes[i] / core_volume))
    else:
        # Systemic Intravenous Infusion:
        # Heavily attenuated by hepatic/splenic filtration and vascular permeability
        hepatic_survival = max(0.05, 1.0 - (virus["iv_hepatic_clearance_pct"] / 100.0))
        tumor_vascular_fraction = min(0.15, total_tumor_volume_mm3 / 500000.0) # ~5L blood volume
        bioavailable_dose = initial_dose_tcid50 * hepatic_survival * tumor_vascular_fraction
        # Extravasates through hyperpermeable tumor vessels into the outer vascularized margin (outer 50%)
        outer_start = int(NUM_SHELLS * 0.5)
        outer_volume = sum(shell_volumes[outer_start:])
        for i in range(outer_start, NUM_SHELLS):
            V[i] = bioavailable_dose * (shell_volumes[i] / outer_volume)

    # 5. Temporal Integration (Euler-Maruyama step dt = 0.25 hours)
    dt = 0.25
    total_steps = int(simulation_hours / dt)
    checkpoint_interval = int(12.0 / dt)  # Save snapshot every 12h

    timeline: List[Dict[str, Any]] = []
    
    # Save t=0
    timeline.append({
        "time_hours": 0,
        "viable_cells": total_initial_cells,
        "viable_pct": 100.0,
        "infected_cells": 0,
        "free_virions": sum(V),
        "dead_lysed_cells": 0
    })

    burst_size = virus["burst_size"]
    burst_rate = 1.0 / virus["burst_time_hours"]
    infectivity_beta = (virus["infectivity_rate"] * virus["syncytia_factor"]) / 1e7
    viral_decay_rate = 1.0 / virus["half_life_hours"]

    for step in range(1, total_steps + 1):
        t_curr = step * dt
        new_U = list(U)
        new_I = list(I)
        new_V = list(V)
        new_K = list(K)
        new_A = list(A)

        # A. Radial Diffusion flux for V across adjacent spherical shell interfaces (Mass-conserving finite volume)
        diffusion_flux = [0.0] * NUM_SHELLS
        for i in range(1, NUM_SHELLS):
            r_interface = i * dr
            area_interface = 4.0 * math.pi * (r_interface ** 2)
            v_prev = V[i - 1] / shell_volumes[i - 1]
            v_curr = V[i] / shell_volumes[i]
            # Net virion transfer rate from shell i-1 to shell i (particles / hr)
            flow = effective_diffusivity * ((v_prev - v_curr) / dr) * area_interface
            diffusion_flux[i - 1] -= flow
            diffusion_flux[i] += flow

        # Outer boundary clearance at tumor rim
        diffusion_flux[NUM_SHELLS - 1] -= 0.15 * V[NUM_SHELLS - 1]

        # B. Chemical Reactions per shell
        for i in range(NUM_SHELLS):
            # Infection: new infections = beta * U * V
            new_infections = min(U[i], infectivity_beta * U[i] * (V[i] / shell_volumes[i]))
            
            # Lysis of infected cells:
            cell_lysis = min(I[i], burst_rate * I[i] * dt)

            # Virion production: burst_size * cell_lysis
            virions_produced = cell_lysis * burst_size

            # Virion clearance (half-life decay + antibody neutralization):
            antibody_kill_rate = (A[i] / (A[i] + 30.0)) * effective_ab_neutralization * 0.4
            total_v_clearance = (viral_decay_rate + antibody_kill_rate) * V[i] * dt

            # Update densities
            new_U[i] = max(0.0, U[i] - new_infections)
            new_I[i] = max(0.0, I[i] + new_infections - cell_lysis)
            new_V[i] = max(0.0, V[i] + virions_produced - total_v_clearance + (diffusion_flux[i] * dt))
            new_K[i] = K[i] + cell_lysis
            # Antibody accumulation stimulated by infected cells
            new_A[i] = min(150.0, A[i] + (0.01 * (I[i] / shell_volumes[i]) * dt))

        U = new_U
        I = new_I
        V = new_V
        K = new_K
        A = new_A

        # Snapshot at 12h intervals
        if step % checkpoint_interval == 0 or step == total_steps:
            current_viable = sum(U) + sum(I)
            timeline.append({
                "time_hours": round(t_curr, 1),
                "viable_cells": int(current_viable),
                "viable_pct": round(max(0.0, (current_viable / total_initial_cells) * 100.0), 2),
                "infected_cells": int(sum(I)),
                "free_virions": float(f"{sum(V):.3e}"),
                "dead_lysed_cells": int(sum(K))
            })

    # 6. Spatial Depth Profile & Bystander Killing Zone
    spatial_depth_profile: List[Dict[str, Any]] = []
    bystander_threshold_radius_mm = 0.0

    for i in range(NUM_SHELLS):
        init_cell = initial_cells_per_shell[i]
        final_cell = U[i] + I[i]
        viability_pct = (final_cell / max(1.0, init_cell)) * 100.0
        r_mid = radii[i]

        if viability_pct < 50.0 and r_mid > bystander_threshold_radius_mm:
            bystander_threshold_radius_mm = r_mid

        spatial_depth_profile.append({
            "shell_index": i + 1,
            "radius_mm": round(r_mid, 2),
            "distance_from_core_pct": round((r_mid / tumor_radius_mm) * 100.0, 1),
            "initial_cells": int(init_cell),
            "final_cells": int(final_cell),
            "viability_pct": round(viability_pct, 1),
            "virion_density_tcid50": float(f"{(V[i] / shell_volumes[i]):.2e}"),
            "dead_debris": int(K[i])
        })

    # 7. Summary Clinical Metrics
    final_viable = sum(U) + sum(I)
    cell_kill_pct = max(0.0, min(100.0, ((total_initial_cells - final_viable) / total_initial_cells) * 100.0))
    # Volume reduction incorporates slow macrophage clearance of necrotic debris
    volume_reduction_pct = round(cell_kill_pct * 0.72, 1)

    # Re-dosing interval recommendation
    if cell_kill_pct > 80.0:
        redosing_days = 21
    elif cell_kill_pct > 50.0:
        redosing_days = 14
    else:
        redosing_days = 7

    simulation_id = f"PKPD_SIM_{uuid.uuid4().hex[:8].upper()}"

    result: Dict[str, Any] = {
        "simulation_id": simulation_id,
        "viral_chassis": viral_chassis,
        "virus_name": virus["name"],
        "delivery_route": delivery_route,
        "tumor_radius_mm": tumor_radius_mm,
        "total_tumor_volume_mm3": round(total_tumor_volume_mm3, 1),
        "desmoplasia_factor": desmoplasia_factor,
        "desmoplasia_rating": (
            "VERY_HIGH (Dense PDAC Collagen)" if desmoplasia_factor > 0.75 else
            "HIGH (Moderate Stroma)" if desmoplasia_factor > 0.55 else
            "MODERATE" if desmoplasia_factor > 0.35 else "LOW (Parenchymal)"
        ),
        "serology_neutralization": serology_neutralization,
        "simulation_hours": simulation_hours,
        "initial_total_cells": int(total_initial_cells),
        "final_viable_cells": int(final_viable),
        "tumor_cell_kill_pct": round(cell_kill_pct, 1),
        "expected_volume_reduction_pct": volume_reduction_pct,
        "bystander_killing_radius_mm": round(bystander_threshold_radius_mm, 2),
        "neutralization_hazard_score": round(effective_ab_neutralization, 2),
        "recommended_redosing_interval_days": redosing_days,
        "spatial_depth_profile": spatial_depth_profile,
        "timeline": timeline,
        "clinical_guidance": (
            f"Simulation demonstrates {cell_kill_pct:.1f}% cell lysis over {simulation_hours}h. "
            + (f"High desmoplasia ({desmoplasia_factor:.2f}) restricted viral penetration to inner {bystander_threshold_radius_mm:.1f} mm. Consider enzymatic hyaluronidase pre-treatment."
               if desmoplasia_factor > 0.60 else
               f"Diffusive penetration achieved {bystander_threshold_radius_mm:.1f} mm bystander killing radius. Optimal re-dosing cycle is every {redosing_days} days.")
        ),
        "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
    }

    # Optional SQLite persistence
    if db_session:
        try:
            from core.models import PkpdSimulationModel
            db_record = PkpdSimulationModel(
                simulation_id=simulation_id,
                viral_chassis=viral_chassis,
                delivery_route=delivery_route,
                tumor_radius_mm=tumor_radius_mm,
                desmoplasia_factor=desmoplasia_factor,
                tumor_cell_kill_pct=round(cell_kill_pct, 1),
                volume_reduction_pct=volume_reduction_pct,
                bystander_radius_mm=round(bystander_threshold_radius_mm, 2),
                simulation_json=result
            )
            db_session.add(db_record)
            db_session.commit()
        except Exception as e:
            if hasattr(db_session, "rollback"):
                db_session.rollback()

    return result


def generate_pkpd_export_csv(simulation: Dict[str, Any]) -> str:
    """
    Serializes PK/PD simulation depth profiles and timeline into RFC 4180 CSV format.
    """
    lines = [
        f"# PK/PD Intratumoral Diffusion Simulation Export",
        f"# Simulation ID: {simulation.get('simulation_id')}",
        f"# Virus Chassis: {simulation.get('virus_name')}",
        f"# Delivery Route: {simulation.get('delivery_route')}",
        f"# Tumor Radius (mm): {simulation.get('tumor_radius_mm')}",
        f"# Desmoplasia Factor: {simulation.get('desmoplasia_factor')}",
        f"# Total Cell Lysis: {simulation.get('tumor_cell_kill_pct')}%",
        f"# Bystander Radius: {simulation.get('bystander_killing_radius_mm')} mm",
        "",
        "SECTION: Spatial Radial Penetration Profile",
        "Shell_Index,Radius_mm,Core_Distance_Pct,Initial_Cells,Final_Viable_Cells,Viability_Pct,Virion_Density_TCID50_mm3,Dead_Cell_Debris"
    ]
    for s in simulation.get("spatial_depth_profile", []):
        lines.append(
            f"{s['shell_index']},{s['radius_mm']},{s['distance_from_core_pct']},{s['initial_cells']},{s['final_cells']},{s['viability_pct']},{s['virion_density_tcid50']},{s['dead_debris']}"
        )

    lines.append("")
    lines.append("SECTION: 72h Timeline Dynamics")
    lines.append("Time_Hours,Viable_Cells,Viability_Pct,Infected_Cells,Free_Virions,Dead_Lysed_Cells")
    for t in simulation.get("timeline", []):
        lines.append(
            f"{t['time_hours']},{t['viable_cells']},{t['viable_pct']},{t['infected_cells']},{t['free_virions']},{t['dead_lysed_cells']}"
        )

    return "\n".join(lines)
