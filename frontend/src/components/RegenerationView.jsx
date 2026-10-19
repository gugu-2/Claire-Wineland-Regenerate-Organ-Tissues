import React, { useState, useEffect } from 'react';
import { Sparkles, AlertTriangle, ShieldCheck, CheckCircle2, Flame, Heart, Brain, Activity, ArrowRight, ExternalLink } from 'lucide-react';
import { api } from '../services/api';

export default function RegenerationView({ protocols, customEvaluation, setCustomEvaluation, onProceedToCopilot }) {
  const [selectedProtocol, setSelectedProtocol] = useState(protocols?.[0] || null);
  const [activeCocktailIndex, setActiveCocktailIndex] = useState(0);
  const [customFactors, setCustomFactors] = useState(['OCT4', 'SOX2', 'KLF4']);
  const [customDelivery, setCustomDelivery] = useState('Sendai Virus (Non-Integrative RNA)');
  const [evaluating, setEvaluating] = useState(false);

  useEffect(() => {
    if (protocols && protocols.length > 0 && !selectedProtocol) {
      setSelectedProtocol(protocols[0]);
    }
  }, [protocols]);

  // Evaluate cocktail whenever custom factors or delivery changes
  const runCocktailEvaluation = async (factors, delivery, lineage) => {
    setEvaluating(true);
    try {
      const res = await api.evaluateRegeneration({
        target_lineage: lineage || selectedProtocol?.target_lineage || 'Dopaminergic Neurons',
        selected_factors: factors,
        delivery_modality: delivery
      });
      setCustomEvaluation(res);
    } catch (e) {
      console.error(e);
    } finally {
      setEvaluating(false);
    }
  };

  useEffect(() => {
    runCocktailEvaluation(customFactors, customDelivery, selectedProtocol?.target_lineage);
  }, [customFactors, customDelivery, selectedProtocol]);

  const toggleFactor = (factor) => {
    if (customFactors.includes(factor)) {
      setCustomFactors(customFactors.filter((f) => f !== factor));
    } else {
      setCustomFactors([...customFactors, factor]);
    }
  };

  const currentCocktail = selectedProtocol?.reprogramming_cocktails?.[activeCocktailIndex];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 px-2.5 py-1 rounded-full text-xs font-mono mb-3">
            <Sparkles className="w-3.5 h-3.5" /> Module 7: Stem Cell Differentiation & Tumorigenic Risk Screening
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Regenerative Reprogramming Pathways & Oncogene Safeguards
          </h2>
          <p className="text-sm text-slate-300 mt-2 leading-relaxed">
            Models lineage reprogramming from somatic or pluripotent substrates toward clinical target tissues.
            Actively screens transcription factor cocktails for <strong>oncogene reactivation (e.g. c-MYC)</strong>,
            insertional mutagenesis, and teratoma formation risks.
          </p>
        </div>
      </div>

      {/* Protocol Selection Tabs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {protocols?.map((p) => {
          const isSelected = selectedProtocol?.protocol_id === p.protocol_id;
          const isNeuro = p.target_lineage.includes('Dopaminergic');
          const isCardio = p.target_lineage.includes('Cardio');
          const isBeta = p.target_lineage.includes('Beta');

          return (
            <div
              key={p.protocol_id}
              onClick={() => {
                setSelectedProtocol(p);
                setActiveCocktailIndex(0);
              }}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                isSelected
                  ? 'border-emerald-500 bg-emerald-950/20 ring-1 ring-emerald-500/40 shadow-lg'
                  : 'border-slate-800 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-800/40'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-lg ${
                  isNeuro ? 'bg-cyan-950 text-cyan-400' :
                  isCardio ? 'bg-rose-950 text-rose-400' : 'bg-amber-950 text-amber-400'
                }`}>
                  {isNeuro && <Brain className="w-5 h-5" />}
                  {isCardio && <Heart className="w-5 h-5" />}
                  {isBeta && <Activity className="w-5 h-5" />}
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-200">{p.target_lineage}</h4>
                  <p className="text-[11px] text-slate-400">{p.clinical_indication}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Workspace Grid */}
      {selectedProtocol && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Protocol Details & Timeline */}
          <div className="lg:col-span-2 space-y-6">
            {/* Reprogramming Approach Comparison */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5">
              <h3 className="text-sm font-bold text-white flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                <span>Reprogramming Modality & Delivery Evaluation</span>
                <span className="text-xs font-mono text-slate-400">{selectedProtocol.approach}</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                {selectedProtocol.reprogramming_cocktails?.map((c, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveCocktailIndex(idx)}
                    className={`text-left p-3 rounded-lg border transition-all ${
                      activeCocktailIndex === idx
                        ? 'border-emerald-500 bg-emerald-950/30'
                        : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded font-bold uppercase tracking-wider bg-slate-800 text-slate-300">
                        {c.risk_level} RISK
                      </span>
                      {c.recommended && (
                        <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-0.5">
                          <CheckCircle2 className="w-3 h-3" /> Recommended
                        </span>
                      )}
                    </div>
                    <div className="font-bold text-xs text-slate-200 mt-2 line-clamp-2">{c.cocktail_name}</div>
                  </button>
                ))}
              </div>

              {currentCocktail && (
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-slate-400 text-[11px]">Delivery Vehicle:</span>
                      <p className="font-semibold text-slate-200">{currentCocktail.delivery_method}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400 text-[11px]">Tumorigenic Score:</span>
                      <p className={`font-mono font-bold text-sm ${
                        currentCocktail.tumorigenic_risk_score < 0.2 ? 'text-emerald-400' :
                        currentCocktail.tumorigenic_risk_score < 0.5 ? 'text-amber-400' : 'text-rose-400'
                      }`}>
                        {currentCocktail.tumorigenic_risk_score} / 1.00
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-2 border-t border-slate-800/80">
                    <div>
                      <span className="text-slate-400">Teratoma Risk Profile:</span>
                      <p className="text-slate-300">{currentCocktail.teratoma_risk}</p>
                    </div>
                    <div>
                      <span className="text-slate-400">Oncogene Reactivation Status:</span>
                      <p className="text-slate-300">{currentCocktail.oncogene_reactivation}</p>
                    </div>
                  </div>

                  <div className="bg-slate-900/60 p-2.5 rounded border border-slate-800 text-[11px] text-slate-300">
                    <strong>Preclinical Note:</strong> {currentCocktail.notes}
                  </div>
                </div>
              )}
            </div>

            {/* Differentiation Stage Milestones */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5">
              <h3 className="text-sm font-bold text-white mb-4">
                Stage-wise Differentiation Timeline & Quality Control Markers
              </h3>
              <div className="space-y-3">
                {selectedProtocol.differentiation_timeline?.map((step, idx) => (
                  <div key={idx} className="flex gap-4 items-start p-3 bg-slate-950/60 rounded-lg border border-slate-800/80">
                    <div className="bg-emerald-950 text-emerald-400 px-2.5 py-1 rounded text-xs font-mono font-bold shrink-0 border border-emerald-800/60">
                      {step.day_range}
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="font-bold text-slate-200">{step.stage}</div>
                      <div className="flex flex-wrap gap-1.5 my-1">
                        {step.key_markers.map((m, mIdx) => (
                          <span key={mIdx} className="bg-slate-800 text-cyan-300 px-1.5 py-0.5 rounded font-mono text-[10px]">
                            {m}
                          </span>
                        ))}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        <strong className="text-slate-300">Mandatory QC:</strong> {step.critical_qc}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Col: Custom Cocktail Risk Screener */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
                <Flame className="w-4 h-4 text-amber-400" /> Interactive Oncogenic Risk Screener
              </h3>

              {/* Delivery Modality Select */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Vector / Delivery Platform</label>
                <select
                  value={customDelivery}
                  onChange={(e) => setCustomDelivery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="Sendai Virus (Non-Integrative RNA)">Sendai Virus (Non-Integrative RNA)</option>
                  <option value="Chemically Defined Small Molecules">Chemically Defined Small Molecules / Growth Factors</option>
                  <option value="Synthetic Modified mRNA">Synthetic Modified mRNA Transfection</option>
                  <option value="Integrative Lentivirus">Integrative Lentiviral Transduction</option>
                  <option value="Retroviral Integration (Classical OSKM)">Retroviral Integration (Classical OSKM)</option>
                </select>
              </div>

              {/* Quick Presets */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Cocktail Presets</label>
                <div className="grid grid-cols-3 gap-1 mb-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCustomFactors(['OCT4', 'SOX2', 'KLF4']);
                      setCustomDelivery('Sendai Virus (Non-Integrative RNA)');
                    }}
                    className="p-1 rounded text-[10px] font-mono font-semibold bg-emerald-950/60 border border-emerald-800 text-emerald-300 hover:bg-emerald-900/60 text-center"
                    title="OSK - Safe Sendai RNA"
                  >
                    OSK (Safe)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomFactors(['OCT4', 'SOX2', 'KLF4', 'c-MYC']);
                      setCustomDelivery('Retroviral Integration (Classical OSKM)');
                    }}
                    className="p-1 rounded text-[10px] font-mono font-semibold bg-rose-950/60 border border-rose-800 text-rose-300 hover:bg-rose-900/60 text-center"
                    title="OSKM - Classical Retrovirus (High Oncogene Risk)"
                  >
                    OSKM (c-MYC)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomFactors(['ASCL1', 'NURR1', 'LMX1A']);
                      setCustomDelivery('Synthetic Modified mRNA');
                    }}
                    className="p-1 rounded text-[10px] font-mono font-semibold bg-cyan-950/60 border border-cyan-800 text-cyan-300 hover:bg-cyan-900/60 text-center"
                    title="BAM - Direct Dopaminergic Neurons"
                  >
                    BAM (Neurons)
                  </button>
                </div>
              </div>

              {/* Factor Toggles */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">Toggle Transcription Factors</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {['OCT4', 'SOX2', 'KLF4', 'c-MYC', 'LIN28', 'ASCL1', 'NURR1', 'LMX1A'].map((factor) => {
                    const isSelected = customFactors.includes(factor);
                    const isOncogene = factor === 'c-MYC' || factor === 'LIN28';
                    return (
                      <button
                        key={factor}
                        onClick={() => toggleFactor(factor)}
                        className={`p-2 rounded text-xs font-mono font-bold flex items-center justify-between border transition-all ${
                          isSelected
                            ? isOncogene
                              ? 'bg-rose-950/80 text-rose-300 border-rose-600'
                              : 'bg-emerald-950/80 text-emerald-300 border-emerald-600'
                            : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <span>{factor}</span>
                        {isOncogene && <Flame className="w-3 h-3 text-rose-400" />}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-slate-500 mt-1.5">
                  Click factors like <strong>c-MYC</strong> or <strong>LIN28</strong> to observe real-time risk impact.
                </p>
              </div>

              {/* Dynamic Risk Display */}
              {customEvaluation && (
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Evaluated Tumorigenic Risk:</span>
                    <span className={`font-mono font-bold text-base ${
                      customEvaluation.risk_color === 'emerald' ? 'text-emerald-400' :
                      customEvaluation.risk_color === 'amber' ? 'text-amber-400' : 'text-rose-400'
                    }`}>
                      {customEvaluation.tumorigenic_risk_score}
                    </span>
                  </div>

                  {/* Visual Progress Bar */}
                  <div className="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`h-2.5 rounded-full transition-all duration-300 ${
                        customEvaluation.risk_color === 'emerald' ? 'bg-emerald-500' :
                        customEvaluation.risk_color === 'amber' ? 'bg-amber-500' : 'bg-rose-500'
                      }`}
                      style={{ width: `${customEvaluation.tumorigenic_risk_score * 100}%` }}
                    ></div>
                  </div>

                  <div className={`p-2.5 rounded text-xs font-semibold ${
                    customEvaluation.risk_color === 'emerald' ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/40' :
                    customEvaluation.risk_color === 'amber' ? 'bg-amber-950/60 text-amber-300 border border-amber-800/40' :
                    'bg-rose-950/60 text-rose-300 border border-rose-800/40'
                  }`}>
                    {customEvaluation.clinical_verdict}
                  </div>

                  {/* Oncogene Warnings */}
                  {customEvaluation.oncogene_flags?.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-slate-800">
                      {customEvaluation.oncogene_flags.map((flag, fIdx) => (
                        <div key={fIdx} className="bg-rose-950/40 border border-rose-800/40 rounded p-2 text-[11px] text-rose-200">
                          <strong className="text-rose-400 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> {flag.factor}: {flag.risk_type}
                          </strong>
                          <p className="mt-1 text-slate-300 leading-snug">{flag.warning}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Safety Mitigations */}
                  {customEvaluation.safety_recommendations?.length > 0 && (
                    <div className="text-[11px] text-slate-300 pt-2 border-t border-slate-800">
                      <span className="font-semibold text-emerald-400 block mb-1">Safety Recommendations:</span>
                      <ul className="list-disc pl-4 space-y-1 text-slate-400">
                        {customEvaluation.safety_recommendations.map((rec, rIdx) => (
                          <li key={rIdx}>{rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Step-by-Step Navigation Bar */}
      {onProceedToCopilot && (
        <div className="flex justify-end pt-2">
          <button
            onClick={onProceedToCopilot}
            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-5 py-2.5 rounded-lg text-xs font-bold transition-all shadow-lg shadow-emerald-600/20 flex items-center gap-2"
          >
            Proceed to AI Research Co-Pilot <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
