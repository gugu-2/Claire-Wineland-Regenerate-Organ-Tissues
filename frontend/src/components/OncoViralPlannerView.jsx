import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

const BSL_BADGE = {
  1: 'bg-emerald-900/50 border-emerald-700 text-emerald-300',
  2: 'bg-amber-900/50 border-amber-700 text-amber-300',
  3: 'bg-rose-900/50 border-rose-700 text-rose-300',
};

const CANCER_TYPE_OPTIONS = [
  'Melanoma', 'NSCLC', 'Colorectal Cancer', 'Glioblastoma (GBM)',
  'Breast Cancer', 'Pancreatic Cancer (PDAC)', 'Ovarian Cancer',
  'Multiple Myeloma', 'Hepatocellular Carcinoma (HCC)',
  'Head & Neck SCC', 'AML', 'T-cell Lymphoma', 'Other',
];

const CYTOKINE_OPTIONS = ['GM-CSF', 'IL-12', 'IFN-beta', 'NIS', 'IL-2'];
const PROMOTER_OPTIONS = [
  { value: 'TERT_promoter', label: 'TERT (pan-cancer, ~90% of tumors)' },
  { value: 'Survivin_promoter', label: 'Survivin / BIRC5 (highly tumor-specific)' },
  { value: 'AFP_promoter', label: 'AFP (Hepatocellular Carcinoma specific)' },
  { value: 'CEA_promoter', label: 'CEA (Colorectal / Pancreatic / Breast)' },
  { value: 'HER2_promoter', label: 'HER2 (HER2-amplified Breast / Gastric)' },
];

