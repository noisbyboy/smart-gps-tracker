// Marker untuk lokasi prediksi dari VAR
import React from 'react';

const PredictionMarker = ({ lat, lng }: { lat: number; lng: number }) => (
  <div style={{ color: 'blue' }}>
    {/* Implementasi marker sesuai kebutuhan peta */}
    <span role="img" aria-label="Prediction">🔵</span> Prediksi ({lat}, {lng})
  </div>
);

export default PredictionMarker;
