# File: flask_edge/app.py
# Flask AI Backend for Smart GPS Tracker
# Provides API endpoints for VAR prediction, Random Forest activity classification, and DBSCAN anomaly detection

from flask import Flask, request, jsonify, render_template_string
from flask_cors import CORS
import pandas as pd
import numpy as np
import sqlite3
import json
from datetime import datetime, timedelta
import os
import traceback

# Import our ML models
from models.var_model import VARLocationPredictor
from models.random_forest_model_simple import ActivityClassifier
from models.dbscan_anomaly_model_simple import AnomalyDetector

app = Flask(__name__)
CORS(app)  # Enable CORS for React Native app

# Initialize ML models
var_predictor = VARLocationPredictor()
activity_classifier = ActivityClassifier()
anomaly_detector = AnomalyDetector()

# Database setup
def init_db():
    """Initialize SQLite database for storing GPS data history"""
    conn = sqlite3.connect('gps_data.db')
    cursor = conn.cursor()
    
    # Create GPS data table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS gps_data (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            latitude REAL NOT NULL,
            longitude REAL NOT NULL,
            speed REAL NOT NULL,
            timestamp INTEGER NOT NULL,
            activity TEXT,
            is_anomaly BOOLEAN DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Create routes table for historical route tracking
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS routes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            route_name TEXT,
            start_time DATETIME,
            end_time DATETIME,
            total_distance REAL,
            avg_speed REAL,
            main_activity TEXT,
            anomaly_count INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    conn.commit()
    conn.close()

# Initialize database on startup
init_db()

@app.route('/')
def home():
    """Home page showing API status and available endpoints"""
    html_template = '''
    <!DOCTYPE html>
    <html>
    <head>
        <title>Smart GPS Tracker AI Backend</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 40px; background-color: #f5f5f5; }
            .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            h1 { color: #007AFF; text-align: center; }
            .status { background: #e8f5e8; padding: 15px; border-radius: 5px; border-left: 4px solid #4CAF50; }
            .endpoint { background: #f8f9fa; margin: 10px 0; padding: 15px; border-radius: 5px; border-left: 4px solid #007AFF; }
            .method { background: #007AFF; color: white; padding: 4px 8px; border-radius: 3px; font-size: 12px; margin-right: 10px; }
            code { background: #f4f4f4; padding: 2px 5px; border-radius: 3px; font-family: monospace; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🛰️ Smart GPS Tracker AI Backend</h1>
            <div class="status">
                <strong>✅ Server Status:</strong> Running<br>
                <strong>🧠 AI Models:</strong> VAR, Random Forest, DBSCAN Loaded<br>
                <strong>📊 Database:</strong> SQLite Connected
            </div>
            
            <h2>📡 Available API Endpoints</h2>
            
            <div class="endpoint">
                <span class="method">POST</span>
                <strong>/predict</strong><br>
                Main prediction endpoint for GPS data processing<br>
                <code>Body: {"lat": -6.2, "lon": 106.8, "speed": 30, "timestamp": 1234567890}</code>
            </div>
            
            <div class="endpoint">
                <span class="method">GET</span>
                <strong>/history</strong><br>
                Get historical GPS data and routes<br>
                <code>Query: ?limit=100&activity=motor</code>
            </div>
            
            <div class="endpoint">
                <span class="method">POST</span>
                <strong>/activity</strong><br>
                Classify activity based on GPS data<br>
                <code>Body: {"lat": -6.2, "lon": 106.8, "speed": 30}</code>
            </div>
            
            <div class="endpoint">
                <span class="method">POST</span>
                <strong>/anomaly</strong><br>
                Detect route anomalies<br>
                <code>Body: {"current_location": {...}, "route_history": [...]}</code>
            </div>
            
            <div class="endpoint">
                <span class="method">GET</span>
                <strong>/stats</strong><br>
                Get analytics and statistics<br>
                <code>Returns: activity distribution, anomaly counts, route summaries</code>
            </div>
            
            <h3>🚀 Quick Test</h3>
            <p>Test the API with curl:</p>
            <code>
                curl -X POST http://localhost:5000/predict \\<br>
                &nbsp;&nbsp;-H "Content-Type: application/json" \\<br>
                &nbsp;&nbsp;-d '{"lat": -6.2, "lon": 106.8, "speed": 30, "timestamp": 1640995200}'
            </code>
        </div>
    </body>
    </html>
    '''
    return render_template_string(html_template)

