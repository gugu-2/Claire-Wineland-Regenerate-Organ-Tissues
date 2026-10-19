# REALTIME_PLAYGROUND.md — The Live Research Playground

> The most ambitious feature of this platform. The place where science stops being
> numbers on a screen and starts being something you can *see*, *touch*, and *think with*.

---

## The Vision

Imagine this:

You're a researcher studying how KRAS G12D drives pancreatic cancer. You paste the mutant KRAS sequence into the platform. You press "Play."

In front of you, a 3D protein structure begins to rotate. The mutation glows red at position 12 — a single glycine replaced by an aspartate. You can see why this single amino acid change locks the protein in the "ON" state forever, unable to hydrolyze GTP.

You design a CRISPR guide RNA to correct this mutation. You press "Simulate." In real time, you watch the guide RNA fold, approach the DNA helix, unzip the double strand, and position itself. You see which off-target sites light up in the genome. You click on the tumor's immune microenvironment panel and watch how T-cells are responding.

Then you design an oncolytic virus payload. You drag a cytokine from the toolbar into the virus genome. You run the simulation. The virus enters a cancer cell. The cancer cell begins to die. The immune signal cascade begins.

This is the playground.

---

## Architecture: How to Build It

The playground is a **React frontend module** backed by **WebSocket streams** from the FastAPI backend.

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    PLAYGROUND TAB (React)                    │
│                                                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │  3D MOLECULAR   │  │  GENOME TRACK   │  │  LIVE PANEL │ │
│  │    VIEWER       │  │    BROWSER      │  │  (metrics)  │ │
│  │  (3Dmol.js)     │  │  (custom SVG)   │  │  (charts)   │ │
│  └────────┬────────┘  └────────┬────────┘  └──────┬──────┘ │
│           │                    │                   │         │
│           └────────────────────┴───────────────────┘         │
│                                WebSocket                      │
└─────────────────────────────────────┬────────────────────────┘
                                      │
                   ┌──────────────────▼──────────────────┐
                   │          FASTAPI BACKEND             │
                   │  WebSocket endpoint /ws/playground   │
                   │  Streams: structure updates,         │
                   │  binding events, simulation steps    │
                   └──────────────────────────────────────┘
```

---

## Component 1: 3D Molecular Viewer

### Technology: 3Dmol.js (MIT license, no backend required)

**3Dmol.js** is a JavaScript library for WebGL-accelerated molecular visualization. It runs entirely in the browser.

```html
<!-- Add to index.html -->
<script src="https://3Dmol.org/build/3Dmol-min.js"></script>
```

### What It Shows

1. **DNA double helix** — the target genomic region (20 nt guide + flanking 10 nt on each side)
2. **sgRNA** — the guide RNA overlaid on the DNA, showing base-pairing
3. **Cas9 protein** (or SaCas9, Cas12a) — from AlphaFold predicted structure
4. **Mutation highlight** — SNV sites colored red, PAM colored green
5. **Off-target sites** — listed in a sidebar, clickable to jump between them

### Example Code

```jsx
// components/playground/MolecularViewer.jsx
import { useEffect, useRef } from 'react';

