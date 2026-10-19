import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, AlertTriangle, ShieldAlert } from 'lucide-react';
import { usePlaygroundWS } from '../hooks/usePlaygroundWS';
import CloneEvolutionChart from './playground/CloneEvolutionChart';
import MolecularViewer from './playground/MolecularViewer';
import BindingAnimator from './playground/BindingAnimator';

export default function PlaygroundView() {
  const [activeTab, setActiveTab] = useState('evolution'); // 'evolution', 'molecular', 'animator'
  
  // Clone Evolution State
  const [timeline, setTimeline] = useState([]);
  const [isSimulating, setIsSimulating] = useState(false);
  
  const handleWSMessage = (msg) => {
    if (msg.type === 'simulation_step') {
      setTimeline(prev => [...prev, msg.data]);
    } else if (msg.type === 'simulation_complete') {
      setIsSimulating(false);
    }
  };
  
  const { send } = usePlaygroundWS(handleWSMessage);

  const startSimulation = () => {
    setTimeline([]);
    setIsSimulating(true);
    send({
      type: 'run_simulation',
      clones: [
        { clone_id: "Clone A (KRAS G12D)", mutations: ["KRAS_G12D"], cell_count: 1000, fitness: 1.2, drug_sensitivity: { "KRAS_inhibitor": 0.9 } },
        { clone_id: "Clone B (TP53 null)", mutations: ["TP53_null"], cell_count: 300, fitness: 1.0, drug_sensitivity: { "KRAS_inhibitor": 0.1 } },
        { clone_id: "Clone C (Wildtype)", mutations: [], cell_count: 100, fitness: 0.8, drug_sensitivity: { "KRAS_inhibitor": 0.5 } }
      ],
      treatment: { type: "drug", name: "KRAS_inhibitor" }
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            🧬 Real-Time Research Playground
            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-red-500/20 text-red-400 border border-red-500/30">
              LIVE ●
            </span>
          </h2>
          <p className="text-slate-400 mt-1">
            Interactive cellular automata and molecular visualization.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-700/50">
        {[
          { id: 'evolution', label: 'Clone Evolution' },
          { id: 'molecular', label: '3D Molecular Viewer' },
          { id: 'animator', label: 'Binding Animator' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 border-b-2 text-sm font-medium transition-colors ${
              activeTab === tab.id 
                ? 'border-indigo-500 text-indigo-400' 
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-slate-900 border border-slate-700/50 rounded-lg p-6 shadow-xl">
        {activeTab === 'evolution' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-medium text-white">Tumor Clone Evolution Simulator</h3>
                <p className="text-sm text-slate-400">Watch resistance mechanisms emerge under targeted therapy pressure.</p>
              </div>
              <button 
                onClick={startSimulation}
                disabled={isSimulating}
                className={`flex items-center gap-2 px-4 py-2 rounded font-medium transition-colors ${
                  isSimulating ? 'bg-slate-800 text-slate-500' : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }`}
              >
                {isSimulating ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {isSimulating ? 'Simulating...' : 'Start Therapy Simulation'}
              </button>
            </div>
            
            <div className="h-96 w-full bg-slate-950 rounded-lg border border-slate-800 p-4">
              {timeline.length > 0 ? (
                <CloneEvolutionChart timeline={timeline} />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-500">
                  <Play className="w-12 h-12 mb-4 opacity-50" />
                  <p>Click Start to run the evolutionary simulation</p>
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-slate-800 p-4 rounded border border-slate-700">
                <h4 className="text-sm font-medium text-slate-300 mb-2">Clone A (KRAS G12D)</h4>
                <p className="text-xs text-slate-500">Sensitive to KRAS inhibitor. High baseline fitness.</p>
              </div>
              <div className="bg-slate-800 p-4 rounded border border-slate-700">
                <h4 className="text-sm font-medium text-slate-300 mb-2">Clone B (TP53 null)</h4>
                <p className="text-xs text-slate-500">Resistant to KRAS inhibitor. Moderate fitness.</p>
              </div>
              <div className="bg-slate-800 p-4 rounded border border-slate-700">
                <h4 className="text-sm font-medium text-slate-300 mb-2">Treatment</h4>
                <p className="text-xs text-slate-500">KRAS G12D specific inhibitor applied at Time Cycle 5.</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'molecular' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-white">3D Molecular Viewer</h3>
              <p className="text-sm text-slate-400">Cas9-sgRNA-DNA complex (PDB: 4ZT0) via WebGL.</p>
            </div>
            <MolecularViewer 
              guideSeq="GATAGTCATCTTGGGGCTGG" 
              targetSeq="GATAGTCATCTTGGGGCTGG" 
              mutationPos={12} 
            />
          </div>
        )}

        {activeTab === 'animator' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-white">sgRNA Binding Animator</h3>
              <p className="text-sm text-slate-400">Simulated strand invasion and base-pairing.</p>
            </div>
            <div className="bg-slate-950 p-8 rounded-lg border border-slate-800 flex justify-center overflow-x-auto">
              <BindingAnimator 
                guide20nt="GATAGTCATCTTGGGGCTGG" 
                target20nt="GATAGTCATCTTGGGGCTGG" 
                pam="TGG" 
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
