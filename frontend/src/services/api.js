const API_BASE = '/api';

export const api = {
  async getStatus() {
    const res = await fetch(`${API_BASE}/status`);
    return res.json();
  },

  async getSamples() {
    const res = await fetch(`${API_BASE}/samples`);
    return res.json();
  },

  async getGenes() {
    const res = await fetch(`${API_BASE}/genes`);
    return res.json();
  },

  async uploadVcf(payload) {
    const res = await fetch(`${API_BASE}/samples/upload-vcf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.json();
  },

  async personalizeSequence(geneSymbol, variants, signal = null) {
    const res = await fetch(`${API_BASE}/samples/personalize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gene_symbol: geneSymbol, variants }),
      ...(signal && { signal })
    });
    return res.json();
  },

  async annotateVariants(variants) {
    const res = await fetch(`${API_BASE}/variants/annotate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ variants })
    });
    return res.json();
  },

  async designCrispr(payload) {
    const res = await fetch(`${API_BASE}/crispr/design`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.json();
  },

  async getRegenerationProtocols() {
    const res = await fetch(`${API_BASE}/regeneration/protocols`);
    return res.json();
  },

  async evaluateRegeneration(payload) {
    const res = await fetch(`${API_BASE}/regeneration/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.json();
  },

  async chatCopilot(query, sampleId = null) {
    const res = await fetch(`${API_BASE}/copilot/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, sample_id: sampleId })
    });
    return res.json();
  },

  async getChatHistory(sampleId) {
    const res = await fetch(`${API_BASE}/copilot/history/${encodeURIComponent(sampleId)}`);
    return res.json();
  },

  async submitReview(reviewPayload) {
    const res = await fetch(`${API_BASE}/review/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reviewPayload)
    });
    return res.json();
  },

  async getReview(candidateId) {
    const res = await fetch(`${API_BASE}/review/${candidateId}`);
    return res.json();
  },

  async generateReport(payload) {
    const res = await fetch(`${API_BASE}/report/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.json();
  },

  async getAuditLogs() {
    const res = await fetch(`${API_BASE}/audit/logs`);
    return res.json();
  },

  async searchLiterature(query, maxResults = 5) {
    const res = await fetch(`${API_BASE}/literature/search?query=${encodeURIComponent(query)}&max_results=${maxResults}`);
    return res.json();
  },

  async createOligoOrder(payload) {
    const res = await fetch(`${API_BASE}/crispr/oligo-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.json();
  },

  async recommendDelivery(payload) {
    const res = await fetch(`${API_BASE}/delivery/recommend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.json();
  },

  async designDualGuides(payload) {
    const res = await fetch(`${API_BASE}/crispr/dual-guide`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.json();
  },

  async getCohortComparison(targetGene = 'CCR5') {
    const res = await fetch(`${API_BASE}/cohort/comparison?target_gene=${encodeURIComponent(targetGene)}`);
    return res.json();
  },

  async startOffTargetScan(payload) {
    const res = await fetch(`${API_BASE}/crispr/off-target-scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.json();
  },

  async getOffTargetScanStatus(jobId) {
    const res = await fetch(`${API_BASE}/crispr/off-target-scan/${jobId}`);
    return res.json();
  }
};
