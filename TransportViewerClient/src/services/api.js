import axios from 'axios';

// O Vite vai injetar o IP do .env correto dependendo de onde estiver rodando!
const baseURL = import.meta.env.VITE_API_URL;

const api = axios.create({
  baseURL
});

export default api;