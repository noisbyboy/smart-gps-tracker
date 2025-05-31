// Penjelasan ikon/warna di map
import React from 'react';

const Legend = () => (
  <div style={{ background: '#fff', border: '1px solid #ccc', borderRadius: 8, padding: 8, maxWidth: 200 }}>
    <div><span style={{ color: 'blue' }}>🔵</span> Prediksi</div>
    <div><span style={{ color: 'red' }}>🔴</span> Anomali</div>
    <div><span style={{ color: 'green' }}>🟢</span> Normal</div>
  </div>
);

export default Legend;
