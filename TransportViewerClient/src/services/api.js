import axios from 'axios';

// O JavaScript descobre automaticamente onde o site está aberto
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// Configuração base da API
const api = axios.create({
  // Se for localhost, usa a API local (porta 3001). 
  // Se não for (ex: rodando no Vercel), usa a URL do Render!
  baseURL: isLocalhost 
    ? 'http://localhost:3001/api' 
    : 'https://backendtransportview.onrender.com/api'
});

// A lógica do interceptor (que colocava o token na requisição) foi removida!

export default api;