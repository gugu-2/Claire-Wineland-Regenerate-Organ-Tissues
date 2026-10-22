import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  Search,
  MapPin,
  ExternalLink,
  ShieldCheck,
  Building,
  Activity,
  Filter,
  Download,
  Copy,
  Check,
  Star,
  Sparkles,
  Info,
  Calendar,
  Layers,
  ArrowRight
} from 'lucide-react';

export default function ClinicalTrialsMatcher({
  targetGene = 'KRAS',
  targetMutation = 'G12D',
  cancerType = 'Pancreatic Ductal Adenocarcinoma',
  patientZip = '10001',
  patientVariants = [],
  onSelectTrial = null
}) {
  const [gene, setGene] = useState(targetGene || 'KRAS');
  const [mutation, setMutation] = useState(targetMutation || 'G12D');
  const [selectedCancer, setSelectedCancer] = useState(cancerType || 'Pancreatic Ductal Adenocarcinoma');
  const [zipCode, setZipCode] = useState(patientZip || '10001');
  const [radiusMiles, setRadiusMiles] = useState(150);
  const [selectedPhases, setSelectedPhases] = useState(['Phase 2', 'Phase 3']);
  const [statusFilter, setStatusFilter] = useState('RECRUITING');

  const [loading, setLoading] = useState(false);
  const [searchResult, setSearchResult] = useState(null);
  const [selectedTrialDetail, setSelectedTrialDetail] = useState(null);
  const [copiedNcts, setCopiedNcts] = useState(false);
  const [copiedSingleNct, setCopiedSingleNct] = useState(null);

  useEffect(() => {
    if (targetGene) setGene(targetGene);
    if (targetMutation) setMutation(targetMutation);
    if (cancerType) setSelectedCancer(cancerType);
  }, [targetGene, targetMutation, cancerType]);

  const executeSearch = async () => {
    setLoading(true);
    try {
      const payload = {
        gene: gene.trim(),
        mutation: mutation.trim(),
        cancer_type: selectedCancer,
        patient_zip: zipCode.trim() || '10001',
        radius_miles: parseFloat(radiusMiles),
        phases: selectedPhases,
        status: statusFilter,
        patient_variants: patientVariants
      };
      const res = await api.searchClinicalTrials(payload);
      if (res && res.status === 'success') {
        setSearchResult(res);
      }
    } catch (err) {
      console.error('Error fetching clinical trials:', err);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    executeSearch();
  }, []);

  const handleCopyAllNcts = () => {
    if (!searchResult || !searchResult.trials) return;
    const ncts = searchResult.trials.map(t => t.nct_id).join(', ');
    navigator.clipboard.writeText(ncts);
    setCopiedNcts(true);
    setTimeout(() => setCopiedNcts(false), 2500);
  };

  const handleCopySingleNct = (nctId) => {
    navigator.clipboard.writeText(nctId);
    setCopiedSingleNct(nctId);
    setTimeout(() => setCopiedSingleNct(null), 2000);
  };

  const handleDownloadCsv = () => {
    if (!searchResult || !searchResult.trials) return;
    const lines = ["NCT_ID,Title,Phase,Status,Match_Score,Nearest_Site,Distance_Miles,Sponsor,URL"];
    searchResult.trials.forEach(t => {
      const cleanTitle = (t.title || '').replace(/"/g, '""');
      const cleanSponsor = (t.sponsor || '').replace(/"/g, '""');
      lines.push(`"${t.nct_id}","${cleanTitle}","${t.phase}","${t.overall_status}",${t.match_score},"${t.nearest_site_city}",${t.nearest_site_distance_miles},"${cleanSponsor}","${t.url}"`);
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${gene}_${mutation}_Matching_Clinical_Trials.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Search Header Panel */}
      <div className="bg-[#0b101b] border border-slate-800 rounded-2xl p-5 md:p-6 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-blue-950/80 border border-blue-800 text-blue-400">
                <Search className="w-4 h-4" />
              </span>
              <h2 className="text-base font-bold text-white tracking-wide">
                Precision Oncology Clinical Trial Finder (Spec 09)
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Live matching against ClinicalTrials.gov API v2 with patient-centric Haversine geocoding &amp; genomic variant scoring.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start md:self-auto">
            <span className="px-2.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-800/80 text-emerald-400 text-xs font-mono font-medium flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" /> API v2 Verified
            </span>
          </div>
        </div>

        {/* Input Parameters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 text-xs">
          <div>
            <label className="text-slate-400 font-semibold block mb-1 uppercase tracking-wider text-[10px]">Target Gene:</label>
            <input
              type="text"
              value={gene}
              onChange={(e) => setGene(e.target.value.toUpperCase())}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:border-cyan-500 focus:outline-none"
              placeholder="e.g. KRAS, BRAF, HBB"
            />
          </div>

          <div>
            <label className="text-slate-400 font-semibold block mb-1 uppercase tracking-wider text-[10px]">Oncogenic Mutation:</label>
            <input
              type="text"
              value={mutation}
              onChange={(e) => setMutation(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:border-cyan-500 focus:outline-none"
              placeholder="e.g. G12D, V600E, E6V"
            />
          </div>

          <div>
            <label className="text-slate-400 font-semibold block mb-1 uppercase tracking-wider text-[10px]">Cancer Diagnosis:</label>
            <select
              value={selectedCancer}
              onChange={(e) => setSelectedCancer(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white text-xs focus:border-cyan-500 focus:outline-none truncate"
            >
              <option value="Pancreatic Ductal Adenocarcinoma">Pancreatic Ductal Adenocarcinoma</option>
              <option value="Non-Small Cell Lung Cancer">Non-Small Cell Lung Cancer (NSCLC)</option>
              <option value="Colorectal Adenocarcinoma">Colorectal Adenocarcinoma</option>
              <option value="Gastric / GEJ Cancer">Gastric / GEJ Cancer</option>
              <option value="Sickle Cell Disease">Sickle Cell Disease (HBB)</option>
              <option value="Duchenne Muscular Dystrophy">Duchenne Muscular Dystrophy</option>
              <option value="Diffuse Large B-Cell Lymphoma">Diffuse Large B-Cell Lymphoma</option>
            </select>
          </div>

          <div>
            <label className="text-slate-400 font-semibold block mb-1 uppercase tracking-wider text-[10px]">Patient ZIP Code:</label>
            <input
              type="text"
              value={zipCode}
              onChange={(e) => setZipCode(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:border-cyan-500 focus:outline-none"
              placeholder="e.g. 10001, 94305"
            />
          </div>

          <div>
            <label className="text-slate-400 font-semibold block mb-1 uppercase tracking-wider text-[10px]">Travel Radius:</label>
            <select
              value={radiusMiles}
              onChange={(e) => setRadiusMiles(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono text-xs focus:border-cyan-500 focus:outline-none"
            >
              <option value={50}>Within 50 miles</option>
              <option value={100}>Within 100 miles</option>
              <option value={150}>Within 150 miles</option>
              <option value={300}>Within 300 miles</option>
              <option value={1000}>Nationwide (1,000 mi)</option>
            </select>
          </div>
        </div>

        {/* Phase Checkboxes & Search Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-400 text-[11px] font-semibold mr-1">Phases:</span>
            {['Phase 1', 'Phase 2', 'Phase 3', 'Phase 4'].map((ph) => {
              const active = selectedPhases.includes(ph);
              return (
                <button
                  key={ph}
                  type="button"
                  onClick={() => {
                    if (active) {
                      setSelectedPhases(selectedPhases.filter(p => p !== ph));
                    } else {
                      setSelectedPhases([...selectedPhases, ph]);
                    }
                  }}
                  className={`px-2.5 py-1 rounded text-[11px] font-mono transition-all border ${
                    active
                      ? 'bg-blue-950/80 border-blue-500 text-blue-300 font-bold'
                      : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {ph}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={executeSearch}
            disabled={loading}
            className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-cyan-600/20 flex items-center justify-center gap-2"
          >
            {loading ? <Activity className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            <span>{loading ? 'Querying ClinicalTrials.gov...' : 'Search Matching Trials'}</span>
          </button>
        </div>
      </div>

      {/* Results Header & Summary Banner */}
      {searchResult && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/50 border border-slate-800 px-4 py-3 rounded-xl text-xs">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
            <span className="text-slate-200">
              Found <strong className="text-white font-mono">{searchResult.total_found}</strong> relevant clinical trials &bull; <strong className="text-emerald-400 font-mono">{searchResult.within_radius_count}</strong> within {radiusMiles} miles of ZIP {zipCode}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyAllNcts}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all border border-slate-700"
            >
              {copiedNcts ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedNcts ? 'Copied NCT IDs' : 'Copy All NCT IDs'}</span>
            </button>
            <button
              onClick={handleDownloadCsv}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all border border-slate-700"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>
      )}

      {/* Trials List Cards */}
      <div className="space-y-4">
        {searchResult && searchResult.trials && searchResult.trials.length > 0 ? (
          searchResult.trials.map((trial) => (
            <div
              key={trial.nct_id}
              className={`bg-[#080d1a] border rounded-2xl p-5 space-y-3.5 transition-all hover:border-slate-700 ${
                trial.is_within_radius ? 'border-slate-800' : 'border-slate-800/40 opacity-80'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/60 flex items-center gap-1">
                      {trial.nct_id}
                      <button
                        onClick={() => handleCopySingleNct(trial.nct_id)}
                        className="text-slate-400 hover:text-white"
                        title="Copy NCT ID"
                      >
                        {copiedSingleNct === trial.nct_id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </span>

                    {trial.acronym && (
                      <span className="text-xs font-bold text-violet-300 bg-violet-950/60 px-2 py-0.5 rounded border border-violet-800/60 font-mono">
                        {trial.acronym}
                      </span>
                    )}

                    <span className="text-[11px] font-mono text-slate-300 bg-slate-800/80 px-2 py-0.5 rounded">
                      {trial.phase}
                    </span>

                    <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
                      {trial.overall_status}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-white leading-snug pt-1">
                    {trial.title}
                  </h3>
                </div>

                {/* Match Score Badge */}
                <div className="flex flex-col items-end shrink-0 bg-slate-950/80 border border-slate-800 p-2.5 rounded-xl">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Precision Match</span>
                  <div className="flex items-center gap-1 mt-0.5 text-amber-400 font-mono text-xs font-bold">
                    <Star className="w-3.5 h-3.5 fill-amber-400" />
                    <span>{(trial.match_score * 100).toFixed(0)}%</span>
                  </div>
                  <div className="flex gap-0.5 mt-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <span
                        key={s}
                        className={`w-1.5 h-1.5 rounded-full ${
                          s <= trial.match_score_stars ? 'bg-amber-400' : 'bg-slate-800'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Summary snippet */}
              <p className="text-xs text-slate-300 leading-relaxed">
                {trial.brief_summary}
              </p>

              {/* Matched Criteria Chips */}
              {trial.matched_terms && trial.matched_terms.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                  <span className="text-slate-500 font-medium mr-1">Matched Criteria:</span>
                  {trial.matched_terms.map((term, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded-md bg-cyan-950/50 border border-cyan-800/50 text-cyan-300 font-mono"
                    >
                      {term}
                    </span>
                  ))}
                </div>
              )}

              {/* Bottom Card Footer with Nearest Site & Actions */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-800/80 text-xs">
                <div className="flex items-center gap-2 text-slate-300 font-mono">
                  <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span>
                    Nearest Site: <strong className="text-white">{trial.nearest_site_city}</strong>
                    {trial.nearest_site_facility && ` (${trial.nearest_site_facility})`}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    trial.nearest_site_distance_miles <= radiusMiles
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : 'bg-slate-800 text-slate-400'
                  }`}>
                    {trial.nearest_site_distance_miles} miles away
                  </span>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    onClick={() => setSelectedTrialDetail(trial)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition-all border border-slate-700"
                  >
                    View Criteria &amp; Sites
                  </button>
                  <a
                    href={trial.url}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all"
                  >
                    <span>ClinicalTrials.gov</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-8 text-center space-y-2">
            <Info className="w-6 h-6 text-slate-500 mx-auto" />
            <h4 className="text-sm font-semibold text-slate-300">No trials found matching your filter criteria</h4>
            <p className="text-xs text-slate-500">
              Try widening your travel radius or expanding selected trial phases.
            </p>
          </div>
        )}
      </div>

      {/* Trial Detail Modal */}
      {selectedTrialDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0b101b] border border-slate-800 rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs font-mono font-bold text-cyan-400">{selectedTrialDetail.nct_id}</span>
                <h3 className="text-sm font-bold text-white mt-1 leading-snug">{selectedTrialDetail.title}</h3>
              </div>
              <button
                onClick={() => setSelectedTrialDetail(null)}
                className="text-slate-400 hover:text-white p-1 text-lg font-bold"
              >
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
                <div>
                  <span className="text-slate-400 text-[11px] block">Sponsor:</span>
                  <strong className="text-slate-200">{selectedTrialDetail.sponsor}</strong>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Phase &amp; Status:</span>
                  <strong className="text-slate-200">{selectedTrialDetail.phase} &bull; {selectedTrialDetail.overall_status}</strong>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-slate-200 mb-1">Inclusion &amp; Exclusion Criteria:</h4>
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/80 text-slate-300 leading-relaxed font-sans text-xs">
                  {selectedTrialDetail.full_eligibility_criteria}
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-slate-200 mb-1.5 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-rose-400" />
                  <span>Participating Clinical Trial Sites ({selectedTrialDetail.all_sites?.length || 0}):</span>
                </h4>
                <div className="space-y-2">
                  {selectedTrialDetail.all_sites?.map((site, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between font-mono"
                    >
                      <div>
                        <div className="text-white font-medium text-xs">{site.facility}</div>
                        <div className="text-[11px] text-slate-400">{site.city}, {site.state} {site.zip}</div>
                      </div>
                      <span className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-cyan-300 text-xs font-bold">
                        {site.distance_miles} mi
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 flex items-center justify-between bg-slate-950/60">
              <a
                href={selectedTrialDetail.url}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-semibold"
              >
                <span>View on ClinicalTrials.gov</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <button
                onClick={() => setSelectedTrialDetail(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
