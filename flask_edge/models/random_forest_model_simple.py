# File: flask_edge/models/random_forest_model_simple.py
# Simplified Random Forest Classifier for Activity Recognition

import numpy as np
from sklearn.ensemble import RandomForestClassifier
import joblib
import os

class ActivityClassifier:
    """
    Simplified Random Forest classifier for transportation activity recognition
    Uses only speed-based classification to avoid feature extraction complexity
    """
    
    def __init__(self, model_path='activity_model.pkl'):
        self.model = None
        self.model_path = model_path
        self.is_trained = False
        self.activity_labels = ['stationary', 'walking', 'cycling', 'motor', 'car', 'bus']
        
        # Try to load pre-trained model
        self._load_model()
    
    def classify_activity(self, current_gps, gps_history=None):
        """
        Classify current activity based on GPS speed
        
        Args:
            current_gps: Current GPS point with 'speed' key
            gps_history: Recent GPS history (optional, not used in simple version)
              Returns:
            str: Predicted activity class
        """
        try:
            # Get speed - ESP32 sends speed in km/h already
            speed_kmh = float(current_gps.get('speed', 0))
            
            # Speed-based activity classification with improved thresholds
            if speed_kmh < 2.0:  # Threshold untuk GPS noise saat diam
                return 'stationary'
            elif speed_kmh < 6.0:  # Typical walking speed 3-5 km/h
                return 'walking'
            elif speed_kmh < 15:
                return 'cycling'
            elif speed_kmh < 40:
                return 'motor'
            elif speed_kmh < 80:
                return 'car'
            else:
                return 'bus'
                
        except Exception as e:
            print(f"Activity classification error: {e}")
            return 'stationary'
    
    def get_prediction_confidence(self, current_gps, gps_history=None):
        """
        Get confidence score for the prediction
        
        Returns:
            float: Confidence score between 0 and 1
        """
        try:
            speed = float(current_gps.get('speed', 0)) * 3.6  # Convert to km/h
              # Higher confidence for typical speed ranges
            if speed < 2.0:  # stationary - increased threshold
                return 0.9
            elif speed < 6.0:  # walking - adjusted threshold  
                return 0.85
            elif speed < 15:  # cycling
                return 0.8
            elif speed < 40:  # motor
                return 0.85
            elif speed < 80:  # car
                return 0.9
            else:  # bus/high speed
                return 0.75
                
        except Exception as e:
            print(f"Confidence calculation error: {e}")
            return 0.5
    
    def _load_model(self):
        """Load pre-trained model if it exists"""
        if os.path.exists(self.model_path):
            try:
                loaded_data = joblib.load(self.model_path)
                
                # Handle different model formats
                if isinstance(loaded_data, dict):
                    self.model = loaded_data.get('model')
                    print("Model loaded from dictionary format")
                else:
                    self.model = loaded_data
                    print("Model loaded from direct format")
                
                self.is_trained = True
                
            except Exception as e:
                print(f"Error loading model: {e}")
                self.model = None
                self.is_trained = False
        else:
            print(f"No pre-trained model found at {self.model_path}")
    
    def _save_model(self):
        """Save the trained model"""
        try:
            if self.model is not None:
                joblib.dump(self.model, self.model_path)
                print(f"Model saved to {self.model_path}")
        except Exception as e:
            print(f"Error saving model: {e}")
    
    def train_with_synthetic_data(self):
        """Train model with synthetic data - simplified version"""
        try:
            print("Generating synthetic training data for activity classification...")
            
            # Create synthetic speed-based training data
            X = []
            y = []
            
            # Stationary (0-1 km/h)
            for _ in range(20):
                speed = np.random.uniform(0, 1)
                X.append([speed])
                y.append('stationary')
            
            # Walking (1-5 km/h)
            for _ in range(20):
                speed = np.random.uniform(1, 5)
                X.append([speed])
                y.append('walking')
            
            # Cycling (5-15 km/h)
            for _ in range(20):
                speed = np.random.uniform(5, 15)
                X.append([speed])
                y.append('cycling')
            
            # Motor (15-40 km/h)
            for _ in range(20):
                speed = np.random.uniform(15, 40)
                X.append([speed])
                y.append('motor')
            
            # Car (40-80 km/h)
            for _ in range(20):
                speed = np.random.uniform(40, 80)
                X.append([speed])
                y.append('car')
            
            # Bus (50-100 km/h)
            for _ in range(20):
                speed = np.random.uniform(50, 100)
                X.append([speed])
                y.append('bus')
            
            # Train the model
            X = np.array(X)
            y = np.array(y)
            
            self.model = RandomForestClassifier(n_estimators=50, random_state=42)
            self.model.fit(X, y)
            
            self.is_trained = True
            self._save_model()
            
            print(f"Synthetic model trained with {len(X)} samples")
            return True
            
        except Exception as e:
            print(f"Synthetic training error: {e}")
            return False
    
    def get_model_info(self):
        """Get information about the current model"""
        return {
            'algorithm': 'Speed-based Random Forest',
            'is_trained': self.is_trained,
            'model_path': self.model_path,
            'activity_labels': self.activity_labels,
            'features': ['speed']
        }