export default function MolecularViewer({ guideSeq, targetSeq, mutationPos }) {
  const viewerRef = useRef(null);
  
  useEffect(() => {
    if (!window.$3Dmol || !viewerRef.current) return;
    
    const viewer = window.$3Dmol.createViewer(viewerRef.current, {
      defaultcolors: window.$3Dmol.rasmolElementColors
    });
    
    // Load Cas9 structure from AlphaFold PDB
    window.$3Dmol.download("pdb:4ZT0", viewer, {}, () => {
      // Color the guide-binding region
      viewer.setStyle({ chain: 'B', resi: [1, 20] }, { stick: { color: 'cyan', radius: 0.3 } });
      // Color PAM region
      viewer.setStyle({ chain: 'A', resi: [mutationPos, mutationPos + 2] }, { stick: { color: 'red' } });
      viewer.zoomTo();
      viewer.render();
    });
    
    return () => viewer.clear();
  }, [guideSeq, targetSeq, mutationPos]);
  
  return (
    <div 
      ref={viewerRef} 
      style={{ width: '100%', height: '500px', position: 'relative' }}
      className="bg-gray-950 rounded-lg border border-gray-700"
    />
  );
}
```

---

## Component 2: DNA Sequence Interactive Track

### Technology: Custom SVG + React

The genome track shows the **sequence as interactive nucleotides** — you can click, hover, and highlight.

```jsx
// components/playground/DnaTrack.jsx
export default function DnaTrack({ sequence, guideStart, guideEnd, mutationPositions }) {
  const COLORS = { A: '#4ade80', T: '#f87171', G: '#60a5fa', C: '#fbbf24' };
  
  return (
    <div className="overflow-x-auto py-4">
      <svg width={sequence.length * 24} height={80}>
        {sequence.split('').map((base, i) => {
          const isGuide = i >= guideStart && i < guideEnd;
          const isMutation = mutationPositions.includes(i);
          return (
            <g key={i} transform={`translate(${i * 24}, 0)`}>
              {/* Base rectangle */}
              <rect 
                width={22} height={32} rx={3}
                fill={isMutation ? '#ef4444' : isGuide ? '#1d4ed8' : '#1f2937'}
                stroke={isGuide ? '#60a5fa' : 'transparent'}
                strokeWidth={2}
              />
              {/* Base letter */}
              <text x={11} y={22} textAnchor="middle" fill={COLORS[base]} fontSize={14} fontFamily="mono">
                {base}
              </text>
              {/* Position label */}
              {i % 10 === 0 && (
                <text x={11} y={52} textAnchor="middle" fill="#6b7280" fontSize={9}>
                  {i + 1}
                </text>
              )}
            </g>
          );
        })}
        
        {/* Guide annotation bar */}
        <rect 
          x={guideStart * 24} y={58} 
          width={(guideEnd - guideStart) * 24} height={8}
          fill="#1d4ed8" opacity={0.6} rx={2}
        />
        <text x={(guideStart + (guideEnd - guideStart) / 2) * 24} y={74} 
          textAnchor="middle" fill="#93c5fd" fontSize={10}>
          sgRNA
        </text>
      </svg>
    </div>
  );
}
```

---

## Component 3: RNA Folding Visualizer

### Technology: RNAfold-JS or server-side `RNAfold` via subprocess

The ART module already predicts RNA hairpin structures. The playground should **visualize** them.

```
Input: CATGTGTATCGCATGTTAATTTAAAGGATTTATA (ART repeat core)
Output: A visual stem-loop diagram:

     5' ──┐
          │ CATG──
          │      │ stem (6 bp)
          │ GTAC──
          │    loop: TATCG
     3' ──┘
```

**Option A (Pure JavaScript — no server):**
Use the `RNAcanvas` library:
```html
<script src="https://unpkg.com/rnacanvas@latest/dist/rnacanvas.js"></script>
```

**Option B (Python backend):**
Call `ViennaRNA` Python bindings:
```python
import RNA  # pip install ViennaRNA
structure, mfe = RNA.fold(rna_sequence)
# Returns: "..((((....)))).." and -12.4 kcal/mol
# Structure string → parse into coordinate pairs for SVG drawing
```

---

## Component 4: Live Cancer Clone Evolution Simulator

### The Most Powerful Feature

This is a **cellular automaton** / evolutionary simulation that shows how a tumor's subclones respond to a CRISPR intervention over simulated time.

**What it shows:**
- A grid of cells (each is a tumor cell)
- Colors represent clone identity (which mutation set they carry)
- Over time: cells divide, mutate, die
- Apply a CRISPR edit: watch edited cells gain fitness advantage
- Apply a cytotoxic drug: watch sensitive cells die, resistant clones expand

**Why this matters:**
This is the key insight for cancer therapy: it's not enough to kill cancer cells. You have to kill the **right** cells — the ones that can't develop resistance. The simulator makes this visible.

**Implementation:**

```python
# backend/modules/clone_simulator.py
from dataclasses import dataclass, field
from typing import List, Dict
import random
import math

@dataclass
class CancerClone:
    clone_id: str
    mutations: List[str]           # e.g. ["KRAS_G12D", "TP53_R248W"]
    cell_count: int
    fitness: float                  # Relative proliferative advantage
    drug_sensitivity: Dict[str, float]  # drug_name → 0 (resistant) to 1 (sensitive)
    crispr_corrected: bool = False

