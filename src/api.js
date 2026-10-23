const BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000';

async function getJSON(path) {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`Request failed: ${path}`);
  return res.json();
}

export const api = {
  health: () => getJSON('/api/health'),
  datasetInfo: () => getJSON('/api/dataset-info'),
  correlation: () => getJSON('/api/correlation'),
  modelInfo: (approach) => getJSON(`/api/models/${approach}/info`),
  trainingHistory: (approach) => getJSON(`/api/models/${approach}/training-history`),
  aeFeatureImportance: () => getJSON('/api/models/autoencoder/feature-importance'),

  inferPrediction: async (file) => {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch(`${BASE}/api/infer/prediction`, { method: 'POST', body: fd });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Inference failed' }));
      throw new Error(err.detail || 'Inference failed');
    }
    return res.json();
  },

  inferAutoencoder: async (file, reconFeature) => {
    const fd = new FormData();
    fd.append('file', file);
    const q = reconFeature ? `?recon_feature=${encodeURIComponent(reconFeature)}` : '';
    const res = await fetch(`${BASE}/api/infer/autoencoder${q}`, { method: 'POST', body: fd });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Inference failed' }));
      throw new Error(err.detail || 'Inference failed');
    }
    return res.json();
  },
};

export default api;
