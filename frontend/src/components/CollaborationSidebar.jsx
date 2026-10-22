import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useCollaborationWS } from '../hooks/useCollaborationWS';
import {
  Users,
  MessageSquare,
  FileText,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Pin,
  Send,
  X,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';

export default function CollaborationSidebar({
  sessionId = 'TUMOR_BOARD_01',
  activeGene = 'KRAS',
  sampleId = 'PT_PANCREAS_001',
  candidateGuides = [],
  currentUser = {
    user_id: 'USER_ONCO_01',
    display_name: 'Dr. Sarah Chen',
    role: 'Lead Oncologist',
    color: '#06b6d4'
  }
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('notes'); // 'users' | 'notes' | 'signoff' | 'chat'

  // Persistent notes and signoffs from API
  const [notes, setNotes] = useState([]);
  const [newNoteText, setNewNoteText] = useState('');
  const [signoffs, setSignoffs] = useState([]);
  const [selectedGuideForSignoff, setSelectedGuideForSignoff] = useState('');
  const [signoffDecision, setSignoffDecision] = useState('APPROVED');
  const [signoffRationale, setSignoffRationale] = useState('');
  const [chatInput, setChatInput] = useState('');

  // Live WebSocket hook
  const {
    isConnected,
    activeUsers,
    sharedNotepad,
    chatMessages,
    sendNotepadEdit,
    sendChatMessage
  } = useCollaborationWS({
    sessionId,
    userInfo: currentUser
  });

  // Load session notes & signoffs
  const loadSessionData = async () => {
    try {
      const [notesRes, signoffsRes] = await Promise.all([
        api.getCollaborationNotes(sessionId),
        api.getCollaborationSignoffs(sessionId)
      ]);
      if (notesRes && notesRes.notes) setNotes(notesRes.notes);
      if (signoffsRes && signoffsRes.signoffs) setSignoffs(signoffsRes.signoffs);
    } catch (e) {
      console.warn('Error loading collaboration records:', e);
    }
  };

  useEffect(() => {
    loadSessionData();
  }, [sessionId]);

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;
    try {
      const res = await api.addCollaborationNote(sessionId, {
        author_id: currentUser.user_id,
        author_name: currentUser.display_name,
        author_role: currentUser.role,
        content: newNoteText.trim()
      });
      if (res && res.status === 'success') {
        setNotes((prev) => [...prev, res.note]);
        setNewNoteText('');
      }
    } catch (err) {
      console.error('Error posting note:', err);
    }
  };

  const handleAddSignoff = async (e) => {
    e.preventDefault();
    const guideId = selectedGuideForSignoff || candidateGuides[0]?.guide_id || 'sgRNA_KRAS_01';
    try {
      const res = await api.addCollaborationSignoff(sessionId, {
        candidate_guide_id: guideId,
        signoff_decision: signoffDecision,
        reviewer_name: currentUser.display_name,
        reviewer_role: currentUser.role,
        rationale_notes: signoffRationale.trim() || 'Multidisciplinary tumor board consensus review.'
      });
      if (res && res.status === 'success') {
        setSignoffs((prev) => [res.signoff, ...prev]);
        setSignoffRationale('');
      }
    } catch (err) {
      console.error('Error recording consensus signoff:', err);
    }
  };

  const handleSendChat = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    sendChatMessage(chatInput.trim());
    setChatInput('');
  };

  return (
    <>
      {/* Floating Toggle Pill */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-20 lg:bottom-6 right-6 z-40 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white px-4 py-2.5 rounded-full shadow-2xl flex items-center gap-2 text-xs font-bold transition-all border border-cyan-400/40"
      >
        <Users className="w-4 h-4" />
        <span>Tumor Board Live</span>
        <span className="flex h-2 w-2 relative">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isConnected ? 'bg-emerald-400' : 'bg-amber-400'}`} />
          <span className={`relative inline-flex rounded-full h-2 w-2 ${isConnected ? 'bg-emerald-500' : 'bg-amber-500'}`} />
        </span>
        {activeUsers.length > 0 && (
          <span className="bg-cyan-950 text-cyan-300 font-mono text-[10px] px-1.5 py-0.5 rounded-full border border-cyan-700">
            {activeUsers.length}
          </span>
        )}
      </button>

      {/* Slide-out Sidebar Drawer */}
      {isOpen && (
        <div className="fixed top-0 right-0 h-full w-full sm:w-96 max-w-full z-50 bg-[#070b14] border-l border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
          {/* Header */}
          <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded bg-cyan-950 border border-cyan-800 text-cyan-400">
                <Users className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-xs font-bold text-white">Live Workspace (Spec 10)</h3>
                <div className="text-[10px] text-slate-400 font-mono">Session: {sessionId}</div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Connected Peers Summary */}
          <div className="px-4 py-2.5 bg-slate-900/60 border-b border-slate-800/80 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-slate-300 font-medium text-[11px]">
                {activeUsers.length || 1} Collaborators Online
              </span>
            </div>
            <span className="text-[10px] font-mono text-cyan-400">
              {currentUser.display_name} ({currentUser.role})
            </span>
          </div>

          {/* Navigation Tabs */}
          <div className="grid grid-cols-4 border-b border-slate-800 text-xs text-center font-medium">
            <button
              onClick={() => setActiveTab('notes')}
              className={`py-2.5 border-b-2 transition-all ${
                activeTab === 'notes'
                  ? 'border-cyan-400 text-cyan-300 bg-cyan-950/20'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Notes
            </button>
            <button
              onClick={() => setActiveTab('notepad')}
              className={`py-2.5 border-b-2 transition-all ${
                activeTab === 'notepad'
                  ? 'border-cyan-400 text-cyan-300 bg-cyan-950/20'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Shared Pad
            </button>
            <button
              onClick={() => setActiveTab('signoff')}
              className={`py-2.5 border-b-2 transition-all ${
                activeTab === 'signoff'
                  ? 'border-cyan-400 text-cyan-300 bg-cyan-950/20'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Sign-Off
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={`py-2.5 border-b-2 transition-all ${
                activeTab === 'chat'
                  ? 'border-cyan-400 text-cyan-300 bg-cyan-950/20'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Chat
            </button>
          </div>

          {/* Tab Content Panels */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
            {/* TAB 1: Threaded Notes */}
            {activeTab === 'notes' && (
              <div className="space-y-3.5">
                <form onSubmit={handleAddNote} className="space-y-2">
                  <textarea
                    rows={2}
                    value={newNoteText}
                    onChange={(e) => setNewNoteText(e.target.value)}
                    placeholder="Add clinical observation or annotation..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    type="submit"
                    className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-semibold py-1.5 rounded-lg text-xs transition-all shadow-md"
                  >
                    Post Note to Session
                  </button>
                </form>

                <div className="space-y-2.5 pt-2">
                  {notes.length > 0 ? (
                    notes.map((n) => (
                      <div key={n.id} className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-slate-200">{n.author_name}</span>
                          <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950 px-1.5 py-0.5 rounded">
                            {n.author_role}
                          </span>
                        </div>
                        <p className="text-slate-300 text-xs leading-relaxed">{n.content}</p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 text-slate-500 text-xs">
                      No annotations posted yet for this session.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: Live Shared Notepad */}
            {activeTab === 'notepad' && (
              <div className="space-y-2 h-full flex flex-col">
                <div className="text-[11px] text-slate-400 flex items-center justify-between">
                  <span>Collaborative Consensus Memo:</span>
                  <span className="text-emerald-400 font-mono text-[10px]">Real-Time Sync</span>
                </div>
                <textarea
                  value={sharedNotepad}
                  onChange={(e) => sendNotepadEdit(e.target.value)}
                  rows={14}
                  className="w-full flex-1 bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500 leading-relaxed resize-none"
                  placeholder="Type consensus notes here... peers see changes synchronously."
                />
              </div>
            )}

            {/* TAB 3: Consensus Sign-Off (21 CFR Part 11) */}
            {activeTab === 'signoff' && (
              <div className="space-y-3.5">
                <div className="p-3 bg-blue-950/30 border border-blue-900/60 rounded-xl space-y-1 text-slate-300 text-[11px]">
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-400" /> 21 CFR Part 11 Sign-Off
                  </div>
                  <p className="text-slate-400 text-[10px] leading-relaxed">
                    Formal multi-disciplinary consensus sign-off on target CRISPR effector or candidate guide.
                  </p>
                </div>

                <form onSubmit={handleAddSignoff} className="space-y-2.5 bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <div>
                    <label className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">Candidate Guide:</label>
                    <input
                      type="text"
                      value={selectedGuideForSignoff}
                      onChange={(e) => setSelectedGuideForSignoff(e.target.value)}
                      placeholder={candidateGuides[0]?.guide_id || 'sgRNA_KRAS_G12D_Top'}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs font-mono text-slate-200"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">Decision:</label>
                    <select
                      value={signoffDecision}
                      onChange={(e) => setSignoffDecision(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 font-mono"
                    >
                      <option value="APPROVED">APPROVED (Release to Wet-Lab)</option>
                      <option value="PROVISIONAL">PROVISIONAL (Needs Off-Target Verification)</option>
                      <option value="REJECTED">REJECTED (High Hazard Profile)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">Rationale / Notes:</label>
                    <textarea
                      rows={2}
                      value={signoffRationale}
                      onChange={(e) => setSignoffRationale(e.target.value)}
                      placeholder="Reasoning for clinical consensus..."
                      className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-xs text-slate-200"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-2 rounded-lg text-xs shadow-md transition-all"
                  >
                    Submit Clinical Sign-Off
                  </button>
                </form>

                <div className="space-y-2 pt-2">
                  <div className="font-semibold text-slate-300 text-[11px]">Recorded Sign-Offs ({signoffs.length}):</div>
                  {signoffs.map((s) => (
                    <div key={s.id} className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-white text-[11px]">{s.candidate_guide_id}</span>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold font-mono ${
                          s.signoff_decision === 'APPROVED'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : s.signoff_decision === 'REJECTED'
                            ? 'bg-rose-950 text-rose-300 border border-rose-800'
                            : 'bg-amber-950 text-amber-300 border border-amber-800'
                        }`}>
                          {s.signoff_decision}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        By {s.reviewer_name} ({s.reviewer_role})
                      </div>
                      {s.rationale_notes && (
                        <p className="text-[11px] text-slate-300 italic">"{s.rationale_notes}"</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 4: Real-time Chat */}
            {activeTab === 'chat' && (
              <div className="h-full flex flex-col justify-between space-y-3">
                <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 max-h-96">
                  {chatMessages.length > 0 ? (
                    chatMessages.map((msg, idx) => (
                      <div key={idx} className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-0.5">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-bold text-cyan-400">{msg.sender?.display_name || 'Collaborator'}</span>
                          <span className="text-slate-500 font-mono">
                            {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                        </div>
                        <p className="text-slate-200 text-xs">{msg.text}</p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-slate-500 text-xs">
                      No chat messages yet. Send a message to online collaborators.
                    </div>
                  )}
                </div>

                <form onSubmit={handleSendChat} className="flex gap-2 pt-2 border-t border-slate-800">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Type message to room..."
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    type="submit"
                    className="p-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-all"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
