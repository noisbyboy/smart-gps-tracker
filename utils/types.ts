export interface GPSData {
  lat: number;
  lon: number;
  speed: number;
  timestamp: number;
}

export interface PredictionResponse {
  activity: string;
  confidence?: number; // To be populated by frontend logic for the component
  confidence_scores?: {
    activity_confidence?: number;
  };
  predicted_location: {
    lat: number;
    lon: number;
  };
  is_anomaly: boolean;
}
