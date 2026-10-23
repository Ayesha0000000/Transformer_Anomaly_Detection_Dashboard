import { useEffect, useMemo, useState } from 'react';
import PageHeader from '../components/PageHeader.jsx';
import EmptyState from '../components/EmptyState.jsx';
import api from '../api.js';
import { useResults } from '../store.jsx';
import { fmtCompact, fmtPct, fmtInt } from '../lib/stats.js';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
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

export default function ComparisonPage() {
  const [predInfo, setPredInfo] = useState(null);
  const [aeInfo, setAeInfo] = useState(null);
  const { predictionResult, predictionFileName, autoencoderResult, autoencoderFileName } = useResults();

  useEffect(() => {
    api.modelInfo('prediction').then(setPredInfo).catch(() => {});
    api.modelInfo('autoencoder').then(setAeInfo).catch(() => {});
  }, []);

  const bothLoaded = predInfo && aeInfo;
  const bothLive = predictionResult && autoencoderResult;

  const rows = useMemo(() => {
    if (!bothLoaded) return [];
    return [
      {
        metric: 'Total Samples (windows)',
        pred: predictionResult ? fmtInt(predictionResult.total_windows) : `${fmtInt(predInfo.train_windows + predInfo.val_windows)} (train+val)`,
        ae: autoencoderResult ? fmtInt(autoencoderResult.total_windows) : `${fmtInt(aeInfo.train_windows + aeInfo.val_windows)} (train+val)`,
      },
      {
        metric: 'Threshold',
        pred: predInfo.threshold.toFixed(4),
        ae: aeInfo.threshold.toFixed(4),
      },
      {
        metric: 'Best Validation Error (MSE)',
        pred: predInfo.best_val_loss_mse,
        ae: aeInfo.best_val_loss_mse,
      },
      {
        metric: 'Reconstruction Error',
        pred: 'N/A — not applicable',
        ae: autoencoderResult ? autoencoderResult.score_mean.toFixed(4) : aeInfo.val_score_mean.toFixed(4),
      },
      {
        metric: 'Trainable Parameters',
        pred: fmtInt(predInfo.total_trainable_params),
        ae: fmtInt(aeInfo.total_trainable_params),
      },
      {
        metric: 'Training Time',
        pred: `${(predInfo.training_time_seconds / 60).toFixed(1)} min`,
        ae: `${(aeInfo.training_time_seconds / 60).toFixed(1)} min`,
      },
    ];
  }, [bothLoaded, predInfo, aeInfo, predictionResult, autoencoderResult]);

  const anomalyCompareData = useMemo(() => {
    if (!bothLive) return [];
    return [
      { name: 'Normal', Prediction: predictionResult.normal_windows, Autoencoder: autoencoderResult.normal_windows },
      { name: 'Anomaly', Prediction: predictionResult.anomalous_windows, Autoencoder: autoencoderResult.anomalous_windows },
    ];
  }, [bothLive, predictionResult, autoencoderResult]);

  const anomalyRateData = useMemo(() => {
    if (!bothLive) return [];
    return [
      { name: 'Anomaly rate', Prediction: predictionResult.anomaly_rate * 100, Autoencoder: autoencoderResult.anomaly_rate * 100 },
    ];
  }, [bothLive, predictionResult, autoencoderResult]);

  const efficiencyData = useMemo(() => {
    if (!bothLoaded) return [];
    return [
      { name: 'Trainable params (K)', Prediction: predInfo.total_trainable_params / 1000, Autoencoder: aeInfo.total_trainable_params / 1000 },
      { name: 'Best val error (MSE)', Prediction: predInfo.best_val_loss_mse, Autoencoder: aeInfo.best_val_loss_mse },
      { name: 'Training time (min)', Prediction: predInfo.training_time_seconds / 60, Autoencoder: aeInfo.training_time_seconds / 60 },
    ];
  }, [bothLoaded, predInfo, aeInfo]);

  const verdict = useMemo(() => {
    if (!bothLoaded) return null;
    const criteria = [];

    criteria.push({
      label: 'Lower validation error (healthy-data fit)',
      winner: predInfo.best_val_loss_mse < aeInfo.best_val_loss_mse ? 'prediction' : 'autoencoder',
      detail: `Prediction ${predInfo.best_val_loss_mse.toFixed(4)} vs Autoencoder ${aeInfo.best_val_loss_mse.toFixed(4)} (MSE, scaled feature space)`,
    });

    const predCV = predInfo.val_score_std / predInfo.val_score_mean;
    const aeCV = aeInfo.val_score_std / aeInfo.val_score_mean;
    criteria.push({
      label: 'More stable error distribution (lower CV = steadier threshold)',
      winner: predCV < aeCV ? 'prediction' : 'autoencoder',
      detail: `Prediction CV ${predCV.toFixed(2)} vs Autoencoder CV ${aeCV.toFixed(2)} (std/mean of validation score)`,
    });

    criteria.push({
      label: 'Parameter efficiency (fewer trainable params)',
      winner: predInfo.total_trainable_params < aeInfo.total_trainable_params ? 'prediction' : 'autoencoder',
      detail: `Prediction ${fmtInt(predInfo.total_trainable_params)} vs Autoencoder ${fmtInt(aeInfo.total_trainable_params)} params`,
    });

    criteria.push({
      label: 'Faster to train',
      winner: predInfo.training_time_seconds < aeInfo.training_time_seconds ? 'prediction' : 'autoencoder',
      detail: `Prediction ${(predInfo.training_time_seconds / 60).toFixed(1)} min vs Autoencoder ${(aeInfo.training_time_seconds / 60).toFixed(1)} min`,
    });

    const predWins = criteria.filter(c => c.winner === 'prediction').length;
    const aeWins = criteria.filter(c => c.winner === 'autoencoder').length;

    return { criteria, predWins, aeWins, tied: predWins === aeWins };
  }, [bothLoaded, predInfo, aeInfo]);

  return (
    <div>
      <PageHeader
        eyebrow="Page 3 · Head-to-head"
        title="Transformer Approach Comparison"
        description="Prediction-based vs. Autoencoder-based anomaly detection, compared on everything that was actually measured in the source notebooks."
      />

      {!bothLoaded && <EmptyState title="Loading model metadata…" />}

      {bothLoaded && (
        <>
          <div className="card section">
            <div className="card-title">Comparison KPI Table</div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Metric</th>
                  <th>Prediction Approach</th>
                  <th>Autoencoder Approach</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i}>
                    <td className="label-cell">{r.metric}</td>
                    <td>{r.pred}</td>
                    <td>{r.ae}</td>
                  </tr>
                ))}
              </tbody>
            </table>

          </div>

          {!bothLive && (
            <div className="card section">
              <EmptyState
                icon="⇪"
                title="Upload live results for a full side-by-side"
                description="Run inference on both the Prediction and Autoencoder pages with the same uploaded flight-data file to unlock live anomaly-count and anomaly-rate comparison charts below."
              />
            </div>
          )}

          {bothLive && (
            <div className="grid-2 section">
              <div className="card">
                <div className="card-title">Anomaly Detection Comparison <span className="badge neutral">live</span></div>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={anomalyCompareData}>
                    <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                    <XAxis dataKey="name" stroke="var(--text-faint)" fontSize={11} />
                    <YAxis stroke="var(--text-faint)" fontSize={11} />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend />
                    <Bar dataKey="Prediction" fill={COLORS.cyan} radius={[3, 3, 0, 0]} />
                    <Bar dataKey="Autoencoder" fill={COLORS.amber} radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                <div className="footer-note">
                  Prediction file: {predictionFileName} · Autoencoder file: {autoencoderFileName}
                  {predictionFileName !== autoencoderFileName && ' — different files were uploaded on each page, so counts are not directly paired.'}
                </div>
              </div>
              <div className="card">
                <div className="card-title">Anomaly Rate Comparison <span className="badge neutral">live</span></div>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={anomalyRateData}>
                    <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                    <XAxis dataKey="name" stroke="var(--text-faint)" fontSize={11} />
                    <YAxis stroke="var(--text-faint)" fontSize={11} unit="%" />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend />
                    <Bar dataKey="Prediction" fill={COLORS.cyan} radius={[3, 3, 0, 0]} />
                    <Bar dataKey="Autoencoder" fill={COLORS.amber} radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <div className="card section">
            <div className="card-title">Score / Error Comparison — Efficiency &amp; Fit</div>
            <p style={{ fontSize: 12.5, color: 'var(--text-faint)', marginTop: -6, marginBottom: 12 }}>
              The prediction model's anomaly score (next-step MSE) and the autoencoder's anomaly score
              (window reconstruction MSE) are different quantities computed over different targets, so their
              absolute score distributions are not directly comparable. What can be fairly compared is
              training/validation behavior on the same scaled feature space:
            </p>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={efficiencyData}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis dataKey="name" stroke="var(--text-faint)" fontSize={11} />
                <YAxis stroke="var(--text-faint)" fontSize={11} />
                <Tooltip content={<ChartTooltip />} />
                <Legend />
                <Bar dataKey="Prediction" fill={COLORS.cyan} radius={[3, 3, 0, 0]} />
                <Bar dataKey="Autoencoder" fill={COLORS.amber} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="section">
            <div style={{ marginBottom: 10, color: 'var(--text-dim)', fontSize: 13, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>
              Which Approach Performed Better?
            </div>
            <div className="winner-card">
              {verdict && (
                <>
                  <div className="winner-title">Best Performing Approach</div>
                  <div className="winner-name">
                    {verdict.tied
                      ? <>Tied — <span className="accent-cyan">Prediction</span> and <span className="accent-amber">Autoencoder</span> split the criteria evenly</>
                      : verdict.predWins > verdict.aeWins
                        ? <span className="accent-cyan">Transformer Prediction Approach</span>
                        : <span className="accent-amber">Transformer Autoencoder Approach</span>}
                  </div>
                  <p style={{ fontSize: 13.5, color: 'var(--text-dim)', lineHeight: 1.7, marginBottom: 16 }}>
                    Because neither notebook has ground-truth anomaly labels, this verdict is <strong>not</strong> a
                    classification-accuracy comparison — it's based on the operational signals that were actually
                    measured: how well each model fits its own healthy validation data, how stable/consistent its
                    error distribution is (which affects how trustworthy its fixed threshold is), and training
                    efficiency. {verdict.predWins} of {verdict.criteria.length} criteria favor the Prediction approach;{' '}
                    {verdict.aeWins} of {verdict.criteria.length} favor the Autoencoder approach.
                  </p>
                  <table className="data-table">
                    <thead><tr><th>Criterion</th><th>Winner</th><th>Basis</th></tr></thead>
                    <tbody>
                      {verdict.criteria.map((c, i) => (
                        <tr key={i}>
                          <td className="label-cell">{c.label}</td>
                          <td>
                            <span className={'badge ' + (c.winner === 'prediction' ? 'neutral' : 'amber')} style={c.winner === 'prediction' ? { color: 'var(--cyan)', background: 'var(--cyan-dim)' } : undefined}>
                              {c.winner === 'prediction' ? 'Prediction' : 'Autoencoder'}
                            </span>
                          </td>
                          <td className="label-cell" style={{ fontSize: 12 }}>{c.detail}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
