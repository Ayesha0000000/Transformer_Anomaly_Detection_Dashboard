export default function KpiCard({ label, value, unit, sub, accent }) {
  return (
    <div className="kpi-card" style={accent ? { '--accent': accent } : undefined}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">
        {value}
        {unit && <span className="kpi-unit">{unit}</span>}
      </div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  );
}
