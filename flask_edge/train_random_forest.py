# File: train_random_forest.py
# Versi "Ultra": Advanced Feature Engineering dengan Rolling Windows + Tuning

import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, GridSearchCV
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report
import joblib
import time

def calculate_bearing(lat1, lon1, lat2, lon2):
    """Menghitung arah pergerakan (bearing) dari dua titik koordinat."""
    lat1, lon1, lat2, lon2 = map(np.radians, [lat1, lon1, lat2, lon2])
    dLon = lon2 - lon1
    y = np.sin(dLon) * np.cos(lat2)
    x = np.cos(lat1) * np.sin(lat2) - np.sin(lat1) * np.cos(lat2) * np.cos(dLon)
    bearing = np.arctan2(y, x)
    bearing = np.degrees(bearing)
    bearing = (bearing + 360) % 360
    return bearing

def main():
    start_time = time.time()
    
    # --- 1. MEMBACA & MEMPERSIAPKAN DATA ---
    # Gunakan dataset terbesar yang Anda miliki (200+ atau 500+ baris)
    file_path = 'activity_dataset.csv' 
    df = pd.read_csv(file_path)
    print(f"📊 Dataset loaded: {len(df)} data points")

    df.sort_values(by=['route_id', 'timestamp'], inplace=True)
    
    # --- 2. BASIC FEATURE ENGINEERING ---
    df['time_diff'] = df.groupby('route_id')['timestamp'].diff().fillna(0)
    df['speed_diff'] = df.groupby('route_id')['speed_mps'].diff().fillna(0)
    df['acceleration_mps2'] = np.where(df['time_diff'] > 0, df['speed_diff'] / df['time_diff'], 0)

    df['prev_lat'] = df.groupby('route_id')['latitude'].shift(1)
    df['prev_lon'] = df.groupby('route_id')['longitude'].shift(1)
    df['bearing'] = df.apply(
        lambda row: calculate_bearing(row['prev_lat'], row['prev_lon'], row['latitude'], row['longitude']) 
        if pd.notnull(row['prev_lat']) else 0,
        axis=1
    )
    df.drop(columns=['time_diff', 'speed_diff', 'prev_lat', 'prev_lon'], inplace=True)
    
    # --- 3. ADVANCED FEATURE ENGINEERING: ROLLING WINDOWS ---
    print("🔧 Performing Advanced Feature Engineering with Rolling Windows...")
    WINDOW_SIZE = 5 # Menggunakan 5 data point terakhir (25 detik) sebagai konteks
    
    # Fitur-fitur yang akan kita buat versi rolling-nya
    cols_for_rolling = ['speed_mps', 'acceleration_mps2', 'bearing']
    
    for col in cols_for_rolling:
        # Menghitung rata-rata dan standar deviasi dalam window, dikelompokkan per rute
        rolling_mean = df.groupby('route_id')[col].rolling(window=WINDOW_SIZE, min_periods=1).mean().reset_index(level=0, drop=True)
        rolling_std = df.groupby('route_id')[col].rolling(window=WINDOW_SIZE, min_periods=1).std().reset_index(level=0, drop=True)
        
        # Menambahkan fitur baru ke dataframe
        df[f'{col}_rol_mean_{WINDOW_SIZE}'] = rolling_mean
        df[f'{col}_rol_std_{WINDOW_SIZE}'] = rolling_std
        
    # Membersihkan nilai NaN yang mungkin muncul dari perhitungan std dev
    df.fillna(0, inplace=True)

    # --- 4. PERSIAPAN DATA UNTUK MODEL ---
    # Sekarang kita gunakan SEMUA fitur yang telah kita buat
    features = [
        'speed_mps', 'acceleration_mps2', 'bearing',
        'speed_mps_rol_mean_5', 'speed_mps_rol_std_5',
        'acceleration_mps2_rol_mean_5', 'acceleration_mps2_rol_std_5',
        'bearing_rol_mean_5', 'bearing_rol_std_5'
    ]
    target = 'activity_label'
    
    X = df[features]
    y = df[target]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.25, random_state=42, stratify=y
    )
    
    # --- 5. HYPERPARAMETER TUNING (Tetap dilakukan) ---
    print("\n⚡ Memulai Hyperparameter Tuning dengan fitur baru...")

    param_grid = {
        'n_estimators': [100, 200],
        'max_depth': [None, 20, 30],
        'min_samples_split': [2, 5],
        'min_samples_leaf': [1, 2]
    }

    rf = RandomForestClassifier(random_state=42, class_weight='balanced')
    grid_search = GridSearchCV(estimator=rf, param_grid=param_grid, cv=5, n_jobs=-1, verbose=1, scoring='accuracy')

    grid_search.fit(X_train, y_train)

    print("\n🏆 Proses Tuning Selesai!")
    print(f"Kombinasi Hyperparameter Terbaik: {grid_search.best_params_}")

    best_model = grid_search.best_estimator_
    y_pred = best_model.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    
    print("\n" + "="*50)
    print("🎊 HASIL EVALUASI MODEL DENGAN ROLLING WINDOWS 🎊")
    print("="*50)
    print(f"✅ Akurasi Model Final: {accuracy:.2%}")
    print("\nLaporan Klasifikasi Rinci:")
    print(classification_report(y_test, y_pred))
    
    joblib.dump(best_model, 'activity_model.pkl')
    print("\n💾 Model terbaik telah disimpan ke activity_model.pkl")
    
    end_time = time.time()
    print(f"\n⏱️ Total waktu eksekusi: {end_time - start_time:.2f} detik")

if __name__ == '__main__':
    main()