import { createContext, useContext, useState } from 'react';

const ResultsContext = createContext(null);

export function ResultsProvider({ children }) {
  const [predictionResult, setPredictionResult] = useState(null);
  const [predictionFileName, setPredictionFileName] = useState(null);
  const [autoencoderResult, setAutoencoderResult] = useState(null);
  const [autoencoderFileName, setAutoencoderFileName] = useState(null);

  return (
    <ResultsContext.Provider value={{
      predictionResult, setPredictionResult,
      predictionFileName, setPredictionFileName,
      autoencoderResult, setAutoencoderResult,
      autoencoderFileName, setAutoencoderFileName,
    }}>
      {children}
    </ResultsContext.Provider>
  );
}

export function useResults() {
  const ctx = useContext(ResultsContext);
  if (!ctx) throw new Error('useResults must be used inside ResultsProvider');
  return ctx;
}