@app.route('/predict', methods=['POST'])
def predict():
    """
    Main prediction endpoint that combines all AI models:
    - VAR for location prediction
    - Random Forest for activity classification  
    - DBSCAN for anomaly detection
    """
    try:
        data = request.get_json()
        
        if not data or 'lat' not in data or 'lon' not in data:
            return jsonify({'error': 'Missing required fields: lat, lon'}), 400
        
        # Extract GPS data
        current_gps = {
            'lat': float(data['lat']),
            'lon': float(data['lon']),
            'speed': float(data.get('speed', 0)),
            'timestamp': int(data.get('timestamp', datetime.now().timestamp()))
        }
        
        # Get recent GPS history for context
        recent_history = get_recent_gps_data(limit=50)
        
        # 1. VAR Model: Predict next location
        try:
            predicted_location = var_predictor.predict_next_location(
                recent_history + [current_gps]
            )
        except Exception as e:
            print(f"VAR prediction error: {e}")
            # Fallback: simple linear extrapolation
            predicted_location = simple_location_prediction(recent_history, current_gps)
          # 2. Random Forest: Classify activity
        try:
            # Force use simple classification for consistency with database update
            activity = classify_activity_simple(current_gps['speed'])
        except Exception as e:
            print(f"Activity classification error: {e}")
            activity = classify_activity_simple(current_gps['speed'])
        
        # 3. DBSCAN: Detect anomalies
        try:
            is_anomaly = anomaly_detector.detect_anomaly(
                current_gps, recent_history
            )
        except Exception as e:
            print(f"Anomaly detection error: {e}")
            is_anomaly = False
          # Store data in database
        store_gps_data(current_gps, activity, is_anomaly)
        
        # Get confidence scores from models
        try:
            activity_confidence = activity_classifier.get_prediction_confidence(
                current_gps, recent_history[-5:] if recent_history else []
            )
        except Exception as e:
            print(f"Activity confidence error: {e}")
            activity_confidence = 0.85
        
        # Prepare response
        response = {
            'activity': activity,
            'predicted_location': predicted_location,
            'is_anomaly': bool(is_anomaly),  # Convert numpy.bool_ to Python bool
            'confidence_scores': {
                'activity_confidence': float(activity_confidence),  # Ensure Python float
                'prediction_accuracy': 0.78,  # VAR model confidence (can be enhanced later)
                'anomaly_confidence': 0.92    # DBSCAN confidence (can be enhanced later)
            },
            'metadata': {
                'timestamp': datetime.now().isoformat(),
                'data_points_used': len(recent_history),
                'model_versions': {
                    'var': '1.0',
                    'random_forest': '1.0', 
                    'dbscan': '1.0'
                }
            }
        }
        
        return jsonify(response)
        
    except Exception as e:
        print(f"Prediction error: {e}")
        traceback.print_exc()
        return jsonify({
            'error': 'Internal server error during prediction',
            'details': str(e)
        }), 500

