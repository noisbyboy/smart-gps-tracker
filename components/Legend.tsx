// File: components/Legend.tsx
// Penjelasan ikon/warna di map

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';

const Legend: React.FC = () => (
  <ThemedView style={styles.container}>
    <ThemedText style={styles.title}>Legend</ThemedText>
    <View style={styles.item}>
      <ThemedText style={[styles.icon, { color: 'blue' }]}>🔵</ThemedText>
      <ThemedText style={styles.text}>Prediksi</ThemedText>
    </View>
    <View style={styles.item}>
      <ThemedText style={[styles.icon, { color: 'red' }]}>🔴</ThemedText>
      <ThemedText style={styles.text}>Anomali</ThemedText>
    </View>
    <View style={styles.item}>
      <ThemedText style={[styles.icon, { color: 'green' }]}>🟢</ThemedText>
      <ThemedText style={styles.text}>Normal</ThemedText>
    </View>
  </ThemedView>
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 8,
    maxWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
  },
  icon: {
    fontSize: 16,
    marginRight: 8,
  },
  text: {
    fontSize: 14,
  },
});

export default Legend;
