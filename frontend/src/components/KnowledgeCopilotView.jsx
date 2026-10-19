import React, { useState } from 'react';
import { FileCheck, Send, BookOpen, ExternalLink, ShieldAlert, Sparkles, HelpCircle, CheckCircle2, ArrowRight, X } from 'lucide-react';
import { api } from '../services/api';

export default function KnowledgeCopilotView({ isOpen, onClose, selectedSample }) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: "Welcome to the Genomic Research Co-Pilot. I am grounded strictly in the biomedical knowledge graph and verified peer-reviewed literature (PubMed, NEJM, Nature, Lancet). All claims cite primary PMIDs and include confidence intervals. What research hypothesis or locus would you like to explore?",
      citations: [],
      uncertainty: "Grounded on primary biological literature & clinical trials."
    }
  ]);

  React.useEffect(() => {
    if (selectedSample?.sample_id && isOpen) {
      api.getChatHistory(selectedSample.sample_id).then(res => {
        if (res && res.history && res.history.length > 0) {
          const loadedMessages = res.history.map(m => ({
            role: m.role,
            text: m.content,
            citations: m.citations || []
          }));
          // Prepend welcome message
          setMessages([
            {
              role: 'assistant',
              text: "Welcome to the Genomic Research Co-Pilot. I am grounded strictly in the biomedical knowledge graph and verified peer-reviewed literature (PubMed, NEJM, Nature, Lancet). All claims cite primary PMIDs and include confidence intervals. What research hypothesis or locus would you like to explore?",
              citations: [],
              uncertainty: "Grounded on primary biological literature & clinical trials."
            },
            ...loadedMessages
          ]);
        }
      }).catch(console.error);
    }
  }, [selectedSample?.sample_id, isOpen]);

  const presetQueries = [
    "Explain the CCR5-Δ32 mechanism.",
    "Why must guide design be personalized?",
    "What are the oncogenic risks of c-MYC?"
  ];

  const handleSend = async (queryText) => {
    const textToSend = queryText || query;
    if (!textToSend.trim()) return;

    const userMsg = { role: 'user', text: textToSend };
    setMessages((prev) => [...prev, userMsg]);
    setQuery('');
    setLoading(true);

    try {
      const res = await api.chatCopilot(textToSend, selectedSample?.sample_id);
      const assistantMsg = {
        role: 'assistant',
        text: res.answer,
        status: res.status,
        confidence: res.confidence_level,
        uncertainty: res.uncertainty_statement,
        citations: res.citations || [],
        trials: res.matched_clinical_trials || []
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: 'Error contacting biomedical knowledge service. Please check network connectivity.',
          citations: []
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-96 md:w-[480px] bg-slate-900 border-l border-slate-700 shadow-2xl z-[60] flex flex-col transform transition-transform duration-300">
      {/* Header Banner */}
      <div className="bg-slate-900 border-b border-slate-800 p-4 shrink-0 flex items-start justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 bg-cyan-950/60 text-cyan-400 border border-cyan-800/60 px-2 py-0.5 rounded text-[10px] font-mono mb-2">
            <FileCheck className="w-3 h-3" /> AI Research Co-Pilot
          </div>
          <h2 className="text-sm font-bold text-white tracking-tight">
            Grounded Literature Synthesis
          </h2>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
        </button>
      </div>
      {/* Preset Research Chips */}
      <div className="px-4 py-2 space-y-2 shrink-0">
        <span className="text-xs font-semibold text-slate-400">Prompts:</span>
        <div className="flex flex-wrap gap-2">
          {presetQueries.map((pq, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(pq)}
              className="text-left bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/50 text-slate-300 hover:text-white px-2 py-1 rounded text-[10px] transition-all flex items-center gap-1"
            >
              <span>{pq}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Thread */}
      <div className="flex-1 overflow-hidden flex flex-col bg-slate-950/50">
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {messages.map((m, idx) => {
            const isUser = m.role === 'user';
            const isBlocked = m.status === 'BLOCKED_BY_SAFETY_GUARDRAIL';

            return (
              <div
                key={idx}
                className={`flex gap-3 text-xs leading-relaxed ${
                  isUser ? 'justify-end' : 'justify-start'
                }`}
              >
                {!isUser && (
                  <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-800/80 flex items-center justify-center shrink-0 text-cyan-400">
                    <BookOpen className="w-4 h-4" />
                  </div>
                )}
                <div
                  className={`max-w-3xl rounded-xl p-4 shadow-md ${
                    isUser
                      ? 'bg-cyan-600 text-white font-medium'
                      : isBlocked
                      ? 'bg-rose-950/70 border border-rose-800 text-rose-200'
                      : 'bg-slate-950 border border-slate-800/90 text-slate-200'
                  }`}
                >
                  {/* Message Body */}
                  <div className="whitespace-pre-line text-xs leading-relaxed space-y-2">
                    {m.text}
                  </div>

                  {/* Uncertainty & Confidence Pill */}
                  {m.uncertainty && (
                    <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center gap-2 text-[11px] text-slate-400">
                      <span className="font-semibold text-cyan-400">Validation Note:</span>
                      <span>{m.uncertainty}</span>
                    </div>
                  )}

                  {/* Matched Clinical Trials */}
                  {m.trials && m.trials.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-slate-800/80 space-y-1.5">
                      <span className="text-[11px] font-bold text-indigo-400 block">Related Clinical Trials:</span>
                      {m.trials.map((tr, tIdx) => (
                        <div key={tIdx} className="bg-slate-900 p-2 rounded border border-slate-800 text-[11px]">
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-cyan-300">{tr.nct_id}</span>
                            <span className="bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded text-[10px]">{tr.phase} &bull; {tr.status}</span>
                          </div>
                          <p className="text-slate-300 mt-1">{tr.title}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Citations Expandable Cards */}
                  {m.citations && m.citations.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-800 space-y-2">
                      <div className="flex items-center gap-1 text-[11px] font-bold text-cyan-400">
                        <BookOpen className="w-3 h-3" />
                        <span>Peer-Reviewed Primary Citations ({m.citations.length})</span>
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        {m.citations.map((c, cIdx) => (
                          <div
                            key={cIdx}
                            className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800/80 text-[11px] space-y-1"
                          >
                            <div className="font-bold text-slate-100 flex items-start justify-between gap-2">
                              <span>{c.title}</span>
                              <a
                                href={`https://doi.org/${c.doi}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-0.5 shrink-0"
                              >
                                DOI <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            </div>
                            <div className="text-slate-400 text-[10px]">
                              {c.authors.substring(0, 75)}... &bull; <em className="text-slate-300">{c.journal}</em> ({c.year})
                            </div>
                            <div className="flex items-center gap-2 pt-1">
                              <span className="font-mono text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded">
                                PMID: {c.pmid}
                              </span>
                              <span className="text-[10px] text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/40">
                                {c.evidence_level}
                              </span>
                            </div>
                            <p className="text-slate-300 text-[11px] pt-1">
                              <strong className="text-slate-400">Key Finding:</strong> {c.summary}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {loading && (
            <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
              Consulting biomedical knowledge graph & retrieving peer-reviewed evidence...
            </div>
          )}
        </div>

        {/* Query Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend(query);
          }}
          className="flex items-center gap-2 pt-3 border-t border-slate-800"
        >
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask a scientific research question grounded on literature and clinical trials..."
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-all font-sans"
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold px-5 py-3 rounded-xl text-xs transition-all shadow-lg shadow-cyan-600/20 flex items-center gap-2 shrink-0"
          >
            <Send className="w-3.5 h-3.5" /> Submit Query
          </button>
        </form>
      </div>

    </div>
  );
}
