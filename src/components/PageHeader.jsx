export default function PageHeader({ eyebrow, title, description, right }) {
  return (
    <div className="page-header">
      <div>
        {eyebrow && (
          <div className="page-eyebrow">
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--cyan)', display: 'inline-block' }} />
            {eyebrow}
          </div>
        )}
        <h1 className="page-title">{title}</h1>
        {description && <p className="page-desc">{description}</p>}
      </div>
      {right}
    </div>
  );
}