def simulate_tumor_evolution(
    clones: List[CancerClone],
    time_steps: int = 20,
    treatment: Dict = None  # {"type": "crispr", "target": "KRAS_G12D"} or {"type": "drug", "name": "paclitaxel"}
) -> List[Dict]:
    """
    Simulates tumor clone dynamics using a simplified Moran process.
    
    The Moran process: at each time step, one cell is randomly selected to 
    divide proportional to its fitness, and one is selected to die randomly.
    Net growth = population growth at defined rate.
    
    Returns a time series of clone populations for visualization.
    """
    timeline = []
    
    for step in range(time_steps):
        # Apply treatment effects at step 5 (simulated treatment start)
        if step == 5 and treatment:
            for clone in clones:
                if treatment["type"] == "crispr":
                    if treatment["target"] in clone.mutations:
                        clone.mutations.remove(treatment["target"])
                        clone.fitness *= 0.5   # Corrected clone loses proliferative advantage
                        clone.crispr_corrected = True
                elif treatment["type"] == "drug":
                    drug = treatment["name"]
                    sensitivity = clone.drug_sensitivity.get(drug, 0.5)
                    # Kill fraction of sensitive cells
                    killed = int(clone.cell_count * sensitivity * 0.4)
                    clone.cell_count = max(0, clone.cell_count - killed)
        
        # Moran process: fitness-proportional reproduction
        total_fitness = sum(c.fitness * c.cell_count for c in clones if c.cell_count > 0)
        if total_fitness > 0:
            for clone in clones:
                if clone.cell_count > 0:
                    growth_prob = (clone.fitness * clone.cell_count) / total_fitness
                    new_cells = int(growth_prob * sum(c.cell_count for c in clones) * 0.1)
                    clone.cell_count += new_cells
                    
                    # Random mutation events (new resistance mutations)
                    if random.random() < 0.02 * step:  # Increasing mutation rate with time
                        clone.mutations.append(f"RESISTANCE_{step}")
                        clone.drug_sensitivity = {k: max(0, v - 0.3) for k, v in clone.drug_sensitivity.items()}
        
        # Record snapshot
        timeline.append({
            "step": step,
            "clones": [
                {
                    "clone_id": c.clone_id,
                    "mutations": c.mutations,
                    "cell_count": c.cell_count,
                    "fitness": c.fitness,
                    "crispr_corrected": c.crispr_corrected,
                }
                for c in clones
            ],
            "total_cells": sum(c.cell_count for c in clones),
            "treatment_active": step >= 5 and treatment is not None,
        })
    
    return timeline
```

**Frontend Visualization (animated bar chart or cellular grid):**

```jsx
// Animated clone stacked bar chart using Recharts or D3
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const CLONE_COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6'];