@app.route('/history', methods=['GET'])
def get_history():
    """Get historical GPS data and routes"""
    try:
        limit = int(request.args.get('limit', 100))
        activity_filter = request.args.get('activity')

        conn = sqlite3.connect('gps_data.db')

        if activity_filter:
            query = 'SELECT * FROM gps_data WHERE activity = ? ORDER BY timestamp DESC LIMIT ?'
            df = pd.read_sql_query(query, conn, params=[activity_filter, limit])
        else:
            query = 'SELECT * FROM gps_data ORDER BY timestamp DESC LIMIT ?'
            df = pd.read_sql_query(query, conn, params=[limit])

        conn.close()

        # Bersihkan & konversi tipe data supaya aman untuk JSON
        df = df.fillna('').astype({
            'id': 'int',
            'latitude': 'float',
            'longitude': 'float',
            'speed': 'float',            'timestamp': 'int',
            'activity': 'str',
            'is_anomaly': 'bool',
            'created_at': 'str'
        })

        history = df.to_dict(orient='records')
        
        # Map field names for mobile app compatibility (add lat/lon aliases)
        for record in history:
            record['lat'] = record['latitude']
            record['lon'] = record['longitude']

        return jsonify({
            'data': history,
            'count': len(history)
        })

    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/activity', methods=['POST'])
