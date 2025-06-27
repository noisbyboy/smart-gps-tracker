// Konfigurasi axios untuk komunikasi ke Flask API
import axios from 'axios';
import { GPSData, PredictionResponse } from './types';

const api = axios.create({
  baseURL: 'http://192.168.18.41:5000', // Updated IP address
  timeout: 5000,
});

// API functions for real data
export const fetchLatestPrediction = async (): Promise<{ location: GPSData; prediction: PredictionResponse } | null> => {
  try {
    const response = await api.get('/history?limit=1');
    const latestData = response.data.data[0]; // Updated to handle new response format
    
    if (!latestData) return null;

    const location: GPSData = {
      lat: latestData.lat || latestData.latitude,
      lon: latestData.lon || latestData.longitude,
      speed: latestData.speed || 0,
      timestamp: latestData.timestamp || Date.now()
    };

    const prediction: PredictionResponse = {
      activity: latestData.activity || 'unknown',
      predicted_location: { lat: location.lat + 0.001, lon: location.lon + 0.001 },
      is_anomaly: latestData.is_anomaly || false
    };

    return { location, prediction };
  } catch (error) {
    console.error('Error fetching latest data:', error);
    return null;
  }
};

export const fetchGPSHistory = async (limit: number = 50): Promise<GPSData[]> => {
  try {
    const response = await api.get(`/history?limit=${limit}`);
    return response.data.data.map((item: any) => ({
      lat: item.lat || item.latitude,
      lon: item.lon || item.longitude,
      speed: item.speed || 0,
      timestamp: item.timestamp || Date.now()
    }));
  } catch (error) {
    console.error('Error fetching GPS history:', error);
    return [];
  }
};

export const fetchRouteHistory = async () => {
  try {
    console.log('fetchRouteHistory: Making request to', api.defaults.baseURL + '/history');
    const response = await api.get('/history');
    console.log('fetchRouteHistory: Response status', response.status);
    console.log('fetchRouteHistory: Response data structure', Object.keys(response.data));
    return response.data.data || response.data; // Handle both response formats
  } catch (error) {
    console.error('Error fetching route history:', error);
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as any;
      console.error('Response error status:', axiosError.response?.status);
      console.error('Response error data:', axiosError.response?.data);
    }
    return [];
  }
};

export default api;
