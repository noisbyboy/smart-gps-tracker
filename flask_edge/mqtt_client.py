import paho.mqtt.client as mqtt
import json
import time
import sqlite3
import pandas as pd
from datetime import datetime

# Import models using relative paths
from models.random_forest_model_simple import ActivityClassifier
from models.var_model import VARLocationPredictor
from models.dbscan_anomaly_model_simple import AnomalyDetector

# Konfigurasi MQTT
MQTT_BROKER = "192.168.18.15"   # IP Ubuntu MQTT Server
MQTT_PORT = 1883
MQTT_TOPIC = "gps/data"
MQTT_USERNAME = "ubuntu"     # Sesuaikan dengan Mosquitto
MQTT_PASSWORD = "admin"

# Database path
DATABASE_PATH = 'gps_data.db'

# Inisialisasi model
activity_classifier = ActivityClassifier()
var_predictor = VARLocationPredictor()
anomaly_detector = AnomalyDetector()

def get_recent_gps_data(limit=50):
    """Get recent GPS data from database"""
    try:
        conn = sqlite3.connect(DATABASE_PATH)
        query = '''
        SELECT latitude, longitude, speed, activity, timestamp, is_anomaly 
        FROM gps_data 
        ORDER BY timestamp DESC 
        LIMIT ?
        '''
        df = pd.read_sql_query(query, conn, params=(limit,))
        conn.close()
        
        # Convert to list of dictionaries
        return df.to_dict('records')
    except Exception as e:
        print(f"Error getting recent GPS data: {e}")
        return []

def store_gps_data(gps_data, activity=None, is_anomaly=False):
    """Store GPS data to database"""
    try:
        conn = sqlite3.connect(DATABASE_PATH)
        cursor = conn.cursor()
        
        # Ensure table exists dengan format yang benar
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
        
        # Insert data dengan konversi tipe yang benar
        cursor.execute('''
        INSERT INTO gps_data (latitude, longitude, speed, activity, timestamp, is_anomaly)
        VALUES (?, ?, ?, ?, ?, ?)
        ''', (
            float(gps_data.get('latitude', 0)),
            float(gps_data.get('longitude', 0)),
            float(gps_data.get('speed', 0)),
            str(activity or 'unknown'),
            int(gps_data.get('timestamp', datetime.now().timestamp())),
            1 if is_anomaly else 0
        ))
        
        conn.commit()
        conn.close()
        print(f"💾 Data GPS disimpan: lat={gps_data.get('latitude')}, lon={gps_data.get('longitude')}, timestamp={gps_data.get('timestamp')}")
        return True
    except Exception as e:
        print(f"❌ Error menyimpan GPS data: {e}")
        import traceback
        traceback.print_exc()
        return False

# Fungsi callback saat berhasil konek ke broker
def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print("✅ MQTT terhubung ke broker!")
        client.subscribe(MQTT_TOPIC)
        print(f"📡 Subscribed to topic: {MQTT_TOPIC}")
    else:
        print(f"🚫 Gagal konek ke MQTT Broker. Kode: {rc}")

# Fungsi callback saat pesan diterima
def on_message(client, userdata, msg):
    try:
        payload = json.loads(msg.payload.decode())
        print(f"📥 Data dari ESP32 via MQTT: {payload}")        # Map field names untuk kompatibilitas database
        # Force menggunakan timestamp saat ini untuk data real-time
        current_timestamp = int(datetime.now().timestamp())
        gps_data = {
            'latitude': payload.get('lat'),
            'longitude': payload.get('lon'), 
            'speed': payload.get('speed', 0),
            'timestamp': current_timestamp  # Selalu gunakan waktu saat ini
        }
        
        print(f"⏰ Original timestamp: {payload.get('timestamp')}, Using current: {current_timestamp}")
        
        print(f"📍 GPS Data yang akan disimpan: {gps_data}")        # Ambil data historis untuk konteks model
        recent_history = get_recent_gps_data(limit=50)
        
        # Convert database format (latitude/longitude) to model format (lat/lon) for consistency
        history_for_models = []
        for item in recent_history:
            history_for_models.append({
                'lat': item.get('latitude', item.get('lat', 0)),
                'lon': item.get('longitude', item.get('lon', 0)),
                'speed': item.get('speed', 0),
                'timestamp': item.get('timestamp', 0)
            })

        # Proses AI dengan format yang konsisten
        try:
            activity = activity_classifier.classify_activity(payload, history_for_models[-5:])
        except Exception as e:
            print(f"⚠️ Activity classification error: {e}")
            activity = 'unknown'
            
        try:
            predicted_location = var_predictor.predict_next_location(history_for_models + [payload])
        except Exception as e:
            print(f"⚠️ VAR prediction error: {e}")
            predicted_location = {'lat': payload.get('lat', 0), 'lon': payload.get('lon', 0)}
            
        try:
            is_anomaly = anomaly_detector.detect_anomaly(payload, history_for_models)
        except Exception as e:
            print(f"⚠️ Anomaly detection error: {e}")
            is_anomaly = False

        # Simpan ke database dengan field yang benar
        store_gps_data(gps_data, activity, is_anomaly)

        print("✅ Data berhasil diproses & disimpan oleh AI models.")
        print(f"  Aktivitas: {activity}")
        print(f"  Prediksi Lokasi: {predicted_location}")
        print(f"  Anomali: {'Ya' if is_anomaly else 'Tidak'}")

    except Exception as e:
        print(f"❌ Error saat memproses data MQTT: {e}")
        import traceback
        traceback.print_exc()

# Fungsi utama untuk menjalankan subscriber MQTT
def run():
    client = mqtt.Client()
    client.username_pw_set(MQTT_USERNAME, MQTT_PASSWORD)
    client.on_connect = on_connect
    client.on_message = on_message

    try:
        print(f"🔌 Mencoba koneksi ke MQTT broker: {MQTT_BROKER}:{MQTT_PORT}")
        print(f"👤 Username: {MQTT_USERNAME}")
        print(f"📡 Topic: {MQTT_TOPIC}")
          # Tambahkan timeout dan debug
        print("⏳ Menunggu koneksi...")
        result = client.connect(MQTT_BROKER, MQTT_PORT, 60)
        
        if result == 0:
            print("✅ Connect request berhasil dikirim")
        else:
            print(f"❌ Connect request gagal dengan code: {result}")
            return
            
        print("🚀 MQTT Client mulai listening...")
        client.loop_forever()
        
    except ConnectionRefusedError:
        print(f"❌ Koneksi ditolak! Cek apakah MQTT broker di {MQTT_BROKER}:{MQTT_PORT} berjalan")
    except TimeoutError:
        print(f"⏰ Timeout! MQTT broker tidak merespon dalam waktu yang ditentukan")
    except Exception as e:
        print(f"❗ Gagal konek ke MQTT broker: {e}")
        print(f"💡 Cek: 1) IP broker benar? 2) Port 1883 terbuka? 3) Username/password benar?")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    print("🚀 Starting MQTT GPS Data Subscriber...")
    print("=" * 50)
    run()
