import axios from 'axios';

// URL da API derivada do hostname da pagina (sem IP fixo) - funciona no dev e no self-hosted.
const { hostname } = window.location;
const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';

const api = axios.create({
  baseURL: isLocalhost
    ? 'http://localhost:3001/api'
    : `http://${hostname}:3001/api`
});

export default api;