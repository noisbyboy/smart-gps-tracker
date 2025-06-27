# File: flask_edge/models/var_model.py
# VAR (Vector Autoregression) Model for GPS Location Prediction
# Predicts next GPS coordinates based on historical location data

import numpy as np
import pandas as pd
from statsmodels.tsa.vector_ar.var_model import VAR
from statsmodels.tsa.stattools import adfuller
import warnings
from datetime import datetime, timedelta

warnings.filterwarnings('ignore')

class VARLocationPredictor:
    """
    VAR (Vector Autoregression) model for predicting next GPS location
    based on time series analysis of latitude and longitude coordinates
    """
    
    def __init__(self, min_data_points=10, max_lag=5):
        self.min_data_points = min_data_points
        self.max_lag = max_lag
        self.model = None
        self.fitted_model = None
        self.last_training_data = None
        
    def prepare_data(self, gps_history):
        """
        Prepare GPS data for VAR model training
        
        Args:
            gps_history: List of GPS data points with 'lat', 'lon', 'timestamp'
            
        Returns:
            pandas.DataFrame: Prepared time series data
        """
        if len(gps_history) < self.min_data_points:
            raise ValueError(f"Insufficient data points. Need at least {self.min_data_points}, got {len(gps_history)}")
        
        # Convert to DataFrame
        df = pd.DataFrame(gps_history)
        
        # Sort by timestamp
        df = df.sort_values('timestamp')
        
        # Create time-based features
        df['datetime'] = pd.to_datetime(df['timestamp'], unit='s')
        df = df.set_index('datetime')
        
        # Select only lat/lon for VAR model
        ts_data = df[['lat', 'lon']].copy()
        
        # Handle missing values
        ts_data = ts_data.dropna()
        
        # Calculate differences for stationarity
        ts_data['lat_diff'] = ts_data['lat'].diff()
        ts_data['lon_diff'] = ts_data['lon'].diff()
        
        # Use differences if they're more stationary
        if self._is_stationary(ts_data['lat_diff'].dropna()) and self._is_stationary(ts_data['lon_diff'].dropna()):
            return ts_data[['lat_diff', 'lon_diff']].dropna()
        else:
            return ts_data[['lat', 'lon']]
    
    def _is_stationary(self, series):
        """Check if time series is stationary using Augmented Dickey-Fuller test"""
        try:
            result = adfuller(series.dropna())
            return result[1] <= 0.05  # p-value <= 0.05 indicates stationarity
        except:
            return False
    
    def _select_optimal_lag(self, data):
        """Select optimal lag order for VAR model using information criteria"""
        try:
            model = VAR(data)
            lag_order = model.select_order(maxlags=min(self.max_lag, len(data)//4))
            
            # Prefer AIC criterion, fallback to others
            if 'aic' in lag_order.selected_orders and lag_order.selected_orders['aic'] > 0:
                return lag_order.selected_orders['aic']
            elif 'bic' in lag_order.selected_orders and lag_order.selected_orders['bic'] > 0:
                return lag_order.selected_orders['bic']
            else:
                return min(2, len(data)//4)  # Conservative fallback
        except:
            return 1  # Minimum lag
    
    def train(self, gps_history):
        """
        Train VAR model on GPS history data
        
        Args:
            gps_history: List of GPS data points
        """
        try:
            # Prepare data
            ts_data = self.prepare_data(gps_history)
            
            # Select optimal lag
            optimal_lag = self._select_optimal_lag(ts_data)
            
            # Fit VAR model
            self.model = VAR(ts_data)
            self.fitted_model = self.model.fit(optimal_lag)
            self.last_training_data = ts_data
            
            print(f"VAR model trained with lag order: {optimal_lag}")
            print(f"Training data shape: {ts_data.shape}")
            
        except Exception as e:
            print(f"VAR training error: {e}")
            self.fitted_model = None
    
    def predict_next_location(self, gps_history, steps=1):
        """
        Predict next GPS location(s)
        
        Args:
            gps_history: List of GPS data points
            steps: Number of future steps to predict
            
        Returns:
            dict: Predicted latitude and longitude
        """
        try:
            # Check if we have enough varied data
            if len(gps_history) < self.min_data_points:
                return self._simple_extrapolation(gps_history)
            
            # Check for location variance to avoid constant column issues
            recent_lats = [point.get('lat', 0) for point in gps_history[-10:]]
            recent_lons = [point.get('lon', 0) for point in gps_history[-10:]]
            
            lat_variance = np.var(recent_lats) if len(recent_lats) > 1 else 0
            lon_variance = np.var(recent_lons) if len(recent_lons) > 1 else 0
            
            # If no significant movement, return current location with small offset
            if lat_variance < 1e-8 and lon_variance < 1e-8:
                current_lat = recent_lats[-1] if recent_lats else 0
                current_lon = recent_lons[-1] if recent_lons else 0
                
                # Add small random offset to simulate movement
                offset = 0.0001  # About 10 meters
                return {
                    'lat': current_lat + np.random.uniform(-offset, offset),
                    'lon': current_lon + np.random.uniform(-offset, offset)
                }
            
            # Try VAR prediction with error handling
            if self.fitted_model is None:
                self.train(gps_history)
            
            if self.fitted_model is not None:
                # Prepare current data
                ts_data = self.prepare_data(gps_history)
                
                # Make prediction
                forecast = self.fitted_model.forecast(ts_data.tail(self.fitted_model.k_ar).values, steps=steps)
                
                # Extract predicted coordinates
                if len(forecast) > 0:
                    predicted_lat = float(forecast[0][0])
                    predicted_lon = float(forecast[0][1])
                    
                    return {
                        'lat': predicted_lat,
                        'lon': predicted_lon
                    }
              # Fallback to simple extrapolation
            return self._simple_extrapolation(gps_history)
                
        except Exception as e:
            print(f"VAR prediction error: {e}")
            # Fallback to simple extrapolation
            return self._simple_extrapolation(gps_history)
    
    def _simple_extrapolation(self, gps_history):
        """Fallback prediction using simple linear extrapolation"""
        if len(gps_history) < 2:
            # If only one point, predict small movement
            # Use current location or default to Semarang coordinates
            if gps_history:
                last = gps_history[-1]
            else:
                # Default to Semarang coordinates instead of Jakarta
                last = {'lat': -7.005, 'lon': 110.438}
            
            return {
                'lat': last['lat'] + np.random.normal(0, 0.001),
                'lon': last['lon'] + np.random.normal(0, 0.001)
            }
        
        # Use last two points for linear extrapolation
        recent = gps_history[-2:]
        lat_diff = recent[1]['lat'] - recent[0]['lat']
        lon_diff = recent[1]['lon'] - recent[0]['lon']
        
        # Add some smoothing to avoid erratic predictions
        lat_diff = lat_diff * 0.8  # Damping factor
        lon_diff = lon_diff * 0.8
        
        return {
            'lat': recent[1]['lat'] + lat_diff,
            'lon': recent[1]['lon'] + lon_diff
        }
    
    def get_prediction_confidence(self, gps_history):
        """
        Calculate confidence score for predictions
        
        Returns:
            float: Confidence score between 0 and 1
        """
        try:
            if self.fitted_model is None:
                return 0.3  # Low confidence without model
            
            # Calculate based on model fit quality and data consistency
            data_consistency = self._calculate_data_consistency(gps_history)
            model_fit_quality = self._calculate_model_fit_quality()
            
            # Weighted average
            confidence = (data_consistency * 0.6) + (model_fit_quality * 0.4)
            return min(max(confidence, 0.0), 1.0)
            
        except:
            return 0.5  # Default moderate confidence
    
    def _calculate_data_consistency(self, gps_history):
        """Calculate how consistent the GPS data is"""
        if len(gps_history) < 3:
            return 0.5
        
        # Calculate variance in speed and direction
        speeds = []
        directions = []
        
        for i in range(1, len(gps_history)):
            prev = gps_history[i-1]
            curr = gps_history[i]
            
            # Calculate speed (simplified)
            lat_diff = curr['lat'] - prev['lat']
            lon_diff = curr['lon'] - prev['lon']
            distance = np.sqrt(lat_diff**2 + lon_diff**2)
            time_diff = max(curr['timestamp'] - prev['timestamp'], 1)
            speed = distance / time_diff
            speeds.append(speed)
            
            # Calculate direction
            direction = np.arctan2(lat_diff, lon_diff)
            directions.append(direction)
        
        # Lower variance = higher consistency
        speed_consistency = 1.0 / (1.0 + np.var(speeds))
        direction_consistency = 1.0 / (1.0 + np.var(directions))
        
        return (speed_consistency + direction_consistency) / 2
    
    def _calculate_model_fit_quality(self):
        """Calculate model fit quality based on residuals"""
        try:
            if self.fitted_model is None:
                return 0.3
            
            # Use AIC as proxy for model quality (lower is better)
            aic = self.fitted_model.aic
            
            # Convert to 0-1 scale (arbitrary scaling)
            quality = max(0.1, 1.0 / (1.0 + abs(aic) / 100))
            return quality
            
        except:
            return 0.5
    
    def get_model_info(self):
        """Get information about the current model"""
        if self.fitted_model is None:
            return {
                'status': 'untrained',
                'message': 'Model not trained yet'
            }
        
        return {
            'status': 'trained',
            'lag_order': self.fitted_model.k_ar,
            'variables': self.fitted_model.endog_names,
            'observations': self.fitted_model.nobs,
            'aic': self.fitted_model.aic,
            'bic': self.fitted_model.bic,
            'training_data_shape': self.last_training_data.shape if self.last_training_data is not None else None
        }