export default function CloneEvolutionChart({ timeline }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={timeline}>
        <XAxis dataKey="step" label={{ value: 'Time (cycles)', position: 'insideBottom' }} />
        <YAxis label={{ value: 'Cell Count', angle: -90 }} />
        <Tooltip />
        {timeline[0]?.clones.map((clone, i) => (
          <Area 
            key={clone.clone_id}
            type="monotone"
            dataKey={`clones[${i}].cell_count`}
            stackId="1"
            fill={CLONE_COLORS[i % CLONE_COLORS.length]}
            stroke={CLONE_COLORS[i % CLONE_COLORS.length]}
            name={clone.clone_id}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}
```

---

## Component 5: Molecule Binding Simulator (Bond Viewer)

### What It Shows

When a CRISPR guide RNA is designed, the playground can **animate the binding process**:

1. The guide RNA (shown as a colored chain) floats toward the target DNA
2. Each base pairing creates a "bond" shown as a connecting line
3. Mismatches (off-target sites) are shown as gaps or broken lines
4. The Cas9 PAM recognition site clicks into place last

### Implementation

This is a **pure CSS animation** system — no physics engine needed:

```jsx
// components/playground/BindingAnimator.jsx
export default function BindingAnimator({ guide20nt, target20nt, pam }) {
  const [step, setStep] = useState(0);
  
  useEffect(() => {
    const timer = setInterval(() => {
      setStep(prev => prev < 20 ? prev + 1 : prev);
    }, 150); // 150ms per base pair = 3 second animation
    return () => clearInterval(timer);
  }, [guide20nt]);
  
  const bases = guide20nt.split('');
  const targetBases = target20nt.split('');
  
  return (
    <div className="font-mono text-sm">
      {/* Guide RNA strand */}
      <div className="flex gap-1 mb-1">
        <span className="text-gray-500 w-24">sgRNA 5'→3'</span>
        {bases.map((base, i) => (
          <span key={i} 
            className={`w-6 text-center rounded transition-all duration-300 ${
              i < step ? 'text-cyan-400 bg-cyan-950' : 'text-gray-600'
            }`}
          >
            {base}
          </span>
        ))}
      </div>
      
      {/* Base pair connectors */}
      <div className="flex gap-1 mb-1">
        <span className="w-24"></span>
        {bases.map((base, i) => {
          const complement = { A: 'T', T: 'A', G: 'C', C: 'G' };
          const isPaired = complement[base] === targetBases[i];
          return (
            <span key={i} className={`w-6 text-center text-xs ${
              i < step ? (isPaired ? 'text-green-400' : 'text-red-400') : 'text-gray-700'
            }`}>
              {i < step ? (isPaired ? '|' : '✗') : '·'}
            </span>
          );
        })}
      </div>
      
      {/* Target DNA strand */}
      <div className="flex gap-1 mb-1">
        <span className="text-gray-500 w-24">DNA 3'→5'</span>
        {targetBases.map((base, i) => (
          <span key={i} className={`w-6 text-center rounded ${
            i < step ? 'text-yellow-400 bg-yellow-950' : 'text-gray-600'
          }`}>
            {base}
          </span>
        ))}
        <span className="text-green-400 ml-2">{pam}</span>
      </div>
      
      <button onClick={() => setStep(0)} className="mt-2 text-xs text-gray-500 hover:text-gray-300">
        ↺ Replay
      </button>
    </div>
  );
}
```

---

## Component 6: Real-Time Metrics Stream (WebSocket)

### Backend WebSocket Endpoint

```python
# In main.py
from fastapi import WebSocket
import asyncio
import json

@app.websocket("/ws/playground")
async def playground_websocket(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            # Receive command from frontend
            data = await websocket.receive_text()
            command = json.loads(data)
            
            if command["type"] == "run_simulation":
                # Stream simulation steps
                clones = command["clones"]
                timeline = simulate_tumor_evolution(clones, time_steps=20)
                
                for step_data in timeline:
                    await websocket.send_json({
                        "type": "simulation_step",
                        "data": step_data
                    })
                    await asyncio.sleep(0.3)  # 300ms between steps = visible animation
                
                await websocket.send_json({"type": "simulation_complete"})
            
            elif command["type"] == "scan_sequence":
                seq = command["sequence"]
                # Stream repeat detection results base by base
                for i in range(0, len(seq), 10):
                    chunk = seq[i:i+10]
                    await websocket.send_json({
                        "type": "scan_progress",
                        "position": i,
                        "total": len(seq),
                        "chunk": chunk,
                        "progress_pct": int(i / len(seq) * 100)
                    })
                    await asyncio.sleep(0.05)
    
    except Exception:
        pass
    finally:
        await websocket.close()
```

### Frontend WebSocket Hook

```javascript
// hooks/usePlaygroundWS.js
import { useEffect, useRef, useCallback } from 'react';

export function usePlaygroundWS(onMessage) {
  const wsRef = useRef(null);
  
  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8000/ws/playground');
    ws.onmessage = (event) => onMessage(JSON.parse(event.data));
    ws.onclose = () => console.log('Playground WS closed');
    wsRef.current = ws;
    return () => ws.close();
  }, []);
  
  const send = useCallback((command) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(command));
    }
  }, []);
  
  return { send };
}
```

---

## The Playground Tab: Full Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  🧬 Live Research Playground                          [LIVE ●]  │
├──────────────┬──────────────────────────────────────────────────┤
│  LEFT PANEL  │                MAIN CANVAS                        │
│              │                                                    │
│  TOOL PALETTE│  ┌─────────────────────────────────────────────┐ │
│  ─────────── │  │         3D MOLECULAR VIEWER                  │ │
│  📌 Load     │  │         (3Dmol.js WebGL)                     │ │
│     Sample   │  │                                               │ │
│              │  │   [Cas9 protein rotating]                     │ │
│  🧬 DNA Track│  │   [Guide RNA binding animation]               │ │
│              │  │   [Mutation site glowing red]                 │ │
│  🔴 Mutate   │  └───────────────────┬───────────────────────────┘ │
│     at pos   │                      │                             │
│              │  ┌───────────────────▼───────────────────────────┐ │
│  💉 Apply    │  │              DNA SEQUENCE TRACK                │ │
│     Treatment│  │  GATAGTCATCTTGGGGCTGG|TGG                     │ │
│              │  │  ||||||||||||||||||||  PAM                     │ │
│  ▶ Simulate  │  │  [Binding animation plays here]               │ │
│              │  └───────────────────────────────────────────────┘ │
│  METRICS     │                                                    │
│  ─────────── │  ┌───────────────────────────────────────────────┐ │
│  Efficiency: │  │         CLONE EVOLUTION CHART                 │ │
│  87.3%       │  │  [Stacked area chart animating in real-time]  │ │
│              │  │  Treatment applied at step 5 ──┐              │ │
│  Off-targets:│  │                                │              │ │
│  CFD: 0.72   │  │  [Clone A]█████████████████░░░│░░           │ │
│              │  │  [Clone B]████████████░░░░░░░░│             │ │
│  MSI: High   │  │  [Clone C] ░░░░░░░░░░░░░░░████│████████     │ │
│              │  └───────────────────────────────────────────────┘ │
└──────────────┴──────────────────────────────────────────────────┘
```

