// src/services/api.js
import axios from 'axios';

// 🔴 URL fixa apontando exatamente para o IP e porta do seu backend em produção
const API_URL = 'http://172.18.151.31:3001/api'; 

const api = axios.create({
  baseURL: API_URL
});

// 🟢 INTERCEPTOR DE IDA (REQUEST): Anexa o Token em toda requisição
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken'); 
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// 🟢 INTERCEPTOR DE VOLTA (RESPONSE): Renova o token se ele expirar (Igual ao Admin)
api.interceptors.response.use(
  (response) => response, 
  async (error) => {
    const originalRequest = error.config;

    // Se o backend disser que o token expirou (Erro 403) e ainda não tentamos renovar...
    if (error.response?.status === 403 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        
        // Pede um novo Access Token para o Back-end
        const res = await axios.post(`${API_URL}/auth/refresh`, { 
          refreshToken 
        });

        const novoAccessToken = res.data.accessToken;

        // Salva o novo token e tenta a requisição original de novo
        localStorage.setItem('accessToken', novoAccessToken);
        api.defaults.headers.common['Authorization'] = `Bearer ${novoAccessToken}`;
        
        return api(originalRequest); 
      } catch (refreshError) {
        // Se o Refresh Token também falhar, desloga o usuário
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
