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
  const [activeTab, setActiveTab] = useState('recommend'); // 'recommend' | 'blueprint' | 'database'

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

  const TabButton = ({ id, label }) => (
    <button onClick={() => { setActiveTab(id); if (id === 'database' && !viralDb) fetchViralDb(); }}
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
    </div>
  );
}
