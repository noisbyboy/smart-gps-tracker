### File: utils/db_helpers.py

import sqlite3
import pandas as pd

def get_recent_gps_data(limit=50):
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
    try:
        conn = sqlite3.connect('gps_data.db')
        cursor = conn.cursor()
        
        # Create table if not exists
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS gps_data (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            latitude REAL NOT NULL,
            longitude REAL NOT NULL,
            speed REAL,
            activity TEXT,
            timestamp INTEGER,
            is_anomaly BOOLEAN DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        ''')
        
        # Handle both input formats: {'lat', 'lon'} and {'latitude', 'longitude'}
        lat = gps_data.get('lat') or gps_data.get('latitude')
        lon = gps_data.get('lon') or gps_data.get('longitude')
        speed = gps_data.get('speed', 0)
        timestamp = gps_data.get('timestamp')
        
        cursor.execute(
            'INSERT INTO gps_data (latitude, longitude, speed, timestamp, activity, is_anomaly) VALUES (?, ?, ?, ?, ?, ?)',
            (float(lat), float(lon), float(speed), int(timestamp), str(activity), bool(is_anomaly))
        )
        conn.commit()
        conn.close()
        print(f"💾 GPS data saved: lat={lat}, lon={lon}, activity={activity}")
    except Exception as e:
        print(f"Database storage error: {e}")
