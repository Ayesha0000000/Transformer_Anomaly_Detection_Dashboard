export function histogram(values, bins = 30) {
  if (!values || values.length === 0) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const width = span / bins;
  const buckets = Array.from({ length: bins }, (_, i) => ({
    x0: min + i * width,
    x1: min + (i + 1) * width,
    count: 0,
  }));
  for (const v of values) {
    let idx = Math.floor((v - min) / width);
    if (idx >= bins) idx = bins - 1;
    if (idx < 0) idx = 0;
    buckets[idx].count += 1;
  }
  return buckets.map((b) => ({
    bucket: `${fmtCompact(b.x0)}`,
    x0: b.x0,
    x1: b.x1,
    count: b.count,
  }));
}

export function fmtCompact(n) {
  if (n === undefined || n === null || Number.isNaN(n)) return '—';
  const abs = Math.abs(n);
  if (abs >= 1000) return n.toFixed(0);
  if (abs >= 1) return n.toFixed(2);
  if (abs >= 0.001) return n.toFixed(4);
  return n.toExponential(2);
}

export function fmtPct(n, digits = 1) {
  if (n === undefined || n === null || Number.isNaN(n)) return '—';
  return `${(n * 100).toFixed(digits)}%`;
}

export function fmtInt(n) {
  if (n === undefined || n === null || Number.isNaN(n)) return '—';
  return n.toLocaleString();
}

export function downsample(arr, maxPoints = 400) {
  if (!arr || arr.length <= maxPoints) return arr.map((v, i) => ({ i, v }));
  const step = Math.ceil(arr.length / maxPoints);
  const out = [];
  for (let i = 0; i < arr.length; i += step) {
    out.push({ i, v: arr[i] });
  }
  return out;
}
