export default function EmptyState({ icon = '◌', title, description }) {
  return (
    <div className="empty-state">
      <div className="icon">{icon}</div>
      {title && <div style={{ color: 'var(--text-dim)', fontWeight: 600, marginBottom: 4 }}>{title}</div>}
      {description && <div>{description}</div>}
    </div>
  );
}
