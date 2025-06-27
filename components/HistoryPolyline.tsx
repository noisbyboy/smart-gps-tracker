// File: components/HistoryPolyline.tsx

import React from 'react';
import { Polyline } from 'react-native-maps';
import { GPSData } from '../utils/types';

interface HistoryPolylineProps {
  history: GPSData[];
}

const HistoryPolyline: React.FC<HistoryPolylineProps> = ({ history }) => {
  // Safety check untuk memastikan history array valid dan tidak kosong
  if (!history || history.length < 2) {
    return null;
  }

  const coordinates = history
    .filter(point => point && point.lat && point.lon) // Filter invalid points
    .map((point) => ({
      latitude: point.lat,
      longitude: point.lon,
    }));

  // Jika tidak ada koordinat valid, jangan render
  if (coordinates.length < 2) {
    return null;
  }
  return (
    <Polyline
      key={`polyline-${coordinates.length}`}
      coordinates={coordinates}
      strokeColor="#4a90e2"
      strokeWidth={4}
    />
  );
};

export default HistoryPolyline;
