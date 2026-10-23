import { NavLink } from 'react-router-dom';

const links = [
  { to: '/', label: 'Overview' },
  { to: '/prediction', label: 'Prediction Approach' },
  { to: '/autoencoder', label: 'Autoencoder Approach' },
  { to: '/comparison', label: 'Comparison' },
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="brand">
        <img src="/logo.svg" alt="Ayesha logo" className="brand-logo" />
        <div className="brand-text">
          <div className="brand-title">Ayesha</div>
          <div className="brand-sub">National Aerospace S&amp;T Park</div>
        </div>
      </div>

      <div className="nav-group-label">Dashboard</div>
      {links.map((l) => (
        <NavLink
          key={l.to}
          to={l.to}
          end={l.to === '/'}
          className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}
        >
          <span className="nav-dot" />
          {l.label}
        </NavLink>
      ))}

      <div className="sidebar-footer">
        <div className="status-row">
          <span className="status-dot" />
          Prediction model loaded
        </div>
        <div className="status-row">
          <span className="status-dot" />
          Autoencoder model loaded
        </div>
        <div style={{ marginTop: 8 }}>session_id 240 · 44 features</div>
      </div>
    </aside>
  );
}
