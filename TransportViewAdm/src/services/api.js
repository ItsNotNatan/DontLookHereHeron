import axios from 'axios';

// URL da API: usa VITE_API_URL se definido; senao deriva do hostname da pagina (porta 3001).
const ehLocal = typeof window === 'undefined'
  || window.location.hostname === 'localhost'
  || window.location.hostname === '127.0.0.1';
const runtimeDefault = ehLocal
  ? 'http://localhost:3001/api'
  : `http://${window.location.hostname}:3001/api`;
const API_URL = import.meta.env.VITE_API_URL || runtimeDefault;

const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 403 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const res = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
        const novoAccessToken = res.data.accessToken;
        localStorage.setItem('accessToken', novoAccessToken);
        api.defaults.headers.common['Authorization'] = `Bearer ${novoAccessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export default api;