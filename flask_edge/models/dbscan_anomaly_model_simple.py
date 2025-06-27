# File: flask_edge/models/dbscan_anomaly_model_simple.py
# Simplified DBSCAN Clustering for Route Anomaly Detection

import numpy as np
import math

class AnomalyDetector:
    """
    Simplified anomaly detector for GPS route deviation detection
    Uses distance-based approach instead of complex DBSCAN clustering
    """
    
    def __init__(self, threshold_meters=500):
        self.threshold_meters = threshold_meters
        self.normal_locations = []
        self.is_trained = False
        
    def detect_anomaly(self, current_location, route_history):
        """
        Detect if current location is anomalous based on route history
        
        Args:
            current_location: dict with 'lat', 'lon' keys
            route_history: List of historical GPS points
            
        Returns:
            bool: True if anomaly detected, False otherwise
        """
        try:
            # Need sufficient history for anomaly detection
            if len(route_history) < 5:
                return False  # Not enough data to determine normal behavior
            
            # Store normal locations from history
            if not self.is_trained:
                self.normal_locations = [(point['lat'], point['lon']) for point in route_history[-50:]]
                self.is_trained = True
            
            # Calculate minimum distance to any normal location
            current_lat = current_location['lat']
            current_lon = current_location['lon']
            
            min_distance = float('inf')
            for lat, lon in self.normal_locations:
                distance = self._haversine_distance(current_lat, current_lon, lat, lon)
                min_distance = min(min_distance, distance)
            
            # Current location is anomalous if it's too far from any normal location
            is_anomaly = min_distance > self.threshold_meters
            
            return is_anomaly
            
        except Exception as e:
            print(f"Anomaly detection error: {e}")
            return False
    
    def _haversine_distance(self, lat1, lon1, lat2, lon2):
        """Calculate Haversine distance between two GPS coordinates in meters"""
        # Convert to radians
        lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
        
        # Haversine formula
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
        c = 2 * math.asin(math.sqrt(a))
        
        # Earth radius in meters
        r = 6371000
        
        return c * r
    
    def get_anomaly_confidence(self, current_location, route_history):
        """
        Get confidence score for anomaly detection
        
        Returns:
            dict: Contains anomaly confidence score and details
        """
        try:
            is_anomaly = self.detect_anomaly(current_location, route_history)
            
            if not self.normal_locations:
                return {
                    'confidence': 0.5,
                    'is_anomaly': False,
                    'reason': 'Insufficient training data'
                }
            
            # Calculate actual minimum distance
            current_lat = current_location['lat']
            current_lon = current_location['lon']
            
            min_distance = float('inf')
            for lat, lon in self.normal_locations:
                distance = self._haversine_distance(current_lat, current_lon, lat, lon)
                min_distance = min(min_distance, distance)
            
            # Convert distance to confidence
            normalized_distance = min_distance / self.threshold_meters
            
            if normalized_distance <= 1.0:
                confidence = 0.8 + (0.2 * (1.0 - normalized_distance))
            else:
                confidence = min(0.95, 0.5 + (0.45 * min(normalized_distance - 1.0, 1.0)))
            
            return {
                'confidence': confidence,
                'is_anomaly': is_anomaly,
                'min_distance': min_distance,
                'threshold': self.threshold_meters,
                'normalized_distance': normalized_distance
            }
            
        except Exception as e:
            return {
                'confidence': 0.5,
                'is_anomaly': False,
                'reason': f'Error: {str(e)}'
            }
