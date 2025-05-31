// File: components/AnomalyPopup.tsx

import React from 'react';
import { Button, Modal, StyleSheet, Text, View } from 'react-native';

interface AnomalyPopupProps {
  onClose: () => void;
}

const AnomalyPopup: React.FC<AnomalyPopupProps> = ({ onClose }) => {
  return (
    <Modal animationType="slide" transparent visible>
      <View style={styles.overlay}>
        <View style={styles.popup}>
          <Text style={styles.title}>⚠️ Penyimpangan Rute Terdeteksi!</Text>
          <Text style={styles.message}>Lokasi saat ini berada di luar rute normal.</Text>
          <Button title="Tutup" onPress={onClose} color="#d9534f" />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  popup: {
    width: '80%',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    elevation: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#d9534f',
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 15,
  },
});

export default AnomalyPopup;
