import { useRef, useState } from 'react';

export default function UploadPanel({ onFile, loading, fileName, error, hint }) {
  const inputRef = useRef(null);
  const [drag, setDrag] = useState(false);

  const handleFiles = (files) => {
    if (files && files[0]) onFile(files[0]);
  };

  return (
    <div>
      <div
        className={'upload-box' + (drag ? ' drag' : '')}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          handleFiles(e.dataTransfer.files);
        }}
      >
        <div style={{ fontSize: 22, marginBottom: 8 }}>⇪</div>
        <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 13.5 }}>
          {loading ? 'Running real inference through the trained model…' : 'Upload flight data (.parquet or .csv)'}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-faint)', marginBottom: 14 }}>
          {hint || 'Same schema as train.parquet — 44 flight-parameter columns, 2 Hz sampling.'}
        </div>
        <button className="btn primary" disabled={loading} onClick={() => inputRef.current?.click()}>
          {loading ? 'Processing…' : 'Choose file'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".parquet,.csv"
          onChange={(e) => handleFiles(e.target.files)}
        />
        {fileName && !loading && (
          <div className="footer-note">Last run: <span style={{ color: 'var(--text-dim)' }}>{fileName}</span></div>
        )}
      </div>
      {error && <div className="error-banner" style={{ marginTop: 12 }}>{error}</div>}
    </div>
  );
}
