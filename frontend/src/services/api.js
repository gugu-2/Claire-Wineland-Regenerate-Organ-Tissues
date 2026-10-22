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
    const res = await fetch(`${API_BASE}/crispr/offtarget-scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.json();
  },

  async getOffTargetScanStatus(jobId) {
    const res = await fetch(`${API_BASE}/crispr/offtarget-scan/${encodeURIComponent(jobId)}`);
    return res.json();
  },

  // ── ONCOLOGY PHASE 1: Somatic Cancer Foundation ──────────────────────────

  async ingestTumorNormalPair(payload) {
    const res = await fetch(`${API_BASE}/oncology/tumor-normal-ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.json();
  },

  async getTumorMutationalBurden(tumorSampleId) {
    const res = await fetch(`${API_BASE}/oncology/tumor-mutational-burden/${encodeURIComponent(tumorSampleId)}`);
    return res.json();
  },

  // ── ONCOLOGY PHASE 2: OncoCRISPR Allele-Specific Design ─────────────────

  async designAlleleSpecificGuides(payload) {
    const res = await fetch(`${API_BASE}/crispr/allele-specific-design`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.json();
  },

  // ── ONCOLOGY PHASE 3: OncoViral Therapy Planner ──────────────────────────

  async recommendViralChassis(payload) {
    const res = await fetch(`${API_BASE}/oncolytic/recommend-chassis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.json();
  },

  async designViralBlueprint(payload) {
    const res = await fetch(`${API_BASE}/oncolytic/design-blueprint`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.json();
  },

  async getViralDatabase() {
    const res = await fetch(`${API_BASE}/oncolytic/viral-database`);
    return res.json();
  },

  // ART (Array-Associated Reverse Transcriptase) — Yoon et al. 2026
  async getArtReference() {
    const res = await fetch(`${API_BASE}/aart/reference`);
    return res.json();
  },

  async artScanArray(sequence, minCopies = 3, maxMismatches = 2) {
    const res = await fetch(`${API_BASE}/aart/scan-array`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sequence, min_copies: minCopies, max_mismatches: maxMismatches })
    });
    return res.json();
  },

  async artPredictRnaStructure(repeatUnitDna) {
    const res = await fetch(`${API_BASE}/aart/predict-rna-structure`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repeat_unit_dna: repeatUnitDna })
    });
    return res.json();
  },

  async artAnalyzeLocus(upstreamSeq, rtProteinSeq = null, downstreamAnnotation = null, genomeSource = null) {
    const res = await fetch(`${API_BASE}/aart/analyze-locus`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        upstream_sequence: upstreamSeq,
        rt_protein_sequence: rtProteinSeq,
        downstream_gene_annotation: downstreamAnnotation,
        genome_source: genomeSource
      })
    });
    return res.json();
  },

  async artTherapeuticPotential(targetGene, editType = 'insertion', deliverySystem = 'lentiviral', cancerContext = null) {
    const res = await fetch(`${API_BASE}/aart/therapeutic-potential`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        target_gene: targetGene,
        edit_type: editType,
        delivery_system: deliverySystem,
        cancer_context: cancerContext
      })
    });
    return res.json();
  },

  // ── SPRINT 2: Multi-Allele Neoantigen & RNA-seq Integration ──────────────

  async getHlaAlleles() {
    const res = await fetch(`${API_BASE}/oncology/neoantigen-alleles`);
    return res.json();
  },

  async predictMultiAlleleNeoantigens(payload) {
    const res = await fetch(`${API_BASE}/oncology/neoantigen-predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.json();
  },

  async designVaccineCassette(payload) {
    const res = await fetch(`${API_BASE}/oncology/vaccine-design`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.json();
  },

  async uploadRnaSeqMatrix(payload) {
    const res = await fetch(`${API_BASE}/sample/upload-rnaseq`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.json();
  },

  async getGeneExpression(sampleId, geneName) {
    const res = await fetch(`${API_BASE}/sample/${encodeURIComponent(sampleId)}/expression/${encodeURIComponent(geneName)}`);
    return res.json();
  },

  async getSampleExpressionSummary(sampleId) {
    const res = await fetch(`${API_BASE}/sample/${encodeURIComponent(sampleId)}/expression-summary`);
    return res.json();
  },

  async loadBenchmarkRnaSeq(payload) {
    const res = await fetch(`${API_BASE}/sample/load-benchmark-rnaseq`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.json();
  },

  // ── SPRINT 3: CAR-T Engine & Single-Cell Spatial Transcriptomics ─────────

  async getCartTargets(payload) {
    const res = await fetch(`${API_BASE}/oncology/cart-targets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.json();
  },

  async getCartBlueprint(antigen, patientId = 'PATIENT_001') {
    const res = await fetch(`${API_BASE}/oncology/cart-targets/${encodeURIComponent(antigen)}/blueprint?patient_id=${encodeURIComponent(patientId)}`);
    return res.json();
  },

  async getAllCartAntigens() {
    const res = await fetch(`${API_BASE}/oncology/cart-antigens`);
    return res.json();
  },

  async uploadScRnaMatrix(payload) {
    const res = await fetch(`${API_BASE}/scrna/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.json();
  },

  async loadScRnaBenchmark(payload) {
    const res = await fetch(`${API_BASE}/scrna/load-benchmark`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.json();
  },

  async getSpatialVisium(spotsX = 24, spotsY = 18) {
    const res = await fetch(`${API_BASE}/scrna/spatial-visium?spots_x=${spotsX}&spots_y=${spotsY}`);
    return res.json();
  },

  // ── SPRINT 4: ART Construct Designer & Automated B2B Synthesis ───────────

  async designArtConstruct(payload) {
    const res = await fetch(`${API_BASE}/art/design-construct`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.json();
  },

  async getArtConstruct(constructId) {
    const res = await fetch(`${API_BASE}/art/construct/${encodeURIComponent(constructId)}`);
    return res.json();
  },

  async getArtPresets() {
    const res = await fetch(`${API_BASE}/art/presets`);
    return res.json();
  },

  async getSynthesisQuote(payload) {
    const res = await fetch(`${API_BASE}/synthesis/quote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.json();
  },

  async placeSynthesisOrder(payload) {
    const res = await fetch(`${API_BASE}/synthesis/order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.json();
  },

  async listSynthesisOrders() {
    const res = await fetch(`${API_BASE}/synthesis/orders`);
    return res.json();
  },

  async getSynthesisOrderStatus(orderId) {
    const res = await fetch(`${API_BASE}/synthesis/orders/${encodeURIComponent(orderId)}/status`);
    return res.json();
  }
};
