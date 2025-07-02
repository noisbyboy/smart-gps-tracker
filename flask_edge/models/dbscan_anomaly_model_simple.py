# File: flask_edge/models/dbscan_anomaly_model_simple.py
# Context-Aware Anomaly Detection for GPS Route Tracking

import numpy as np
import math
import sqlite3
from datetime import datetime, timedelta

class AnomalyDetector:
    """
    Context-aware anomaly detector for GPS route deviation detection
    Uses dynamic thresholds based on activity type and user behavior patterns
    """
    
    def __init__(self, base_threshold_meters=1000):
        # Dynamic thresholds based on activity
        self.thresholds = {
            'stationary': 2000,      # More tolerant for stationary points
            'walking': 800,          # Normal tolerance for walking
            'running': 1200,         # Slightly more for running (varied routes)
            'cycling': 1500,         # More tolerance for cycling routes
            'driving': 2500,         # Much more tolerance for driving (highways, detours)
            'unknown': base_threshold_meters
        }
        
        self.normal_locations = []
        self.frequent_locations = {}  # Store frequently visited locations
        self.is_trained = False
        self.min_training_points = 20
        
    def detect_anomaly(self, current_location, route_history, activity='unknown'):
        """
        Context-aware anomaly detection with dynamic thresholds
        
        Args:
            current_location: dict with 'lat', 'lon', 'speed' keys
            route_history: List of historical GPS points
            activity: Current activity type (stationary, walking, etc.)
            
        Returns:
            bool: True if anomaly detected, False otherwise
        """
        try:
            # Need sufficient history for anomaly detection
            if len(route_history) < self.min_training_points:
                return False  # Not enough data to determine normal behavior
            
            # Load and update training data
            self._update_training_data(route_history)
            
            # Get dynamic threshold based on activity and context
            threshold = self._get_dynamic_threshold(current_location, activity)
            
            # Context-based filtering: Skip anomaly detection for certain scenarios
            if self._should_skip_detection(current_location, activity):
                return False
            
            # Calculate minimum distance to normal locations
            current_lat = current_location['lat']
            current_lon = current_location['lon']
            
            min_distance = self._calculate_min_distance_to_normal(current_lat, current_lon)
            
            # Check if location is anomalous
            is_anomaly = min_distance > threshold
            
            # Additional context checks
            if is_anomaly:
                is_anomaly = self._validate_anomaly(current_location, activity, min_distance, threshold)
            
            return is_anomaly
            
        except Exception as e:
            print(f"Anomaly detection error: {e}")
            return False
    
    def _update_training_data(self, route_history):
        """Update training data with recent history and frequent locations"""
        if not self.is_trained:
            # Initial training: use recent history
            self.normal_locations = [(point['lat'], point['lon']) for point in route_history[-100:]]
            
            # Build frequent locations from database history
            self._build_frequent_locations()
            self.is_trained = True
        else:
            # Incremental update: add recent points
            recent_points = [(point['lat'], point['lon']) for point in route_history[-10:]]
            self.normal_locations.extend(recent_points)
            
            # Keep only recent 200 points to avoid memory issues
            if len(self.normal_locations) > 200:
                self.normal_locations = self.normal_locations[-200:]
    
    def _build_frequent_locations(self):
        """Build frequently visited locations from historical data"""
        try:
            conn = sqlite3.connect('gps_data.db')
            
            # Get stationary points with low speed (likely frequent locations)
            query = '''
                SELECT latitude, longitude, COUNT(*) as frequency
                FROM gps_data 
                WHERE speed < 2.0 AND activity IN ('stationary', 'unknown')
                GROUP BY ROUND(latitude, 4), ROUND(longitude, 4)
                HAVING frequency >= 3
                ORDER BY frequency DESC
                LIMIT 20
            '''
            
            cursor = conn.cursor()
            cursor.execute(query)
            results = cursor.fetchall()
            
            for lat, lon, freq in results:
                location_key = f"{lat:.4f},{lon:.4f}"
                self.frequent_locations[location_key] = {
                    'lat': lat,
                    'lon': lon,
                    'frequency': freq,
                    'radius': max(500, min(2000, freq * 100))  # Dynamic radius based on frequency
                }
            
            conn.close()
            
        except Exception as e:
            print(f"Error building frequent locations: {e}")
            self.frequent_locations = {}
    
    def _get_dynamic_threshold(self, current_location, activity):
        """Get dynamic threshold based on activity and location context"""
        base_threshold = self.thresholds.get(activity, self.thresholds['unknown'])
        
        # Check if near frequent location
        if self._is_near_frequent_location(current_location):
            return base_threshold * 1.5  # More tolerant near frequent locations
        
        # Adjust based on speed
        speed = current_location.get('speed', 0)
        if speed < 2.0:  # Stationary or very slow
            return max(base_threshold, 1500)  # Minimum 1.5km for stationary
        elif speed > 50:  # High speed (highway driving)
            return base_threshold * 2  # Double tolerance for high speed
        
        return base_threshold
    
    def _should_skip_detection(self, current_location, activity):
        """Check if anomaly detection should be skipped for this scenario"""
        speed = current_location.get('speed', 0)
        
        # Skip for stationary points with very low speed
        if activity == 'stationary' and speed < 1.0:
            return True
        
        # Skip if near a frequent location with low speed
        if speed < 5.0 and self._is_near_frequent_location(current_location):
            return True
        
        return False
    
    def _is_near_frequent_location(self, current_location):
        """Check if current location is near a frequently visited location"""
        current_lat = current_location['lat']
        current_lon = current_location['lon']
        
        for location_data in self.frequent_locations.values():
            distance = self._haversine_distance(
                current_lat, current_lon,
                location_data['lat'], location_data['lon']
            )
            if distance <= location_data['radius']:
                return True
        
        return False
    
    def _calculate_min_distance_to_normal(self, current_lat, current_lon):
        """Calculate minimum distance to any normal location"""
        min_distance = float('inf')
        
        # Check distance to normal route points
        for lat, lon in self.normal_locations:
            distance = self._haversine_distance(current_lat, current_lon, lat, lon)
            min_distance = min(min_distance, distance)
        
        # Check distance to frequent locations
        for location_data in self.frequent_locations.values():
            distance = self._haversine_distance(
                current_lat, current_lon,
                location_data['lat'], location_data['lon']
            )
            min_distance = min(min_distance, distance)
        
        return min_distance
    
    def _validate_anomaly(self, current_location, activity, min_distance, threshold):
        """Additional validation for potential anomalies"""
        speed = current_location.get('speed', 0)
        
        # Very strict validation for stationary points
        if activity == 'stationary' and speed < 2.0:
            # Only flag as anomaly if VERY far from any known location
            return min_distance > (threshold * 2)
        
        # Less strict for moving activities
        if activity in ['walking', 'running'] and speed > 1.0:
            return min_distance > threshold
        
        # Normal validation for other cases
        return min_distance > threshold
    
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
    
    def get_anomaly_confidence(self, current_location, route_history, activity='unknown'):
        """
        Get enhanced confidence score for anomaly detection
        
        Returns:
            dict: Contains anomaly confidence score and detailed analysis
        """
        try:
            is_anomaly = self.detect_anomaly(current_location, route_history, activity)
            
            if not self.normal_locations and not self.frequent_locations:
                return {
                    'confidence': 0.5,
                    'is_anomaly': False,
                    'reason': 'Insufficient training data',
                    'activity': activity,
                    'threshold_used': self.thresholds.get(activity, self.thresholds['unknown'])
                }
            
            # Calculate distances and metrics
            current_lat = current_location['lat']
            current_lon = current_location['lon']
            speed = current_location.get('speed', 0)
            
            min_distance = self._calculate_min_distance_to_normal(current_lat, current_lon)
            threshold = self._get_dynamic_threshold(current_location, activity)
            
            # Enhanced confidence calculation
            normalized_distance = min_distance / threshold
            
            # Base confidence from distance
            if normalized_distance <= 0.5:
                confidence = 0.95  # Very confident it's normal
            elif normalized_distance <= 1.0:
                confidence = 0.85 - (0.35 * normalized_distance)  # Decreasing confidence
            else:
                # Anomaly detected
                confidence = min(0.95, 0.6 + (0.35 * min(normalized_distance - 1.0, 1.0)))
            
            # Adjust confidence based on context
            if activity == 'stationary' and speed < 2.0:
                if not is_anomaly:
                    confidence = max(confidence, 0.9)  # High confidence for normal stationary
                else:
                    confidence = max(confidence, 0.8)  # Still fairly confident even if anomaly
            
            # Check if near frequent location
            near_frequent = self._is_near_frequent_location(current_location)
            if near_frequent and not is_anomaly:
                confidence = max(confidence, 0.92)
            
            return {
                'confidence': confidence,
                'is_anomaly': is_anomaly,
                'min_distance': min_distance,
                'threshold': threshold,
                'normalized_distance': normalized_distance,
                'activity': activity,
                'speed': speed,
                'near_frequent_location': near_frequent,
                'threshold_used': threshold,
                'training_points': len(self.normal_locations),
                'frequent_locations_count': len(self.frequent_locations)
            }
            
        except Exception as e:
            return {
                'confidence': 0.5,
                'is_anomaly': False,
                'reason': f'Error: {str(e)}',
                'activity': activity
            }
