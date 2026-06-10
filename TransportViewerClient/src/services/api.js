import axios from 'axios';

// Descobre a URL da API a partir do hostname onde a página está aberta.
// - localhost (dev): backend local na porta 3001
// - produção (self-hosted): mesmo IP/host da página, porta 3001 (sem IP fixo no código)
const { hostname } = window.location;
const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';

const api = axios.create({
  baseURL: isLocalhost
    ? 'http://localhost:3001/api'
    : `http://${hostname}:3001/api`
});

// A lógica do interceptor (que colocava o token na requisição) foi removida!

export default api;