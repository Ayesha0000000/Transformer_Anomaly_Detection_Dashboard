import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader.jsx';
import KpiCard from '../components/KpiCard.jsx';
import api from '../api.js';
import { fmtInt } from '../lib/stats.js';

export default function Overview() {
  const [dataset, setDataset] = useState(null);
  const [predInfo, setPredInfo] = useState(null);
  const [aeInfo, setAeInfo] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    Promise.all([api.datasetInfo(), api.modelInfo('prediction'), api.modelInfo('autoencoder')])
      .then(([d, p, a]) => { setDataset(d); setPredInfo(p); setAeInfo(a); })
      .catch((e) => setErr(e.message));
  }, []);

  return (
    <div>
      <PageHeader
        eyebrow="Experiment overview"
        title="Transformer Anomaly Detection"
        description="Two Transformer-based approaches trained on the same flight telemetry session are presented side by side: a next-timestep prediction model and a reconstruction autoencoder. Every figure below is loaded from the real trained checkpoints, scalers, and threshold configs ."
      />

      {err && <div className="error-banner">Could not reach the backend API — is it running on port 8000? ({err})</div>}

      {dataset && (
        <div className="kpi-grid">
          <KpiCard label="Flight Session" value={dataset.sessions?.[0] ?? '—'} sub="session_id in source data" />
          <KpiCard label="Total Rows" value={fmtInt(dataset.total_rows)} sub={`${dataset.sample_rate_hz} Hz sampling`} />
          <KpiCard label="Feature Columns" value={dataset.num_feature_columns} sub="of 50 raw columns" />
          <KpiCard label="Window Size" value={dataset.window_size_timesteps} unit="steps" sub={`${dataset.window_seconds}s window · stride ${dataset.window_stride}`} />
        </div>
      )}

      <div className="grid-2 section">
        <Link to="/prediction" style={{ textDecoration: 'none' }}>
          <div className="card" style={{ height: '100%' }}>
            <div className="card-title">
              Page 1 <span className="badge amber">Prediction</span>
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Transformer Prediction-Based Anomaly Detection</div>
            <p style={{ color: 'var(--text-dim)', fontSize: 13.5, lineHeight: 1.6 }}>
              A Transformer encoder predicts each window's next timestep across all 44 flight parameters.
              Anomaly score = mean squared error between the predicted and actual next reading.
            </p>
            {predInfo && (
              <div className="info-list" style={{ marginTop: 14 }}>
                <div className="info-row"><span className="k">Trainable params</span><span className="v">{fmtInt(predInfo.total_trainable_params)}</span></div>
                <div className="info-row"><span className="k">Threshold</span><span className="v">{predInfo.threshold.toFixed(4)}</span></div>
                <div className="info-row"><span className="k">Epochs run</span><span className="v">{predInfo.epochs_actually_run} / {predInfo.max_epochs}</span></div>
              </div>
            )}
          </div>
        </Link>

        <Link to="/autoencoder" style={{ textDecoration: 'none' }}>
          <div className="card" style={{ height: '100%' }}>
            <div className="card-title">
              Page 2 <span className="badge neutral" style={{ color: 'var(--cyan)', background: 'var(--cyan-dim)' }}>Autoencoder</span>
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Transformer Autoencoder Anomaly Detection</div>
            <p style={{ color: 'var(--text-dim)', fontSize: 13.5, lineHeight: 1.6 }}>
              A Transformer encoder–decoder compresses each window through a 32-dim latent bottleneck and
              reconstructs it. Anomaly score = mean squared reconstruction error across the full window.
            </p>
            {aeInfo && (
              <div className="info-list" style={{ marginTop: 14 }}>
                <div className="info-row"><span className="k">Trainable params</span><span className="v">{fmtInt(aeInfo.total_trainable_params)}</span></div>
                <div className="info-row"><span className="k">Threshold</span><span className="v">{aeInfo.threshold.toFixed(4)}</span></div>
                <div className="info-row"><span className="k">Epochs run</span><span className="v">{aeInfo.epochs_actually_run} / {aeInfo.max_epochs}</span></div>
              </div>
            )}
          </div>
        </Link>
      </div>

      <div className="card section">
        <div className="card-title">Live inference — how sample-level results are generated</div>
        <p style={{ fontSize: 13.5, color: 'var(--text-dim)', lineHeight: 1.7, margin: 0 }}>
          The source notebooks calibrate each threshold on a held-out validation split of a single healthy flight
          file (<code style={{ fontFamily: 'var(--font-mono)' }}>train.parquet</code>), which is not bundled with this dashboard and was never
          scored against a labeled test set. So instead of inventing per-sample results, the <strong>Prediction</strong> and{' '}
          <strong>Autoencoder</strong> pages let you upload a flight-data file (same 44-column schema, 2&nbsp;Hz sampling) and run
          it through the real trained weights via the FastAPI backend — every timeline, distribution, and reconstruction
          plot you see after uploading is computed live, not hardcoded.
        </p>
      </div>

      <div className="card section">
        <div className="card-title">Dataset composition</div>
        {dataset ? (
          <div className="tag-list">
            {dataset.feature_columns.map((f) => <span className="tag" key={f}>{f}</span>)}
          </div>
        ) : <div className="empty-state">Loading…</div>}
      </div>
    </div>
  );
}