---

## Dependencies to Add

```json
// package.json additions
"3dmol": "^2.0.0",           // 3D molecular visualization
"recharts": "^2.8.0",        // Clone evolution charts (already in many React projects)
"d3": "^7.8.0",              // SVG-based genome track
"rnacanvas": "^1.0.0"        // RNA secondary structure visualization
```

```txt
# requirements.txt additions
ViennaRNA>=2.6.0             # RNA secondary structure prediction
websockets>=12.0              # Already in FastAPI, but pin version
networkx>=3.2                 # For knowledge graph as proper graph
```

---

## Implementation Order (4 Sprints)

### Sprint 1 — Foundation (2-3 days)
1. Add WebSocket endpoint to FastAPI
2. Create `usePlaygroundWS.js` hook
3. Create `PlaygroundView.jsx` shell with layout
4. Wire new "Playground" tab into `App.jsx` and `Navbar.jsx`

### Sprint 2 — DNA Track + Binding Animator (2-3 days)
5. Build `DnaTrack.jsx` (interactive SVG nucleotides)
6. Build `BindingAnimator.jsx` (base-pairing animation)
7. Connect to existing guide design results

### Sprint 3 — Clone Simulator (3-4 days)
8. Write `clone_simulator.py` backend module
9. Add `/api/playground/simulate-clones` endpoint
10. Build `CloneEvolutionChart.jsx` (Recharts animated area chart)
11. Add treatment controls (CRISPR button, drug selector)

### Sprint 4 — 3D Viewer + RNA (3-4 days)
12. Integrate 3Dmol.js into `MolecularViewer.jsx`
13. Load Cas9 structure from AlphaFold/PDB
14. Connect guide design → 3D viewer (highlight binding region)
15. Add `RnaStructureViewer.jsx` using ART module output

---

## Out-of-the-Box Ideas for the Playground

### 💡 Idea 1: Tumor Cell vs. T-Cell Battle Simulation
Show a grid of tumor cells and T-cells. Watch T-cells hunting cancer cells after you activate a PD-1 checkpoint inhibitor. Watch them fail when the tumor mutates to lose MHC-I expression. Adjust the CRISPR edit to restore it. Run again. See the T-cells win.

### 💡 Idea 2: DNA Repair Pathway Chooser
After a CRISPR cut, visualize NHEJ vs HDR in real time. Show the probability of each outcome based on cell cycle phase. Let the researcher adjust HDR template concentration and watch the outcome probabilities shift.

### 💡 Idea 3: ART Array Expression Live Feed
Take an ART repeat array sequence. Show the DNA. Press play. Watch the RNA polymerase travel down the array, producing discrete short ncRNAs one by one. Each ncRNA folds into its hairpin structure as it's released. This is science that nobody has visualized before.

### 💡 Idea 4: Viral Infection Cascade
Start with a cancer cell and an oncolytic virus. Show the virus binding to CD46 receptors. Show it entering the cell. Show it replicating. Show the cell dying and releasing new virions. Show the immune danger signal (IFN-γ) diffusing outward. Show neighboring tumor cells becoming alert. Show T-cells arriving.

### 💡 Idea 5: Comparative Guide Showdown
Load 4 CRISPR guides simultaneously. Run them all in the same simulated genome. Show their editing efficiency bars filling up in parallel. Show off-target flashes across the genome. The best guide emerges. The researcher understands *why* — not just what the number says.

---

*Real-Time Playground Documentation — Genomic Research Copilot — October 2026*
