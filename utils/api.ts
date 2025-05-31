// Konfigurasi axios untuk komunikasi ke Flask API
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000', // Ganti sesuai alamat backend Flask Anda
  timeout: 5000,
});

export default api;
