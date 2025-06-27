# File: analyze_dataset.py
# Script untuk menganalisis kualitas dataset activity_dataset.csv

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from collections import Counter

def analyze_dataset():
    """Analisis komprehensif dataset untuk menentukan kualitas dan potensi akurasi."""
    
    print("🔍 ANALISIS DATASET ACTIVITY_DATASET.CSV")
    print("=" * 50)
    
    # Load dataset
    df = pd.read_csv('activity_dataset.csv')
    
    # 1. BASIC DATASET INFO
    print("\n📊 1. INFORMASI DASAR DATASET")
    print(f"Total data points: {len(df)}")
    print(f"Jumlah kolom: {len(df.columns)}")
    print(f"Kolom: {list(df.columns)}")
    
    # 2. CLASS DISTRIBUTION
    print("\n📈 2. DISTRIBUSI KELAS AKTIVITAS")
    class_counts = df['activity_label'].value_counts()
    print(class_counts)
    print(f"\nPersentase distribusi:")
    for activity, count in class_counts.items():
        percentage = (count / len(df)) * 100
        print(f"{activity}: {count} samples ({percentage:.1f}%)")
    
    # 3. DATA QUALITY CHECK
    print("\n🔧 3. KUALITAS DATA")
    print(f"Missing values per kolom:")
    print(df.isnull().sum())
    
    print(f"\nDuplicate rows: {df.duplicated().sum()}")
    
    # 4. FEATURE STATISTICS
    print("\n📊 4. STATISTIK FITUR UTAMA")
    print(f"Speed range: {df['speed_mps'].min():.2f} - {df['speed_mps'].max():.2f} m/s")
    print(f"Speed mean: {df['speed_mps'].mean():.2f} m/s")
    print(f"Speed std: {df['speed_mps'].std():.2f} m/s")
    
    if 'acceleration_mps2' in df.columns:
        print(f"Acceleration range: {df['acceleration_mps2'].min():.2f} - {df['acceleration_mps2'].max():.2f} m/s²")
        print(f"Acceleration mean: {df['acceleration_mps2'].mean():.2f} m/s²")
    
    # 5. ROUTE ANALYSIS
    print("\n🛣️ 5. ANALISIS RUTE")
    route_counts = df['route_id'].value_counts()
    print(f"Jumlah rute unik: {len(route_counts)}")
    print("Distribusi data per rute:")
    for route, count in route_counts.items():
        print(f"{route}: {count} points")
    
    # 6. SPEED DISTRIBUTION PER ACTIVITY
    print("\n🚗 6. DISTRIBUSI KECEPATAN PER AKTIVITAS")
    for activity in df['activity_label'].unique():
        activity_data = df[df['activity_label'] == activity]
        speed_stats = activity_data['speed_mps'].describe()
        print(f"\n{activity.upper()}:")
        print(f"  Mean speed: {speed_stats['mean']:.2f} m/s")
        print(f"  Min-Max: {speed_stats['min']:.2f} - {speed_stats['max']:.2f} m/s")
        print(f"  Std: {speed_stats['std']:.2f} m/s")
    
    # 7. DATA BALANCE ASSESSMENT
    print("\n⚖️ 7. PENILAIAN KESEIMBANGAN DATA")
    min_class = class_counts.min()
    max_class = class_counts.max()
    imbalance_ratio = max_class / min_class
    
    print(f"Imbalance ratio: {imbalance_ratio:.2f}")
    if imbalance_ratio > 10:
        print("❌ Dataset sangat tidak seimbang (>10:1)")
        balance_score = 1
    elif imbalance_ratio > 5:
        print("⚠️ Dataset cukup tidak seimbang (5-10:1)")
        balance_score = 2
    elif imbalance_ratio > 2:
        print("✅ Dataset agak tidak seimbang (2-5:1)")
        balance_score = 3
    else:
        print("✅ Dataset seimbang (<2:1)")
        balance_score = 4
    
    # 8. FEATURE SEPARABILITY ANALYSIS
    print("\n🎯 8. ANALISIS SEPARABILITAS FITUR")
    
    # Speed-based separability
    speed_separability = []
    activities = df['activity_label'].unique()
    
    for i, act1 in enumerate(activities):
        for act2 in activities[i+1:]:
            mean1 = df[df['activity_label'] == act1]['speed_mps'].mean()
            mean2 = df[df['activity_label'] == act2]['speed_mps'].mean()
            std1 = df[df['activity_label'] == act1]['speed_mps'].std()
            std2 = df[df['activity_label'] == act2]['speed_mps'].std()
            
            # Cohen's d effect size
            pooled_std = np.sqrt(((std1**2) + (std2**2)) / 2)
            cohens_d = abs(mean1 - mean2) / pooled_std if pooled_std > 0 else 0
            speed_separability.append(cohens_d)
            
            print(f"{act1} vs {act2}: Cohen's d = {cohens_d:.2f}")
    
    avg_separability = np.mean(speed_separability)
    print(f"\nAverage separability score: {avg_separability:.2f}")
    
    if avg_separability > 2.0:
        print("✅ Separabilitas sangat baik (>2.0)")
        separability_score = 4
    elif avg_separability > 1.0:
        print("✅ Separabilitas baik (1.0-2.0)")
        separability_score = 3
    elif avg_separability > 0.5:
        print("⚠️ Separabilitas sedang (0.5-1.0)")
        separability_score = 2
    else:
        print("❌ Separabilitas buruk (<0.5)")
        separability_score = 1
    
    # 9. DATASET SIZE ASSESSMENT
    print("\n📏 9. PENILAIAN UKURAN DATASET")
    total_samples = len(df)
    samples_per_class = total_samples / len(class_counts)
    
    print(f"Total samples: {total_samples}")
    print(f"Average samples per class: {samples_per_class:.1f}")
    
    if total_samples >= 1000:
        print("✅ Dataset size excellent (≥1000)")
        size_score = 4
    elif total_samples >= 500:
        print("✅ Dataset size good (500-999)")
        size_score = 3
    elif total_samples >= 200:
        print("⚠️ Dataset size moderate (200-499)")
        size_score = 2
    else:
        print("❌ Dataset size small (<200)")
        size_score = 1
    
    # 10. OVERALL ASSESSMENT & PREDICTION
    print("\n🎯 10. PENILAIAN KESELURUHAN")
    print("=" * 30)
    
    overall_score = (balance_score + separability_score + size_score) / 3
    
    print(f"Balance Score: {balance_score}/4")
    print(f"Separability Score: {separability_score}/4")
    print(f"Size Score: {size_score}/4")
    print(f"Overall Score: {overall_score:.2f}/4")
    
    # Prediksi akurasi berdasarkan skor
    if overall_score >= 3.5:
        predicted_accuracy = "90-95%"
        recommendation = "✅ Dataset excellent! Target 91-95% achievable"
    elif overall_score >= 3.0:
        predicted_accuracy = "85-90%"
        recommendation = "✅ Dataset good! Target 91-95% possible with optimization"
    elif overall_score >= 2.5:
        predicted_accuracy = "75-85%"
        recommendation = "⚠️ Dataset moderate. Target 91-95% challenging"
    elif overall_score >= 2.0:
        predicted_accuracy = "70-80%"
        recommendation = "⚠️ Dataset fair. Target 91-95% unlikely"
    else:
        predicted_accuracy = "60-75%"
        recommendation = "❌ Dataset poor. Target 91-95% very unlikely"
    
    print(f"\n🎯 PREDIKSI AKURASI: {predicted_accuracy}")
    print(f"📝 REKOMENDASI: {recommendation}")
    
    # 11. RECOMMENDATIONS
    print("\n💡 11. REKOMENDASI IMPROVEMENT")
    print("=" * 30)
    
    if balance_score < 3:
        print("• Tambah data untuk kelas minoritas")
        print("• Gunakan SMOTE atau data augmentation")
    
    if separability_score < 3:
        print("• Perbaiki feature engineering")
        print("• Tambah fitur temporal dan spasial")
    
    if size_score < 3:
        print("• Kumpulkan lebih banyak data")
        print("• Target minimal 500-1000 samples")
    
    print("\n• Gunakan ensemble methods")
    print("• Implementasi hyperparameter tuning")
    print("• Cross-validation untuk evaluasi robust")
    
    return {
        'total_samples': total_samples,
        'class_distribution': class_counts.to_dict(),
        'balance_score': balance_score,
        'separability_score': separability_score,
        'size_score': size_score,
        'overall_score': overall_score,
        'predicted_accuracy': predicted_accuracy
    }

if __name__ == '__main__':
    results = analyze_dataset()