export default function OncoViralPlannerView({ tumorProfile }) {
  const [viralDb, setViralDb] = useState(null);
  const [dbLoading, setDbLoading] = useState(false);

  // Recommendation inputs
  const [cancerType, setCancerType] = useState('Melanoma');
  const [tmbClass, setTmbClass] = useState('TMB-Low');
  const [msiStatus, setMsiStatus] = useState('MSS');
  const [immuneStatus, setImmuneStatus] = useState('Immunocompetent');
  const [recommendations, setRecommendations] = useState(null);
  const [recLoading, setRecLoading] = useState(false);

  // Blueprint inputs
  const [selectedVirus, setSelectedVirus] = useState(null);
  const [cytokine, setCytokine] = useState('GM-CSF');
  const [promoter, setPromoter] = useState('TERT_promoter');
  const [blueprint, setBlueprint] = useState(null);
  const [bpLoading, setBpLoading] = useState(false);

  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('recommend'); // 'recommend' | 'blueprint' | 'database' | 'pkpd'

  // ── SPRINT 6: PK/PD Intratumoral Diffusion State ─────────────────────────
  const [pkpdChassis, setPkpdChassis] = useState('HSV1_T-VEC_family');
  const [pkpdRoute, setPkpdRoute] = useState('INTRATUMORAL_DIRECT');
  const [pkpdDose, setPkpdDose] = useState('1e8');
  const [pkpdRadius, setPkpdRadius] = useState(15.0);
  const [pkpdDesmoplasia, setPkpdDesmoplasia] = useState(0.45);
  const [pkpdSerology, setPkpdSerology] = useState('MODERATE');
  const [pkpdHours, setPkpdHours] = useState(72);
  const [pkpdResult, setPkpdResult] = useState(null);
  const [pkpdLoading, setPkpdLoading] = useState(false);
  const [pkpdPresets, setPkpdPresets] = useState([]);

  useEffect(() => {
    // Pre-fill from tumor profile if passed in
    if (tumorProfile) {
      const tmb = tumorProfile.tumor_genomics_summary?.tumor_mutational_burden;
      const msi = tumorProfile.tumor_genomics_summary?.microsatellite_instability;
      if (tmb?.tmb_classification) setTmbClass(tmb.tmb_classification);
      if (msi?.msi_status) setMsiStatus(msi.msi_status);
      if (tumorProfile.cancer_type) setCancerType(tumorProfile.cancer_type);
    }
  }, [tumorProfile]);

  const fetchViralDb = async () => {
    setDbLoading(true);
    try {
      const data = await api.getViralDatabase();
      setViralDb(data);
    } catch (e) {
      setError('Could not load viral database: ' + (e.message || 'Network error'));
    } finally {
      setDbLoading(false);
    }
  };

  const runRecommendation = async () => {
    setRecLoading(true);
    setError('');
    try {
      const data = await api.recommendViralChassis({
        cancer_type: cancerType,
        tmb_classification: tmbClass,
        msi_status: msiStatus,
        immune_status: immuneStatus,
      });
      setRecommendations(data);
    } catch (e) {
      setError('Recommendation failed: ' + (e.message || 'Network error'));
    } finally {
      setRecLoading(false);
    }
  };

  const runBlueprint = async () => {
    if (!selectedVirus) { setError('Please select a virus chassis first (run recommendation or choose from database).'); return; }
    setBpLoading(true);
    setError('');
    try {
      const data = await api.designViralBlueprint({
        virus_id: selectedVirus.virus_id || selectedVirus.id,
        cancer_type: cancerType,
        cytokine_payload: cytokine,
        promoter,
      });
      setBlueprint(data);
    } catch (e) {
      setError('Blueprint design failed: ' + (e.message || 'Network error'));
    } finally {
      setBpLoading(false);
    }
  };

  const fetchPkpdPresets = async () => {
    try {
      const data = await api.getPkpdPresets();
      if (data?.presets) setPkpdPresets(data.presets);
    } catch (e) {
      console.warn('Failed to load PK/PD presets:', e);
    }
  };

  const applyPkpdPreset = (p) => {
    setPkpdChassis(p.viral_chassis);
    setPkpdRoute(p.delivery_route);
    setPkpdDose(String(p.initial_dose_tcid50));
    setPkpdRadius(p.tumor_radius_mm);
    setPkpdDesmoplasia(p.desmoplasia_factor);
    setPkpdSerology(p.serology_neutralization);
    setPkpdHours(p.simulation_hours);
  };

  const runPkpdSimulation = async () => {
    setPkpdLoading(true);
    setError('');
    try {
      const res = await api.simulatePkpd({
        viral_chassis: pkpdChassis,
        delivery_route: pkpdRoute,
        initial_dose_tcid50: parseFloat(pkpdDose) || 1e8,
        tumor_radius_mm: parseFloat(pkpdRadius),
        desmoplasia_factor: parseFloat(pkpdDesmoplasia),
        serology_neutralization: pkpdSerology,
        simulation_hours: parseInt(pkpdHours)
      });
      setPkpdResult(res.simulation);
    } catch (e) {
      setError('PK/PD Simulation failed: ' + (e.message || 'Error'));
    } finally {
      setPkpdLoading(false);
    }
  };

  const TabButton = ({ id, label }) => (
    <button onClick={() => {
      setActiveTab(id);
      if (id === 'database' && !viralDb) fetchViralDb();
      if (id === 'pkpd' && pkpdPresets.length === 0) fetchPkpdPresets();
    }}
      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === id ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
      {label}
    </button>
  );

  const VirusCard = ({ v, rank, onSelect, isSelected }) => (
    <div className={`bg-slate-900 border rounded-xl p-4 transition-all ${isSelected ? 'border-blue-500' : 'border-slate-700 hover:border-slate-500'}`}>
      <div className="flex items-start justify-between mb-2">
        <div>
          {rank && <span className="text-xs text-slate-500 mr-2">#{rank}</span>}
          <span className="text-sm font-bold text-white">{v.short_name}</span>
          <span className="text-xs text-slate-400 ml-2">{v.name || v.short_name}</span>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded border ${BSL_BADGE[v.bsl_level] || BSL_BADGE[2]}`}>
          BSL-{v.bsl_level}
        </span>
      </div>

      {v.fda_precedent && (
        <div className="text-xs text-emerald-300 bg-emerald-950/20 border border-emerald-900 rounded px-2 py-1 mb-2">
          🏛️ {v.fda_precedent}
        </div>
      )}

      <p className="text-xs text-slate-400 mb-2 line-clamp-2">{v.tumor_selectivity_mechanism}</p>

      {v.notable_case && (
        <div className="text-xs text-purple-300 bg-purple-950/20 border border-purple-900 rounded px-2 py-1 mb-2">
          🔬 {v.notable_case}
        </div>
      )}

      <div className="flex flex-wrap gap-1 mb-2">
        {(v.best_for_cancers || []).slice(0, 3).map(c => (
          <span key={c} className="px-1.5 py-0.5 bg-slate-800 text-slate-300 text-xs rounded border border-slate-700">{c}</span>
        ))}
        {(v.best_for_cancers || []).length > 3 && (
          <span className="px-1.5 py-0.5 bg-slate-800 text-slate-400 text-xs rounded">+{(v.best_for_cancers || []).length - 3} more</span>
        )}
      </div>

      <div className="text-xs text-slate-500">
        <span className="text-slate-400">Payload capacity:</span> {v.payload_capacity_kb} kb &nbsp;|&nbsp;
        <span className="text-slate-400">Intratumoral:</span> {v.intratumoral_delivery ? '✓' : '✗'} &nbsp;|&nbsp;
        <span className="text-slate-400">Systemic:</span> {v.systemic_delivery ? '✓' : '✗'}
      </div>

      {onSelect && (
        <button onClick={() => onSelect(v)}
          className={`mt-3 w-full py-1.5 text-xs font-semibold rounded-lg transition-colors ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>
          {isSelected ? '✓ Selected for Blueprint' : 'Select for Blueprint'}
        </button>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-5 p-4 md:p-6 bg-slate-950 min-h-full text-slate-200">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          🦠 OncoViral Therapy Planner
          <span className="text-xs font-normal px-2 py-0.5 bg-amber-900/50 text-amber-300 border border-amber-700 rounded">BSL-2 TOOL</span>
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Computational oncolytic virus engineering platform. Inspired by Dr. Beata Halassy's self-treatment of breast cancer
          using <span className="text-purple-300">Measles Virus + VSV</span> (published peer-reviewed case, 2024).
        </p>
      </div>

      {/* BSL Safety Banner */}
      <div className="bg-amber-950/40 border border-amber-700 rounded-lg p-3 text-xs text-amber-300 flex items-start gap-2">
        <span className="text-lg">🔬</span>
        <span>
          <strong>BSL-2 Research Tool:</strong> All viral therapy designs require Institutional Biosafety Committee (IBC) pre-approval.
          Viral preparations must be performed in BSL-2 certified facilities by trained personnel.
          No patient administration without FDA IND approval.
        </span>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-800 pb-1">
        <TabButton id="recommend" label="🏆 Chassis Recommendation" />
        <TabButton id="blueprint" label="🧬 Engineering Blueprint" />
        <TabButton id="database" label="📚 Virus Database" />
        <TabButton id="pkpd" label="🌊 PK/PD Diffusion (Sprint 6)" />
      </div>

      {error && <div className="text-rose-400 text-xs bg-rose-950/30 border border-rose-800 rounded p-2">{error}</div>}

      {/* TAB: Recommendation */}
      {activeTab === 'recommend' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Input */}
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-slate-200">Patient Profile</h2>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Cancer Type</label>
              <select value={cancerType} onChange={e => setCancerType(e.target.value)}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500">
                {CANCER_TYPE_OPTIONS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">TMB Classification</label>
              <select value={tmbClass} onChange={e => setTmbClass(e.target.value)}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500">
                {['TMB-High', 'TMB-Intermediate', 'TMB-Low'].map(v => <option key={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">MSI Status</label>
              <select value={msiStatus} onChange={e => setMsiStatus(e.target.value)}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500">
                {['MSI-High', 'MSI-Low', 'MSS'].map(v => <option key={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Patient Immune Status</label>
              <select value={immuneStatus} onChange={e => setImmuneStatus(e.target.value)}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500">
                {['Immunocompetent', 'Mildly Immunocompromised', 'Severely Immunocompromised'].map(v => <option key={v}>{v}</option>)}
              </select>
            </div>
            <button onClick={runRecommendation} disabled={recLoading}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-400 text-white rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2">
              {recLoading ? <><span className="animate-spin">⚙️</span> Analyzing...</> : '🦠 Get Virus Recommendations'}
            </button>
          </div>

          {/* Results */}
          <div className="lg:col-span-2 flex flex-col gap-3">
            {!recommendations && !recLoading && (
              <div className="bg-slate-900 border border-slate-700 rounded-xl p-10 text-center text-slate-400 flex flex-col items-center gap-3">
                <span className="text-4xl">🧬</span>
                <p className="text-sm">Configure the patient profile and click <strong>Get Virus Recommendations</strong></p>
                <p className="text-xs text-slate-500">Our AI ranks the top oncolytic virus backbones for your cancer type, TMB, and immune status</p>
              </div>
            )}
            {recLoading && (
              <div className="bg-slate-900 border border-slate-700 rounded-xl p-10 text-center flex flex-col items-center gap-3">
                <div className="animate-spin text-3xl">🔬</div>
                <p className="text-sm text-blue-300">Ranking viral chassis against patient profile...</p>
              </div>
            )}
            {recommendations && (
              <div className="flex flex-col gap-3">
                <div className="bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-slate-400">
                  <strong className="text-slate-300">Ranking rationale:</strong> {recommendations.ranking_rationale}
                </div>
                {recommendations.top_3_recommendations?.map((v, i) => (
                  <VirusCard key={v.virus_id} v={v} rank={i + 1}
                    isSelected={selectedVirus?.virus_id === v.virus_id}
                    onSelect={(sel) => { setSelectedVirus(sel); setActiveTab('blueprint'); }} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: Blueprint */}
      {activeTab === 'blueprint' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Blueprint Inputs */}
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-slate-200">Blueprint Configuration</h2>
            <div className="text-xs text-slate-400 bg-slate-800 rounded-lg p-2">
              {selectedVirus
                ? <><span className="text-white font-semibold">{selectedVirus.short_name}</span> selected — {selectedVirus.name}</>
                : <span className="text-amber-400">No virus selected. Go to Chassis Recommendation tab first.</span>}
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Cytokine Payload</label>
              <select value={cytokine} onChange={e => setCytokine(e.target.value)}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500">
                {CYTOKINE_OPTIONS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Tumor-Specific Promoter</label>
              <select value={promoter} onChange={e => setPromoter(e.target.value)}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500">
                {PROMOTER_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <button onClick={runBlueprint} disabled={bpLoading || !selectedVirus}
              className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 disabled:text-slate-400 text-white rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2">
              {bpLoading ? <><span className="animate-spin">⚙️</span> Designing...</> : '📋 Generate Engineering Blueprint'}
            </button>
          </div>

          {/* Blueprint Output */}
          <div className="lg:col-span-2 flex flex-col gap-3">
            {!blueprint && !bpLoading && (
              <div className="bg-slate-900 border border-slate-700 rounded-xl p-10 text-center text-slate-400 flex flex-col items-center gap-3">
                <span className="text-4xl">📋</span>
                <p className="text-sm">Configure options and click <strong>Generate Engineering Blueprint</strong></p>
              </div>
            )}
            {bpLoading && (
              <div className="bg-slate-900 border border-slate-700 rounded-xl p-10 text-center flex flex-col items-center gap-3">
                <div className="animate-spin text-3xl">🧬</div>
                <p className="text-sm text-purple-300">Generating viral engineering blueprint...</p>
              </div>
            )}
            {blueprint && (
              <div className="flex flex-col gap-3">
                <div className="bg-slate-900 border border-purple-700 rounded-xl p-4">
                  <h2 className="text-base font-bold text-white mb-1">{blueprint.blueprint_title}</h2>
                  <div className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded border ${BSL_BADGE[blueprint.selected_backbone?.bsl_level] || BSL_BADGE[2]}`}>
                    BSL-{blueprint.selected_backbone?.bsl_level} — {blueprint.selected_backbone?.bsl_note}
                  </div>
                </div>

                {/* Genomic Deletions */}
                <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-white mb-2">Required Genomic Deletions</h3>
                  <ul className="flex flex-col gap-1">
                    {(blueprint.required_genomic_deletions || []).map((d, i) => (
                      <li key={i} className="text-xs text-rose-300 bg-rose-950/20 border border-rose-900 rounded px-2 py-1">✂️ {d}</li>
                    ))}
                  </ul>
                </div>

                {/* Payload */}
                <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-white mb-2">Cytokine Payload Design</h3>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-slate-400">Cytokine:</span> <span className="text-emerald-300 font-semibold">{blueprint.payload_design?.cytokine}</span></div>
                    <div><span className="text-slate-400">Size:</span> <span className="text-slate-300">{blueprint.payload_design?.size_bp} bp</span></div>
                  </div>
                  <p className="text-xs text-slate-400 mt-2">{blueprint.payload_design?.mechanism}</p>
                  <p className="text-xs text-blue-300 mt-1">Precedent: {blueprint.payload_design?.clinical_precedent}</p>
                  {blueprint.payload_design?.capacity_warning && (
                    <div className="mt-2 text-xs text-amber-300 bg-amber-950/20 border border-amber-900 rounded p-2">
                      {blueprint.payload_design.capacity_warning}
                    </div>
                  )}
                </div>

                {/* Promoter */}
                <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-white mb-2">Tumor-Specific Promoter</h3>
                  <div className="text-xs">
                    <div className="text-emerald-300 font-semibold">{blueprint.tumor_specific_promoter?.name}</div>
                    <div className="text-slate-400 mt-1">Selectivity: <span className="text-white">{blueprint.tumor_specific_promoter?.selectivity}</span></div>
                    <div className="text-slate-400">Active in: <span className="text-slate-300">{blueprint.tumor_specific_promoter?.active_in}</span></div>
                    <div className="text-slate-400">Inactive in: <span className="text-slate-300">{blueprint.tumor_specific_promoter?.inactive_in}</span></div>
                  </div>
                </div>

                {/* Assembly Strategy */}
                <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-white mb-2">🔧 {blueprint.assembly_strategy?.method}</h3>
                  <ol className="flex flex-col gap-1">
                    {(blueprint.assembly_strategy?.insert_order || []).map((step, i) => (
                      <li key={i} className="text-xs text-slate-300">{step}</li>
                    ))}
                  </ol>
                </div>

                {/* IBC Checklist */}
                <div className="bg-amber-950/20 border border-amber-800 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-amber-300 mb-2">⚠️ IBC Pre-Approval Checklist</h3>
                  <ul className="flex flex-col gap-1">
                    {(blueprint.ibc_approval_checklist || []).map((item, i) => (
                      <li key={i} className="text-xs text-amber-200">{item}</li>
                    ))}
                  </ul>
                </div>

                <div className="text-xs text-rose-400 bg-rose-950/20 border border-rose-900 rounded p-3">
                  {blueprint.oncology_disclaimer}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: Database */}
      {activeTab === 'database' && (
        <div>
          {dbLoading && (
            <div className="text-center py-10 text-slate-400">
              <div className="animate-spin text-3xl mb-2">🔬</div>
              <p>Loading viral database...</p>
            </div>
          )}
          {viralDb && (
            <div className="flex flex-col gap-4">
              <div className="text-xs text-slate-400 bg-slate-900 border border-slate-700 rounded p-2">
                {viralDb.total_backbones} oncolytic virus backbones in database
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {viralDb.viral_backbones?.map(v => (
                  <VirusCard key={v.id} v={v}
                    isSelected={selectedVirus?.virus_id === v.id || selectedVirus?.id === v.id}
                    onSelect={(sel) => { setSelectedVirus({ ...sel, virus_id: sel.id }); setActiveTab('blueprint'); }} />
                ))}
              </div>

              <h3 className="text-sm font-semibold text-white mt-2">Cytokine Payloads</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {viralDb.cytokine_payloads?.map(c => (
                  <div key={c.gene} className="bg-slate-900 border border-slate-700 rounded-xl p-3">
                    <div className="font-semibold text-emerald-300 text-sm">{c.cytokine || c.protein}</div>
                    <div className="text-xs text-slate-400 mt-1">{c.mechanism}</div>
                    <div className="text-xs text-blue-300 mt-1">Precedent: {c.clinical_precedent}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {!viralDb && !dbLoading && (
            <div className="text-center py-10 text-slate-400">
              <button onClick={fetchViralDb} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-500">Load Viral Database</button>
            </div>
          )}
        </div>
      )}

      {/* TAB: PK/PD Intratumoral Diffusion Solver (Sprint 6) */}
      {activeTab === 'pkpd' && (
        <div className="flex flex-col gap-5">
          {/* Presets Header */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Curated Clinical Benchmark Scenarios (Click to Preload)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2">
              {[
                {
                  id: 'pdac',
                  label: 'Pancreatic PDAC (Dense Stroma)',
                  viral_chassis: 'VSV_Indiana',
                  delivery_route: 'INTRATUMORAL_DIRECT',
                  initial_dose_tcid50: 1e8,
                  tumor_radius_mm: 18.0,
                  desmoplasia_factor: 0.85,
                  serology_neutralization: 'LOW',
                  simulation_hours: 72,
                  badge: 'Desmoplasia 0.85'
                },
                {
                  id: 'melanoma',
                  label: 'Melanoma T-VEC (FDA Approved)',
                  viral_chassis: 'HSV1_T-VEC_family',
                  delivery_route: 'INTRATUMORAL_DIRECT',
                  initial_dose_tcid50: 1e8,
                  tumor_radius_mm: 12.0,
                  desmoplasia_factor: 0.30,
                  serology_neutralization: 'MODERATE',
                  simulation_hours: 72,
                  badge: 'Standard Protocol'
                },
                {
                  id: 'breast',
                  label: 'Breast Cancer (Dr. Halassy MV+VSV)',
                  viral_chassis: 'Measles_MV_Edmonston',
                  delivery_route: 'INTRATUMORAL_DIRECT',
                  initial_dose_tcid50: 1e8,
                  tumor_radius_mm: 15.0,
                  desmoplasia_factor: 0.50,
                  serology_neutralization: 'MODERATE',
                  simulation_hours: 96,
                  badge: 'Syncytia Oncolysis'
                },
                {
                  id: 'gbm',
                  label: 'Glioblastoma Convection-Enhanced',
                  viral_chassis: 'Adenovirus_Onyx015',
                  delivery_route: 'INTRATUMORAL_DIRECT',
                  initial_dose_tcid50: 1e9,
                  tumor_radius_mm: 20.0,
                  desmoplasia_factor: 0.20,
                  serology_neutralization: 'HIGH',
                  simulation_hours: 72,
                  badge: 'High IFP Catheter'
                }
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => applyPkpdPreset(p)}
                  className="p-2.5 text-left bg-slate-950 border border-slate-800 hover:border-cyan-500/50 rounded-lg transition-all group"
                >
                  <div className="text-xs font-bold text-slate-200 group-hover:text-cyan-400">{p.label}</div>
                  <div className="text-[10px] text-cyan-400 font-mono mt-0.5">{p.badge}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Simulation Parameters Column */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4">
              <h2 className="text-sm font-semibold text-white flex items-center justify-between">
                <span>Reaction-Diffusion Parameters</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 border border-cyan-800 text-cyan-300 font-mono">
                  5-Variable PDE/ODE
                </span>
              </h2>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Oncolytic Viral Chassis</label>
                <select
                  value={pkpdChassis}
                  onChange={(e) => setPkpdChassis(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="HSV1_T-VEC_family">HSV-1 (T-VEC / Imlygic) — 180nm, 500 burst</option>
                  <option value="Measles_MV_Edmonston">Measles Virus (MV-Edm) — 150nm, High Syncytia</option>
                  <option value="VSV_Indiana">VSV (Vesicular Stomatitis) — 70nm, Fast Kinetics</option>
                  <option value="Adenovirus_Onyx015">Adenovirus (Onyx-015 / Delta-24) — 90nm</option>
                  <option value="Vaccinia_PexaVec">Vaccinia Virus (Pexa-Vec) — 250nm, Complement Resistant</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Delivery Route</label>
                <select
                  value={pkpdRoute}
                  onChange={(e) => setPkpdRoute(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="INTRATUMORAL_DIRECT">Intratumoral Direct Injection (I.T. Bolus)</option>
                  <option value="INTRAVENOUS_SYSTEMIC">Systemic Intravenous Infusion (I.V. Transvascular)</option>
                </select>
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Tumor Radius ($R_{'{tumor}'}$):</span>
                  <span className="text-cyan-400 font-mono font-bold">{pkpdRadius} mm (Vol: {(4/3 * Math.PI * Math.pow(pkpdRadius/10, 3)).toFixed(1)} cm³)</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="40"
                  step="1"
                  value={pkpdRadius}
                  onChange={(e) => setPkpdRadius(parseFloat(e.target.value))}
                  className="w-full accent-cyan-500"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Desmoplastic Stroma Factor:</span>
                  <span className="text-cyan-400 font-mono font-bold">
                    {pkpdDesmoplasia} ({pkpdDesmoplasia > 0.7 ? 'PDAC Dense' : pkpdDesmoplasia > 0.4 ? 'Moderate' : 'Low/Soft'})
                  </span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="0.95"
                  step="0.05"
                  value={pkpdDesmoplasia}
                  onChange={(e) => setPkpdDesmoplasia(parseFloat(e.target.value))}
                  className="w-full accent-cyan-500"
                />
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Reduces effective diffusivity ($D_{'{eff}'} = D_0 \cdot (1 - \text{factor})^{'{1.5}'}$) via collagen barriers.
                </p>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Pre-Existing Neutralizing Antibodies</label>
                <div className="grid grid-cols-4 gap-1">
                  {['NONE', 'LOW', 'MODERATE', 'HIGH'].map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setPkpdSerology(lvl)}
                      className={`py-1 text-[11px] font-bold rounded border ${
                        pkpdSerology === lvl
                          ? 'bg-cyan-600 text-white border-cyan-500'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Initial Dose (TCID50)</label>
                  <input
                    type="text"
                    value={pkpdDose}
                    onChange={(e) => setPkpdDose(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Simulation Hours</label>
                  <select
                    value={pkpdHours}
                    onChange={(e) => setPkpdHours(parseInt(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="48">48 Hours</option>
                    <option value="72">72 Hours</option>
                    <option value="96">96 Hours</option>
                    <option value="120">120 Hours</option>
                  </select>
                </div>
              </div>

              <button
                onClick={runPkpdSimulation}
                disabled={pkpdLoading}
                className="w-full py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold rounded-lg transition-all shadow-lg shadow-cyan-900/30 flex items-center justify-center gap-2"
              >
                {pkpdLoading ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    <span>Integrating Diffusion Equations...</span>
                  </>
                ) : (
                  <>
                    <span>⚡</span>
                    <span>Solve Intratumoral Diffusion (PK/PD)</span>
                  </>
                )}
              </button>
            </div>

            {/* Simulation Results Column */}
            <div className="lg:col-span-2 space-y-4">
              {pkpdResult ? (
                <>
                  {/* Metric Strip */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
                      <div className="text-[10px] uppercase font-bold text-slate-500">Tumor Cell Lysis</div>
                      <div className="text-2xl font-black text-emerald-400 mt-1 font-mono">
                        {pkpdResult.tumor_cell_kill_pct}%
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Direct + bystander kill</div>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
                      <div className="text-[10px] uppercase font-bold text-slate-500">Volume Reduction</div>
                      <div className="text-2xl font-black text-cyan-400 mt-1 font-mono">
                        -{pkpdResult.expected_volume_reduction_pct}%
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Post-clearance shrinkage</div>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
                      <div className="text-[10px] uppercase font-bold text-slate-500">Bystander Radius</div>
                      <div className="text-2xl font-black text-amber-400 mt-1 font-mono">
                        {pkpdResult.bystander_killing_radius_mm} <span className="text-xs">mm</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Zone with ≥50% kill</div>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
                      <div className="text-[10px] uppercase font-bold text-slate-500">Re-Dosing Interval</div>
                      <div className="text-2xl font-black text-purple-400 mt-1 font-mono">
                        {pkpdResult.recommended_redosing_interval_days} <span className="text-xs">days</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Clearance half-life</div>
                    </div>
                  </div>

                  {/* Clinical Guidance Banner */}
                  <div className="p-3 bg-cyan-950/30 border border-cyan-800/60 rounded-xl text-xs text-cyan-200 flex items-start gap-2">
                    <span className="text-base">💡</span>
                    <div>
                      <span className="font-bold">Clinical Translational Insight:</span> {pkpdResult.clinical_guidance}
                    </div>
                  </div>

                  {/* Radial Depth Penetration Profile */}
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                          Radial Spatiotemporal Penetration Profile
                        </h3>
                        <p className="text-[10px] text-slate-400">
                          15 concentric shells from Tumor Core (0 mm) to Infiltrating Margin ({pkpdResult.tumor_radius_mm} mm)
                        </p>
                      </div>
                      <a
                        href={api.getPkpdExportCsvUrl(pkpdResult.simulation_id)}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold rounded border border-slate-700 flex items-center gap-1.5 transition-colors"
                      >
                        <span>📥</span> Export CSV
                      </a>
                    </div>

                    <div className="space-y-2">
                      {pkpdResult.spatial_depth_profile.map((shell) => (
                        <div key={shell.shell_index} className="flex items-center gap-2 text-xs">
                          <span className="w-16 font-mono text-[11px] text-slate-400">
                            {shell.radius_mm} mm
                          </span>
                          <div className="flex-1 bg-slate-950 h-5 rounded-md overflow-hidden flex relative border border-slate-800/60">
                            {/* Viable cells bar */}
                            <div
                              className="h-full bg-emerald-600 transition-all"
                              style={{ width: `${shell.viability_pct}%` }}
                            />
                            {/* Lysed cells fill */}
                            <div
                              className="h-full bg-rose-900/60 transition-all flex-1"
                            />
                            <div className="absolute inset-0 flex items-center justify-between px-2 text-[10px] font-mono text-white/90">
                              <span>Viability: {shell.viability_pct}%</span>
                              <span className="text-cyan-300">Virions: {shell.virion_density_tcid50} /mm³</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 72h Timeline Dynamics */}
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-2">
                      {pkpdResult.simulation_hours}h Oncolytic Lysis Dynamics Timeline
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs text-slate-300">
                        <thead className="bg-slate-950 text-[10px] uppercase font-mono text-slate-500 border-b border-slate-800">
                          <tr>
                            <th className="py-2 px-3">Time</th>
                            <th className="py-2 px-3">Viable Cells</th>
                            <th className="py-2 px-3">Viability %</th>
                            <th className="py-2 px-3">Infected Cells</th>
                            <th className="py-2 px-3">Active Virions</th>
                            <th className="py-2 px-3">Dead Lysed Cells</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 font-mono text-[11px]">
                          {pkpdResult.timeline.map((t, idx) => (
                            <tr key={idx} className="hover:bg-slate-800/50">
                              <td className="py-1.5 px-3 font-bold text-cyan-400">{t.time_hours}h</td>
                              <td className="py-1.5 px-3 text-slate-300">{t.viable_cells.toLocaleString()}</td>
                              <td className="py-1.5 px-3">
                                <span className={`px-1.5 py-0.5 rounded ${
                                  t.viable_pct > 70 ? 'bg-emerald-950 text-emerald-400' :
                                  t.viable_pct > 30 ? 'bg-amber-950 text-amber-400' :
                                  'bg-rose-950 text-rose-400'
                                }`}>
                                  {t.viable_pct}%
                                </span>
                              </td>
                              <td className="py-1.5 px-3 text-amber-300">{t.infected_cells.toLocaleString()}</td>
                              <td className="py-1.5 px-3 text-cyan-300">{t.free_virions}</td>
                              <td className="py-1.5 px-3 text-rose-400">{t.dead_lysed_cells.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center text-slate-400 space-y-3">
                  <div className="text-4xl">🌊</div>
                  <h3 className="text-sm font-bold text-slate-200">No Simulation Executed Yet</h3>
                  <p className="text-xs max-w-md mx-auto text-slate-500">
                    Select a curated scenario above or adjust tumor radius, viral chassis, and desmoplastic stroma parameters, then click <strong>Solve Intratumoral Diffusion</strong> to compute the spatiotemporal reaction-diffusion transport.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
