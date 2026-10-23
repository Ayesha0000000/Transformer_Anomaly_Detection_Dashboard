import { Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar.jsx';
import { ResultsProvider } from './store.jsx';
import Overview from './pages/Overview.jsx';
import PredictionPage from './pages/PredictionPage.jsx';
import AutoencoderPage from './pages/AutoencoderPage.jsx';
import ComparisonPage from './pages/ComparisonPage.jsx';

export default function App() {
  return (
    <ResultsProvider>
      <div className="app-shell">
        <Sidebar />
        <main className="main">
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/prediction" element={<PredictionPage />} />
            <Route path="/autoencoder" element={<AutoencoderPage />} />
            <Route path="/comparison" element={<ComparisonPage />} />
          </Routes>
        </main>
      </div>
    </ResultsProvider>
  );
}
