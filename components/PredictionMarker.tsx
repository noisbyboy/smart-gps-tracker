// File: components/PredictionMarker.tsx
// Marker untuk lokasi prediksi dari VAR

import React from 'react';
import { Marker } from 'react-native-maps';

interface PredictionMarkerProps {
  lat: number;
  lng: number;
}

const PredictionMarker: React.FC<PredictionMarkerProps> = ({ lat, lng }) => (
  <Marker
    coordinate={{ latitude: lat, longitude: lng }}
    title="Prediksi Lokasi"
    description="Lokasi yang diprediksi oleh AI"
    pinColor="green"
    identifier="prediction-marker"
  />
);

export default PredictionMarker;
