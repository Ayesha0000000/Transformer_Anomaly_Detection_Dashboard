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

export default function PredictionPage() {
  const [info, setInfo] = useState(null);
  const [history, setHistory] = useState(null);
  const [correlation, setCorrelation] = useState(null);
  const [datasetInfo, setDatasetInfo] = useState(null);

  const { predictionResult: result, setPredictionResult: setResult,
    predictionFileName: fileName, setPredictionFileName: setFileName } = useResults();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.modelInfo('prediction').then(setInfo).catch(() => {});
    api.trainingHistory('prediction').then(setHistory).catch(() => {});
    api.correlation().then(setCorrelation).catch(() => {});
    api.datasetInfo().then(setDatasetInfo).catch(() => {});
  }, []);

  const handleFile = async (file) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.inferPrediction(file);
      setResult(res);
      setFileName(file.name);
    } catch (e) {
      setError(e.message);
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const scoreHist = useMemo(() => (result ? histogram(result.scores, 34) : []), [result]);
  const timeline = useMemo(() => (result ? downsample(result.scores, 500) : []), [result]);
  const pieData = useMemo(() => (result ? [
    { name: 'Normal', value: result.normal_windows },
    { name: 'Anomaly', value: result.anomalous_windows },
  ] : []), [result]);

  return (
    <div>
      <PageHeader
        eyebrow="Page 1 · Prediction approach"
        title="Transformer Prediction-Based Anomaly Detection"
        description="A Transformer encoder consumes a 120-timestep window (60s @ 2Hz) of all 44 flight parameters and predicts the very next reading. The squared error between prediction and reality is the anomaly score."
      />

      <div className="kpi-grid">
        <KpiCard label="Detection Threshold" value={info ? info.threshold.toFixed(3) : '—'} sub="mean + 3·std of val error" accent={COLORS.amber} />
        <KpiCard label="Val Score Mean" value={info ? info.val_score_mean.toFixed(4) : '—'} sub="healthy baseline MSE" />
        <KpiCard label="Val Score Std" value={info ? info.val_score_std.toFixed(4) : '—'} sub="healthy baseline variance" />
        <KpiCard label="Train / Val Windows" value={info ? `${fmtInt(info.train_windows)} / ${fmtInt(info.val_windows)}` : '—'} sub="70/30 random split" />
        {result ? (
          <>
            <KpiCard label="Total Samples" value={fmtInt(result.total_windows)} sub="windows in uploaded file" accent={COLORS.cyan} />
            <KpiCard label="Normal Samples" value={fmtInt(result.normal_windows)} sub={fmtPct(result.normal_windows / result.total_windows)} accent={COLORS.normal} />
            <KpiCard label="Anomalous Samples" value={fmtInt(result.anomalous_windows)} sub={fmtPct(result.anomaly_rate)} accent={COLORS.anomaly} />
            <KpiCard label="Anomaly Rate" value={fmtPct(result.anomaly_rate)} sub={`live · ${fileName}`} accent={COLORS.anomaly} />
          </>
        ) : (
          <>
            <KpiCard label="Total Samples" value="—" sub="upload data below" />
            <KpiCard label="Normal Samples" value="—" sub="upload data below" />
            <KpiCard label="Anomalous Samples" value="—" sub="upload data below" />
            <KpiCard label="Anomaly Rate" value="—" sub="upload data below" />
          </>
        )}
      </div>

      <div className="grid-2 section">
        <div className="card">
          <div className="card-title">Live Inference <span className="badge neutral">real model, real weights</span></div>
          <UploadPanel onFile={handleFile} loading={loading} fileName={fileName} error={error} />
        </div>

        <div className="card">
          <div className="card-title">Anomaly Distribution</div>
          {result ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3}>
                  <Cell fill={COLORS.normal} />
                  <Cell fill={COLORS.anomaly} />
                </Pie>
                <Tooltip content={<ChartTooltip />} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState icon="◑" title="No live results yet" description="Upload a flight-data file to compute the real normal/anomaly split." />
          )}
        </div>
      </div>

      <div className="card section">
        <div className="card-title">Prediction / Anomaly Timeline</div>
        {result ? (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={timeline}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="i" stroke="var(--text-faint)" fontSize={11} label={{ value: 'window index', position: 'insideBottom', offset: -4, fill: 'var(--text-faint)', fontSize: 11 }} />
              <YAxis stroke="var(--text-faint)" fontSize={11} />
              <Tooltip content={<ChartTooltip />} />
              <ReferenceLine y={result.threshold} stroke={COLORS.amber} strokeDasharray="5 4" label={{ value: 'threshold', fill: COLORS.amber, fontSize: 11, position: 'right' }} />
              <Line type="monotone" dataKey="v" name="Prediction error (MSE)" stroke={COLORS.cyan} dot={false} strokeWidth={1.6} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState icon="〰" title="Timeline unavailable" description="Requires live inference — upload a flight-data file above." />
        )}
      </div>

      <div className="grid-2 section">
        <div className="card">
          <div className="card-title">Prediction Error Distribution</div>
          {result ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={scoreHist}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis dataKey="bucket" stroke="var(--text-faint)" fontSize={10} interval={5} />
                <YAxis stroke="var(--text-faint)" fontSize={11} />
                <Tooltip content={<ChartTooltip />} />
                <ReferenceLine x={scoreHist.find(b => result.threshold >= b.x0 && result.threshold <= b.x1)?.bucket} stroke={COLORS.amber} strokeDasharray="5 4" />
                <Bar dataKey="count" name="Windows" radius={[3, 3, 0, 0]}>
                  {scoreHist.map((b, i) => (
                    <Cell key={i} fill={b.x1 > result.threshold ? COLORS.anomaly : COLORS.cyan} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState icon="▤" title="Distribution unavailable" description="Requires live inference — upload a flight-data file above." />
          )}
        </div>

        <div className="card">
          <div className="card-title">Top Correlated Feature Pairs <span className="badge neutral">from training data</span></div>
          {correlation ? (
            <table className="data-table">
              <thead><tr><th>Feature 1</th><th>Feature 2</th><th style={{ textAlign: 'right' }}>r</th></tr></thead>
              <tbody>
                {correlation.slice(0, 8).map((c, i) => (
                  <tr key={i}>
                    <td className="label-cell">{c.feature_1}</td>
                    <td className="label-cell">{c.feature_2}</td>
                    <td style={{ textAlign: 'right', color: Math.abs(c.correlation) > 0.99 ? COLORS.amber : 'var(--text)' }}>{c.correlation.toFixed(4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <EmptyState title="Loading…" />}
          <div className="footer-note">
            Feature-level importance/attention weights were not computed in the source notebook for this approach,
            so they are intentionally omitted here rather than estimated. The correlation structure above is the
            actual Pearson matrix computed on the training data and is what the model's self-attention has to capture.
          </div>
        </div>
      </div>

      <div className="grid-2 section">
        <div className="card">
          <div className="card-title">Model Information</div>
          {info && (
            <div className="info-list">
              <div className="info-row"><span className="k">Architecture</span><span className="v">Transformer Encoder</span></div>
              <div className="info-row"><span className="k">Input size (features)</span><span className="v">{info.input_size}</span></div>
              <div className="info-row"><span className="k">Window size</span><span className="v">{info.window_size_timesteps} steps ({info.window_duration_seconds}s)</span></div>
              <div className="info-row"><span className="k">Sample rate</span><span className="v">{info.sample_rate_hz} Hz</span></div>
              <div className="info-row"><span className="k">Window stride</span><span className="v">{info.window_stride}</span></div>
              <div className="info-row"><span className="k">Embedding dim (d_model)</span><span className="v">{info.d_model}</span></div>
              <div className="info-row"><span className="k">Attention heads</span><span className="v">{info.nhead}</span></div>
              <div className="info-row"><span className="k">Encoder layers</span><span className="v">{info.num_encoder_layers}</span></div>
              <div className="info-row"><span className="k">Feed-forward dim</span><span className="v">{info.dim_feedforward}</span></div>
              <div className="info-row"><span className="k">Dropout</span><span className="v">{info.dropout}</span></div>
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
              <div className="info-row"><span className="k">Batch size</span><span className="v">64</span></div>
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
