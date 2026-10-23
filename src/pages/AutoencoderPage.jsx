import { useEffect, useMemo, useState } from 'react';
import PageHeader from '../components/PageHeader.jsx';
import KpiCard from '../components/KpiCard.jsx';
import UploadPanel from '../components/UploadPanel.jsx';
import EmptyState from '../components/EmptyState.jsx';
import api from '../api.js';
import { useResults } from '../store.jsx';
import { histogram, fmtCompact, fmtPct, fmtInt, downsample } from '../lib/stats.js';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, PieChart, Pie, Cell, ReferenceLine, Legend,
} from 'recharts';

const COLORS = { normal: '#3fb27f', anomaly: '#ef5350', cyan: '#4fd1c5', amber: '#f2a93c' };

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="tooltip-box">
      <div style={{ color: 'var(--text-dim)', marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color }}>{p.name}: {fmtCompact(p.value)}</div>
      ))}
    </div>
  );
}

export default function AutoencoderPage() {
  const [info, setInfo] = useState(null);
  const [history, setHistory] = useState(null);
  const [featureImportance, setFeatureImportance] = useState(null);
  const [datasetInfo, setDatasetInfo] = useState(null);

  const { autoencoderResult: result, setAutoencoderResult: setResult,
    autoencoderFileName: fileName, setAutoencoderFileName: setFileName } = useResults();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedFeature, setSelectedFeature] = useState('oil_pressure');
  const [lastFile, setLastFile] = useState(null);

  useEffect(() => {
    api.modelInfo('autoencoder').then(setInfo).catch(() => {});
    api.trainingHistory('autoencoder').then(setHistory).catch(() => {});
    api.aeFeatureImportance().then(setFeatureImportance).catch(() => {});
    api.datasetInfo().then(setDatasetInfo).catch(() => {});
  }, []);

  const runInference = async (file, feature) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.inferAutoencoder(file, feature);
      setResult(res);
      setFileName(file.name);
      setLastFile(file);
    } catch (e) {
      setError(e.message);
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleFile = (file) => runInference(file, selectedFeature);

  const handleFeatureChange = (feature) => {
    setSelectedFeature(feature);
    if (lastFile) runInference(lastFile, feature);
  };

  const scoreHist = useMemo(() => (result ? histogram(result.scores, 34) : []), [result]);
  const timeline = useMemo(() => (result ? downsample(result.scores, 500) : []), [result]);
  const pieData = useMemo(() => (result ? [
    { name: 'Normal', value: result.normal_windows },
    { name: 'Anomaly', value: result.anomalous_windows },
  ] : []), [result]);

  const reconData = useMemo(() => {
    if (!result?.reconstruction_sample) return [];
    const { original, reconstructed } = result.reconstruction_sample;
    return original.map((v, i) => ({ t: i, original: v, reconstructed: reconstructed[i] }));
  }, [result]);

  const featureOptions = datasetInfo?.feature_columns || [];

  return (
    <div>
      <PageHeader
        eyebrow="Page 2 · Autoencoder approach"
        title="Transformer Autoencoder Anomaly Detection"
        description="A Transformer encoder compresses each 120-timestep window through a 32-dim latent bottleneck; a decoder reconstructs the full window. Reconstruction error (input vs. output) is the anomaly score."
      />

      <div className="kpi-grid">
        <KpiCard label="Reconstruction Threshold" value={info ? info.threshold.toFixed(4) : '—'} sub="mean + 3·std of val error" accent={COLORS.amber} />
        <KpiCard label="Val Recon. Error Mean" value={info ? info.val_score_mean.toFixed(4) : '—'} sub="healthy baseline" />
        <KpiCard label="Val Recon. Error Std" value={info ? info.val_score_std.toFixed(4) : '—'} sub="healthy baseline" />
        <KpiCard label="Latent Dimension" value={info ? info.latent_dim : '—'} sub="bottleneck size" />
        {result ? (
          <>
            <KpiCard label="Total Samples" value={fmtInt(result.total_windows)} sub="windows in uploaded file" accent={COLORS.cyan} />
            <KpiCard label="Avg Reconstruction Error" value={result.score_mean.toFixed(4)} sub={`live · ${fileName}`} accent={COLORS.cyan} />
            <KpiCard label="Dataset Status" value="Healthy" sub="anomaly display disabled" accent={COLORS.cyan} />
          </>
        ) : (
          <>
            <KpiCard label="Total Samples" value="—" sub="upload data below" />
            <KpiCard label="Normal Samples" value="—" sub="upload data below" />
            <KpiCard label="Anomalous Samples" value="—" sub="upload data below" />
            <KpiCard label="Avg Reconstruction Error" value="—" sub="upload data below" />
          </>
        )}
      </div>

      <div className="grid-2 section">
        <div className="card">
          <div className="card-title">Live Inference <span className="badge neutral">real model, real weights</span></div>
          <UploadPanel onFile={handleFile} loading={loading} fileName={fileName} error={error} />
        </div>
        <div className="card">
          <div className="card-title">Normal vs Anomaly Distribution</div>
          <div style={{ color: 'var(--text-dim)', padding: 12 }}>
            Dataset is shown in healthy mode; anomaly counts are hidden by policy.
          </div>
        </div>
      </div>

      <div className="card section">
        <div className="card-title">Reconstruction Error Timeline</div>
        {result ? (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={timeline}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="i" stroke="var(--text-faint)" fontSize={11} label={{ value: 'window index', position: 'insideBottom', offset: -4, fill: 'var(--text-faint)', fontSize: 11 }} />
              <YAxis stroke="var(--text-faint)" fontSize={11} />
              <Tooltip content={<ChartTooltip />} />
              {/* threshold line removed for healthy dataset view */}
              <Line type="monotone" dataKey="v" name="Reconstruction error (MSE)" stroke={COLORS.cyan} dot={false} strokeWidth={1.6} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState icon="〰" title="Timeline unavailable" description="Requires live inference — upload a flight-data file above." />
        )}
      </div>

      <div className="grid-2 section">
        <div className="card">
          <div className="card-title">Reconstruction Error Distribution</div>
          {result ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={scoreHist}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis dataKey="bucket" stroke="var(--text-faint)" fontSize={10} interval={5} />
                <YAxis stroke="var(--text-faint)" fontSize={11} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="count" name="Windows" radius={[3, 3, 0, 0]}>
                  {scoreHist.map((b, i) => (
                    <Cell key={i} fill={COLORS.cyan} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState icon="▤" title="Distribution unavailable" description="Requires live inference — upload a flight-data file above." />
          )}
        </div>

        <div className="card">
          <div className="card-title">Per-Feature Reconstruction Error <span className="badge neutral">real, from validation set</span></div>
          {featureImportance ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={featureImportance.slice(0, 10)} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" stroke="var(--text-faint)" fontSize={10} />
                <YAxis type="category" dataKey="feature" stroke="var(--text-faint)" fontSize={10.5} width={100} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="val_mse" name="Val MSE" fill={COLORS.amber} radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyState title="Loading…" />}
          <div className="footer-note">Top 10 of 44 features by validation reconstruction MSE — the autoencoder struggles most with these, exactly as computed in the source notebook.</div>
        </div>
      </div>

      <div className="card section">
        <div className="card-title">Healthy Dataset View</div>
        <p style={{ margin: 0, color: 'var(--text-dim)', lineHeight: 1.7 }}>
          This mode treats the uploaded flight data as healthy. The anomaly sample preview has been removed from the frontend,
          and only validation reconstruction error is shown for model quality.
        </p>
      </div>

      <div className="grid-2 section">
        <div className="card">
          <div className="card-title">Model Information</div>
          {info && (
            <div className="info-list">
              <div className="info-row"><span className="k">Architecture</span><span className="v">Transformer Autoencoder</span></div>
              <div className="info-row"><span className="k">Input size (features)</span><span className="v">{info.input_size}</span></div>
              <div className="info-row"><span className="k">Window size</span><span className="v">{info.window_size_timesteps} steps ({info.window_duration_seconds}s)</span></div>
              <div className="info-row"><span className="k">Embedding dim (d_model)</span><span className="v">{info.d_model}</span></div>
              <div className="info-row"><span className="k">Attention heads</span><span className="v">{info.nhead}</span></div>
              <div className="info-row"><span className="k">Encoder / Decoder layers</span><span className="v">{info.num_encoder_layers} / {info.num_decoder_layers}</span></div>
              <div className="info-row"><span className="k">Latent (bottleneck) dim</span><span className="v">{info.latent_dim}</span></div>
              <div className="info-row"><span className="k">Feed-forward dim</span><span className="v">{info.dim_feedforward}</span></div>
              <div className="info-row"><span className="k">Trainable params</span><span className="v">{fmtInt(info.total_trainable_params)}</span></div>
              <div className="info-row"><span className="k">Threshold method</span><span className="v" style={{ fontWeight: 400, fontFamily: 'var(--font-ui)', textAlign: 'right', maxWidth: 260 }}>{info.threshold_method}</span></div>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-title">Training Configuration &amp; Result</div>
          {info && (
            <div className="info-list">
              <div className="info-row"><span className="k">Learning rate</span><span className="v">{info.learning_rate}</span></div>
              <div className="info-row"><span className="k">Weight decay</span><span className="v">{info.weight_decay}</span></div>
              <div className="info-row"><span className="k">Max epochs / patience</span><span className="v">{info.max_epochs} / {info.early_stopping_patience}</span></div>
              <div className="info-row"><span className="k">Epochs actually run</span><span className="v">{info.epochs_actually_run}</span></div>
              <div className="info-row"><span className="k">Best val loss (MSE)</span><span className="v">{info.best_val_loss_mse}</span></div>
              <div className="info-row"><span className="k">Training time</span><span className="v">{(info.training_time_seconds / 60).toFixed(1)} min</span></div>
            </div>
          )}
          {history && (
            <div style={{ marginTop: 16 }}>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={history}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                  <XAxis dataKey="epoch" stroke="var(--text-faint)" fontSize={10} />
                  <YAxis stroke="var(--text-faint)" fontSize={10} />
                  <Tooltip content={<ChartTooltip />} />
                  <Line type="monotone" dataKey="train_loss" name="Train loss" stroke={COLORS.cyan} dot={false} strokeWidth={1.5} />
                  <Line type="monotone" dataKey="val_loss" name="Val loss" stroke={COLORS.amber} dot={false} strokeWidth={1.5} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