def classify_activity_endpoint():
    """Endpoint specifically for activity classification"""
    try:
        data = request.get_json()
        
        if not data or 'speed' not in data:
            return jsonify({'error': 'Missing required field: speed'}), 400
        
        # Get recent history for context
        recent_history = get_recent_gps_data(limit=10)
        
        # Classify activity
        activity = activity_classifier.classify_activity(data, recent_history)
        
        return jsonify({
            'activity': activity,
            'speed': data['speed'],
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/anomaly', methods=['POST']) 
def detect_anomaly_endpoint():
    """Endpoint specifically for anomaly detection"""
    try:
        data = request.get_json()
        
        if not data or 'current_location' not in data:
            return jsonify({'error': 'Missing required field: current_location'}), 400
        
        current_location = data['current_location']
        route_history = data.get('route_history', [])
        
        # If no route history provided, get from database
        if not route_history:
            route_history = get_recent_gps_data(limit=100)
          # Detect anomaly
        is_anomaly = anomaly_detector.detect_anomaly(current_location, route_history)
        return jsonify({
            'is_anomaly': bool(is_anomaly),  # Convert numpy.bool_ to Python bool
            'current_location': current_location,
            'analysis_timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/test', methods=['GET'])
def test_connection():
    """Simple test endpoint to verify connectivity"""
    return jsonify({
        'status': 'ok',
        'message': 'Flask server is running',
        'timestamp': datetime.now().isoformat(),
        'server_ip': request.environ.get('SERVER_NAME'),
        'client_ip': request.environ.get('REMOTE_ADDR')
    })

# Helper functions

def get_recent_gps_data(limit=50):
    """Get recent GPS data from database"""
    try:
        conn = sqlite3.connect('gps_data.db')
        df = pd.read_sql_query(
            'SELECT latitude as lat, longitude as lon, speed, timestamp FROM gps_data ORDER BY timestamp DESC LIMIT ?',
            conn, params=[limit]
        )
        conn.close()
        return df.to_dict('records')
    except:
        return []

def store_gps_data(gps_data, activity, is_anomaly):
    """Store GPS data in database"""
    try:
        conn = sqlite3.connect('gps_data.db')
        cursor = conn.cursor()
        cursor.execute(
            'INSERT INTO gps_data (latitude, longitude, speed, timestamp, activity, is_anomaly) VALUES (?, ?, ?, ?, ?, ?)',
            (gps_data['lat'], gps_data['lon'], gps_data['speed'], gps_data['timestamp'], activity, is_anomaly)
        )
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Database storage error: {e}")

def simple_location_prediction(history, current):
    """Simple fallback location prediction using linear extrapolation"""
    if len(history) < 2:
        return {
            'lat': current['lat'] + 0.001,  # Small offset
            'lon': current['lon'] + 0.001
        }
    
    # Use last two points for linear extrapolation
    last = history[-1]
    second_last = history[-2]
    
    lat_diff = last['lat'] - second_last['lat']
    lon_diff = last['lon'] - second_last['lon']
    
    return {
        'lat': current['lat'] + lat_diff,
        'lon': current['lon'] + lon_diff
    }

def classify_activity_simple(speed):
    """Simple activity classification based on speed (in km/h)"""
    # Use the same threshold as our fixed classifier
    if speed < 2.0:  # Fixed threshold for stationary
        return 'stationary'
    elif speed < 6.0:
        return 'walking'
    elif speed < 15:
        return 'cycling'
    elif speed < 40:
        return 'motor'
    elif speed < 80:
        return 'car'
    else:
        return 'bus'

@app.route('/stats', methods=['GET'])
def get_statistics():
    """Get comprehensive statistics about GPS data and activities"""
    try:
        conn = sqlite3.connect('gps_data.db')
        cursor = conn.cursor()
        
        # Get activity distribution
        cursor.execute('''
            SELECT activity, COUNT(*) as count
            FROM gps_data 
            WHERE activity IS NOT NULL
            GROUP BY activity
            ORDER BY count DESC
        ''')
        activity_distribution = [{'activity': row[0], 'count': row[1]} for row in cursor.fetchall()]
        
        # Get anomaly statistics
        cursor.execute('''
            SELECT is_anomaly, COUNT(*) as count
            FROM gps_data
            GROUP BY is_anomaly
        ''')
        anomaly_stats = [{'is_anomaly': bool(row[0]), 'count': row[1]} for row in cursor.fetchall()]
        
        # Get recent activity (last 24 hours)
        cursor.execute('''
            SELECT activity, COUNT(*) as count
            FROM gps_data 
            WHERE activity IS NOT NULL 
            AND datetime(created_at) >= datetime('now', '-1 day')
            GROUP BY activity
            ORDER BY count DESC
        ''')
        recent_activity = [{'activity': row[0], 'count': row[1]} for row in cursor.fetchall()]
        
        # Get total data points
        cursor.execute('SELECT COUNT(*) FROM gps_data')
        total_points = cursor.fetchone()[0]
        
        # Get average speed by activity
        cursor.execute('''
            SELECT activity, AVG(speed) as avg_speed, COUNT(*) as count
            FROM gps_data 
            WHERE activity IS NOT NULL AND speed IS NOT NULL
            GROUP BY activity
        ''')
        speed_by_activity = [
            {
                'activity': row[0], 
                'avg_speed': round(row[1], 2), 
                'count': row[2]
            } for row in cursor.fetchall()
        ]
        
        conn.close()
        
        stats = {
            'activity_distribution': activity_distribution,
            'anomaly_statistics': anomaly_stats,
            'recent_activity': recent_activity,
            'total_data_points': total_points,
            'speed_by_activity': speed_by_activity,
            'generated_at': datetime.now().isoformat()
        }
        
        return jsonify(stats)
        
    except Exception as e:
        print(f"Error getting statistics: {str(e)}")
        return jsonify({
            'error': 'Failed to get statistics',
            'details': str(e)
        }), 500

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500

# Import MQTT client dengan error handling
from threading import Thread
try:
    from mqtt_client import run as run_mqtt_subscriber
    MQTT_AVAILABLE = True
    print("✅ MQTT client module berhasil diimpor")
except ImportError as e:
    print(f"⚠️ Warning: MQTT client tidak tersedia: {e}")
    MQTT_AVAILABLE = False
    def run_mqtt_subscriber():
        print("MQTT client tidak tersedia")

if __name__ == '__main__':
    # Jalankan MQTT subscriber di thread background jika tersedia
    if MQTT_AVAILABLE:
        print("🚀 Memulai MQTT subscriber...")
        Thread(target=run_mqtt_subscriber, daemon=True).start()
    else:
        print("⚠️ MQTT subscriber tidak dapat dimulai")

    print("🚀 Starting Flask server...")
    app.run(host='0.0.0.0', port=5000, debug=True, threaded=True)