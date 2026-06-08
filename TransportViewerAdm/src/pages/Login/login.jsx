import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import './Login.css'; // Usando apenas o arquivo correto com L maiúsculo

// --- Ícones SVG ---
const Lock = ({ size = 32 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setCarregando(true);
    setErro('');

    try {
      const payload = { 
        email: email.trim().toLowerCase(), 
        senha: senha.trim() 
      };

      const resposta = await api.post('/auth/login', payload);
      
      // 🟢 SALVANDO TUDO DIRETO NO LOCALSTORAGE
      localStorage.setItem('accessToken', resposta.data.accessToken);
      localStorage.setItem('refreshToken', resposta.data.refreshToken);
      localStorage.setItem('userName', resposta.data.nome);
      localStorage.setItem('perfil', resposta.data.perfil); // 🟢 A chave de ouro do RBAC
      
      // Manda o usuário para o Dashboard do ADM
      navigate('/');

    } catch (err) {
      const msgAmigavel = err.response?.data?.mensagem || 'Falha na conexão com o servidor.';
      setErro(msgAmigavel);
    } finally {
      setCarregando(false);
    }
  };

return (
    <div className="login-container">
      <form className="login-form" onSubmit={handleLogin}>
        
        <div className="login-header">
          <div className="login-header-icon">
            <Lock />
          </div>
          <h2>Painel Administrativo</h2>
          <p>Acesso restrito para Gestão de Fretes</p>
        </div>
        
        {erro && <div className="error-message">{erro}</div>}
        
        <div className="input-group">
          <label htmlFor="email">E-mail Corporativo</label>
          <input 
            id="email" 
            type="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            required 
            placeholder="admin@comau.com" 
          />
        </div>

        <div className="input-group">
          <label htmlFor="password">Senha</label>
          <input 
            id="password" 
            type="password" 
            value={senha} 
            onChange={(e) => setSenha(e.target.value)} 
            required 
            placeholder="Digite sua senha" 
          />
        </div>

        <button type="submit" className="btn-submit" disabled={carregando}>
          {carregando ? 'Validando acesso...' : 'Entrar no Sistema'}
        </button>
        
      </form>
    </div>
  );
}