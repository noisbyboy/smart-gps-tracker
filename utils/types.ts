export interface GPSData {
  lat: number;
  lon: number;
  speed: number;
  timestamp: number;
}

export interface PredictionResponse {
  activity: string;
  predicted_location: {
    lat: number;
    lon: number;
  };
  is_anomaly: boolean;
}
    