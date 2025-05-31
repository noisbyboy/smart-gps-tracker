// File: components/HistoryPolyline.tsx

import React from 'react';
import { Polyline } from 'react-native-maps';
import { GPSData } from '../utils/types';

interface HistoryPolylineProps {
  history: GPSData[];
}

const HistoryPolyline: React.FC<HistoryPolylineProps> = ({ history }) => {
  const coordinates = history.map((point) => ({
    latitude: point.lat,
    longitude: point.lon,
  }));

  return (
    <Polyline
      coordinates={coordinates}
      strokeColor="#4a90e2"
      strokeWidth={4}
    />
  );
};

export default HistoryPolyline;
