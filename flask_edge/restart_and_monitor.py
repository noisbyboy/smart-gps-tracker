#!/usr/bin/env python3
# restart_and_monitor.py - Restart Flask dan monitor MQTT data real-time

import subprocess
import sqlite3
import time
import threading
from datetime import datetime

def monitor_database():
    """Monitor database for new entries"""
    last_count = 0
    
    while True:
        try:
            conn = sqlite3.connect('gps_data.db')
            cursor = conn.cursor()
            cursor.execute('SELECT COUNT(*) FROM gps_data')
            current_count = cursor.fetchone()[0]
            
            if current_count > last_count:
                # Get latest record
                cursor.execute('SELECT * FROM gps_data ORDER BY timestamp DESC LIMIT 1')
                latest = cursor.fetchone()
                if latest:
                    timestamp_str = datetime.fromtimestamp(latest[4]).strftime('%H:%M:%S')
                    print(f"🆕 New GPS data: ID={latest[0]}, Lat={latest[1]:.6f}, Lon={latest[2]:.6f}, Speed={latest[3]:.2f}, Time={timestamp_str}")
                
                last_count = current_count
            
            conn.close()
            time.sleep(2)  # Check every 2 seconds
            
        except Exception as e:
            print(f"Monitor error: {e}")
            time.sleep(5)

if __name__ == "__main__":
    print("🚀 Starting Flask app with MQTT monitoring...")
    
    # Start database monitoring in background
    monitor_thread = threading.Thread(target=monitor_database, daemon=True)
    monitor_thread.start()
    
    # Start Flask app
    try:
        subprocess.run(["python", "app.py"], check=True)
    except KeyboardInterrupt:
        print("\n👋 Stopping Flask app...")
    except Exception as e:
        print(f"Error running Flask app: {e}")
