import axios from 'axios';

// 1. Criamos a variável mágica no topo para usar em todo o arquivo
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_URL
});

// Interceptor para colocar o crachá (AccessToken) em toda requisição
api.interceptors.request.use((config) => {
  
  const token = localStorage.getItem('accessToken'); 

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para renovar o token automaticamente se der erro 403 (Expirado)
api.interceptors.response.use(
  (response) => response, 
  async (error) => {
    const originalRequest = error.config;

    // Se o erro for 403 e ainda não tentamos renovar...
    if (error.response?.status === 403 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        
        // 2. Pede um novo Access Token para o Back-end usando a URL dinâmica! 👈 Mudança 2
        const res = await axios.post(`${API_URL}/auth/refresh`, { 
          refreshToken 
        });

        const novoAccessToken = res.data.accessToken;

        // Salva o novo e tenta a requisição original de novo
        localStorage.setItem('accessToken', novoAccessToken);
        api.defaults.headers.common['Authorization'] = `Bearer ${novoAccessToken}`;
        
        return api(originalRequest); 
      } catch (refreshError) {
        // Se o Refresh Token também falhar, desloga tudo
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export default api;