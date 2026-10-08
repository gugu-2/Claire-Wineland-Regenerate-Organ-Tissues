from dataclasses import dataclass, field
from typing import List, Dict
import random
import math

@dataclass
class CancerClone:
    clone_id: str
    mutations: List[str]
    cell_count: int
    fitness: float
    drug_sensitivity: Dict[str, float]
    crispr_corrected: bool = False

def simulate_tumor_evolution(
    clones_data: List[Dict],
    time_steps: int = 20,
    treatment: Dict = None
) -> List[Dict]:
    """
    Simulates tumor clone dynamics using a simplified Moran process.
    """
    # Parse dict to objects
    clones = []
    for c in clones_data:
        clones.append(CancerClone(
            clone_id=c.get("clone_id", "Unknown"),
            mutations=c.get("mutations", []),
            cell_count=c.get("cell_count", 1000),
            fitness=c.get("fitness", 1.0),
            drug_sensitivity=c.get("drug_sensitivity", {})
        ))
        
    timeline = []
    
    for step in range(time_steps):
        # Apply treatment effects at step 5
        if step == 5 and treatment:
            for clone in clones:
                if treatment.get("type") == "crispr":
                    target_mut = treatment.get("target")
                    if target_mut in clone.mutations:
                        clone.mutations.remove(target_mut)
                        clone.fitness *= 0.5
                        clone.crispr_corrected = True
                elif treatment.get("type") == "drug":
                    drug = treatment.get("name")
                    sensitivity = clone.drug_sensitivity.get(drug, 0.5)
                    killed = int(clone.cell_count * sensitivity * 0.4)
                    clone.cell_count = max(0, clone.cell_count - killed)
        
        # Moran process
        total_fitness = sum(c.fitness * c.cell_count for c in clones if c.cell_count > 0)
        if total_fitness > 0:
            # Population growth
            for clone in clones:
                if clone.cell_count > 0:
                    growth_prob = (clone.fitness * clone.cell_count) / total_fitness
                    new_cells = int(growth_prob * sum(c.cell_count for c in clones) * 0.1)
                    clone.cell_count += new_cells
                    
                    # Random resistance mutation
                    if random.random() < 0.02 * step:
                        clone.mutations.append(f"RESISTANCE_{step}")
                        clone.drug_sensitivity = {k: max(0, v - 0.3) for k, v in clone.drug_sensitivity.items()}
                        
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
