// src/services/api.js
import axios from 'axios';

// O Vite vai injetar o IP do .env correto dependendo de onde estiver rodando!
const baseURL = import.meta.env.VITE_API_URL;

const api = axios.create({
  baseURL
});

// 🟢 INTERCEPTOR: Anexa o Token em TODAS as requisições automaticamente
api.interceptors.request.use(async (config) => {
  const token = localStorage.getItem('accessToken');
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  return config;
}, (error) => {
  return Promise.reject(error);
});

export default api;
