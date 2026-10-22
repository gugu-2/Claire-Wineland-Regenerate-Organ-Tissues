import React from 'react';
import {
  FileText,
  Dna,
  ShieldAlert,
  Search,
  FlaskConical
} from 'lucide-react';

export default function MobileBottomNav({ activeTab, setActiveTab }) {
  const tabs = [
    { id: 'sample', label: 'Sample', icon: FileText },
    { id: 'crispr', label: 'CRISPR', icon: Dna },
    { id: 'onco-crispr', label: 'Oncology', icon: ShieldAlert },
    { id: 'clinical-trials', label: 'Trials', icon: Search },
    { id: 'wetlab', label: 'WetLab', icon: FlaskConical }
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#070b14]/95 backdrop-blur-md border-t border-slate-800/80 px-2 py-1.5 flex items-center justify-around shadow-2xl">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
              isActive
                ? 'text-cyan-400 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400 scale-110' : 'text-slate-400'} transition-transform`} />
            <span className="text-[10px] mt-0.5 tracking-tight font-medium">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
