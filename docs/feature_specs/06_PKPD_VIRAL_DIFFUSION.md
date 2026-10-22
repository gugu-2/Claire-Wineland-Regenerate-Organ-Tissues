# Feature Spec 06 — Pharmacokinetic / Pharmacodynamic (PK/PD) Intratumoral Virus Diffusion Solver

> **Status:** Specification Complete  
> **Sprint:** Sprint 6  
> **Priority:** 🔴 Critical Oncology Modeling  
> **Estimated Effort:** 4–6 development days  
> **Integration:** `backend/modules/pkpd_viral_diffusion.py`, `backend/modules/viral_tropism_modeler.py`, `frontend/src/components/OncoViralPlannerView.jsx`

---

## 1. Executive Summary & Clinical Rationale

Oncolytic virus (OV) therapy represents a validated pillar of precision immunotherapy (e.g. FDA-approved T-VEC for advanced melanoma, MV-NIS trials at Mayo Clinic, and Dr. Beata Halassy's published 2024 MV + VSV clinical breast cancer case). However, a central bottleneck in clinical oncolytic virotherapy is **intratumoral transport resistance**:

1. **Desmoplastic Stroma & Extracellular Matrix (ECM) Barriers:** Dense fibrous tumors (especially Pancreatic Ductal Adenocarcinoma - PDAC) feature excessive hyaluronan and collagen networks that severely restrict virion diffusion.
2. **Elevated Interstitial Fluid Pressure (IFP):** Lack of functional lymphatic drainage inside solid tumors elevates interstitial fluid pressure to 10–30 mmHg, driving outward convective fluid flow that opposes inward drug and viral particle diffusion.
3. **Neutralizing Antibodies & Clearance:** Pre-existing patient immunity or de-novo seroconversion (anti-HSV, anti-Measles, anti-Adenovirus) neutralizes free virions before they can infect deep tumor parenchyma.
4. **Delivery Route Divergence:** Clinicians must choose between direct ultrasound-guided intratumoral (I.T.) injection vs. systemic intravenous (I.V.) infusion with hepatic and reticuloendothelial sequestration.

This module provides a **rigorous mathematical 5-component reaction-diffusion ODE/PDE numerical solver** modeling the 72-hour to 120-hour spatiotemporal dynamics of viral penetration, bystander killing, and tumor volume regression.

---

## 2. Mathematical Model & Governing Equations

The solver models a radially symmetric spherical tumor of radius $R_{\text{tumor}}$ discretized into $N$ concentric radial shells ($r \in [0, R_{\text{tumor}}]$) over time $t \in [0, T_{\text{max}}]$ (typically 72 to 120 hours).

### State Variables (Concentrations at radius $r$ and time $t$):
1. $U(t, r)$: Density of uninfected viable cancer cells ($\text{cells}/\text{mm}^3$)
2. $I(t, r)$: Density of infected cancer cells actively synthesizing virions ($\text{cells}/\text{mm}^3$)
3. $V(t, r)$: Density of free infectious virions ($\text{TCID}_{50}/\text{mm}^3$ or $\text{PFU}/\text{mm}^3$)
4. $A(t, r)$: Local neutralizing antibody titer ($\mu\text{g}/\text{mL}$)
5. $K(t, r)$: Accumulation of dead / lysed tumor cells releasing tumor antigens ($\text{cells}/\text{mm}^3$)

### Reaction-Diffusion System:
$$\frac{\partial U}{\partial t} = \lambda_U \cdot U \cdot \left(1 - \frac{U + I}{K_{\text{max}}}\right) - \beta \cdot U \cdot V$$

$$\frac{\partial I}{\partial t} = \beta \cdot U \cdot V - \delta_I \cdot I$$

$$\frac{\partial V}{\partial t} = D_V \cdot \nabla^2 V - v_i \cdot \frac{\partial V}{\partial r} + \alpha \cdot \delta_I \cdot I - \gamma_V \cdot V - k_{ab} \cdot A \cdot V - \beta \cdot U \cdot V$$

$$\frac{\partial A}{\partial t} = \rho_A \cdot I - \mu_A \cdot A$$

$$\frac{\partial K}{\partial t} = \delta_I \cdot I - \mu_K \cdot K$$

Where:
- $\nabla^2 V = \frac{\partial^2 V}{\partial r^2} + \frac{2}{r} \frac{\partial V}{\partial r}$ (spherical radial Laplacian)
- $\lambda_U$: Tumor intrinsic proliferation rate ($\approx 0.02 - 0.04 \text{ h}^{-1}$)
- $K_{\text{max}}$: Carrying capacity of the tumor tissue ($\approx 10^6 \text{ cells}/\text{mm}^3$)
- $\beta$: Viral infectivity rate constant ($\text{mm}^3/(\text{virion} \cdot \text{h})$)
- $\delta_I$: Lytic death rate of infected cells ($1/\text{burst\_time}$, typically $0.04 - 0.08 \text{ h}^{-1}$)
- $\alpha$: Burst size (virions produced per lysed cell, e.g. 300 to 1,000)
- $D_V$: Effective diffusion coefficient in tumor stroma:
  $$D_V = D_0 \cdot (1 - \text{desmoplasia\_factor})^{1.5}$$
- $v_i$: Interstitial fluid convection velocity:
  $$v_i(r) = \kappa_{\text{hydraulic}} \cdot \frac{P_{\text{IFP}}}{R_{\text{tumor}}} \cdot \frac{r}{R_{\text{tumor}}}$$
- $\gamma_V$: Non-specific viral clearance rate in tissue ($0.03 - 0.06 \text{ h}^{-1}$)
- $k_{ab}$: Neutralizing antibody clearance rate constant
- Boundary conditions:
  - $\left.\frac{\partial V}{\partial r}\right|_{r=0} = 0$ (symmetry at core)
  - $\left.V\right|_{r=R_{\text{tumor}}} = V_{\text{plasma}} \cdot \sigma_{\text{vessel}}$ (permeability at margin)

---

## 3. Supported Viral Backbones & Biophysical Parameters

| Virus Chassis | Particle Diameter | Stroma Diffusivity $D_0$ | Burst Size $\alpha$ | Burst Time | Syncytia Fusion Factor | Systemic Delivery Feasibility |
|---|---|---|---|---|---|---|
| **HSV-1 (T-VEC / Imlygic)** | 180 nm | $1.2 \times 10^{-9} \text{ cm}^2/\text{s}$ | 500 virions | 18 h | 1.0 (Low) | ❌ Restricted to I.T. (pre-existing anti-HSV neutralizing titers) |
| **Measles Virus (MV-Edm)** | 150 nm | $1.8 \times 10^{-9} \text{ cm}^2/\text{s}$ | 300 virions | 24 h | 1.8 (High syncytia formation) | ✔ Possible with cellular shielding |
| **VSV (Vesicular Stomatitis)** | 70 nm | $4.5 \times 10^{-9} \text{ cm}^2/\text{s}$ | 1000 virions | 12 h | 1.1 (Rapid lytic cycle) | ✔ Fast replication outpaces neutralizing antibody |
| **Adenovirus (Onyx-015 / H101)** | 90 nm | $3.0 \times 10^{-9} \text{ cm}^2/\text{s}$ | 800 virions | 20 h | 1.0 (Non-enveloped) | ⚠️ High liver Kupffer cell sequestration |
| **Vaccinia Virus (Pexa-Vec)** | 250 nm | $0.9 \times 10^{-9} \text{ cm}^2/\text{s}$ | 600 virions | 22 h | 1.2 (Extracellular enveloped virions) | ✔ High complement resistance |

---

## 4. REST API Endpoints

1. `POST /api/pkpd/simulate`
   - Payload:
     ```json
     {
       "viral_chassis": "HSV1_T-VEC_family",
       "delivery_route": "INTRATUMORAL_DIRECT",
       "initial_dose_tcid50": 100000000,
       "tumor_radius_mm": 15.0,
       "desmoplasia_factor": 0.45,
       "serology_neutralization": "MODERATE",
       "simulation_hours": 72
     }
     ```
   - Returns: Complete spatial depth arrays, time steps (0h, 12h, 24h, 48h, 72h), bystander killing radius (mm), expected tumor volume change (%), and recommended re-dosing interval.
2. `GET /api/pkpd/presets`
   - Returns curated benchmark clinical presets:
     - PDAC Desmoplastic Stroma (Pancreatic Cancer)
     - Metastatic Melanoma (T-VEC Protocol)
     - Triple-Negative Breast Cancer (Halassy MV+VSV Protocol)
     - Glioblastoma Multiforme (Convection-Enhanced Delivery)
3. `GET /api/pkpd/simulations/{sim_id}`
   - Retrieves previously executed simulation run by ID.

---

## 5. UI Integration in `OncoViralPlannerView.jsx`

- Added Tab: **"🌊 PK/PD Viral Diffusion Solver (Sprint 6)"**.
- Controls:
  - Viral Chassis selector
  - Delivery Route selector (Intratumoral vs Systemic IV)
  - Sliders for Tumor Radius ($5 - 40\text{ mm}$), Stroma Desmoplasia ($0.0 - 1.0$), and Dose.
  - Antibody serology level buttons (None, Low, Moderate, High).
- Graphs:
  - 72h Viability & Tumor Volume Regression Curve.
  - Concentric Radial Penetration Depth Chart ($r = 0\text{ mm}$ to $r = R_{\text{tumor}}$).
  - Clinical metrics badges: Bystander Killing Zone (mm), 72h Volume Change (%), Neutralization Risk Pill, Re-Dosing Interval Recommendation.
