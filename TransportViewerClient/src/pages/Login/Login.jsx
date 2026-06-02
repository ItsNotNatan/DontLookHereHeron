import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import './Login.css';

// Importamos o Hook para avisar o sistema que logamos
import { useAuth } from '../../components/context/context'; 

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth(); 

  // Estados do formulário
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  // NOVO: Estado para mostrar erro técnico na tela (já que você não tem F12)
  const [debugInfo, setDebugInfo] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setCarregando(true);
    setErro('');
    setDebugInfo(null); // Limpa o relatório anterior

    try {
      // 1. Limpeza de dados para evitar espaços acidentais
      const payload = { 
        email: email.trim().toLowerCase(), 
        senha: senha.trim() 
      };

      // 2. Faz a chamada para o seu Backend
      // Usamos apenas /auth/login pois o /api já deve estar na baseURL do api.js
      const resposta = await api.post('/auth/login', payload);
      
      // 3. Sucesso! Salvamos no contexto e navegamos
      login({
        accessToken: resposta.data.accessToken,
        refreshToken: resposta.data.refreshToken,
        nome: resposta.data.nome
      });
      
      navigate('/painelatm');

    } catch (err) {
      // 4. TRATAMENTO DE ERRO COM DIAGNÓSTICO NA TELA
      const msgAmigavel = err.response?.data?.mensagem || 'Falha na conexão com o servidor.';
      setErro(msgAmigavel);

      // Montamos o relatório para você me passar as informações
      setDebugInfo({
        urlCompleta: (api.defaults.baseURL || '') + '/auth/login',
        codigoStatus: err.response?.status || 'Erro de Rede / Timeout',
        respostaDoServidor: err.response?.data || 'Sem resposta do servidor (CORS ou Off-line)',
        metodo: 'POST'
      });

    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="login-container">
      <form className="login-form" onSubmit={handleLogin}>
        <div className="login-header">
          <i className="fa-solid fa-lock" style={{ color: '#2563eb', fontSize: '2rem', marginBottom: '1rem' }}></i>
          <h2>Acesso Colaborador</h2>
          <p>Entre para gerenciar os transportes</p>
        </div>
        
        {/* MENSAGEM DE ERRO AMIGÁVEL */}
        {erro && <div className="error-message" style={{ marginBottom: '10px' }}>{erro}</div>}

        {/* 🕵️ QUADRO TÉCNICO DE DEPURAÇÃO (Só aparece se der erro) */}
        {debugInfo && (
          <div style={{ 
            backgroundColor: '#fff4f4', 
            border: '1px solid #feb2b2', 
            padding: '12px', 
            borderRadius: '6px', 
            fontSize: '11px', 
            marginBottom: '20px',
            textAlign: 'left',
            color: '#c53030',
            fontFamily: 'monospace',
            lineHeight: '1.4'
          }}>
            <strong style={{ fontSize: '12px' }}>🛠️ RELATÓRIO DE ERRO:</strong><br/>
            <hr style={{ border: '0', borderTop: '1px solid #feb2b2', margin: '5px 0' }} />
            📍 <strong>URL Destino:</strong> {debugInfo.urlCompleta}<br/>
            🔢 <strong>Status HTTP:</strong> {debugInfo.codigoStatus}<br/>
            💬 <strong>Resposta:</strong> {JSON.stringify(debugInfo.respostaDoServidor)}<br/>
            <small style={{ color: '#718096', marginTop: '5px', display: 'block' }}>
              * Se a URL acima for "localhost", o seu Front não está apontando para o Render.
            </small>
          </div>
        )}
        
        <div className="input-group">
          <label htmlFor="email">E-mail Corporativo</label>
          <input 
            id="email"
            type="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            required 
            placeholder="exemplo@comau.com"
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

        <button type="submit" className="btn-login" disabled={carregando}>
          {carregando ? 'Validando acesso...' : 'Entrar no Sistema'}
        </button>
        
        <button type="button" className="btn-back" onClick={() => navigate('/')}>
          Voltar para Solicitação
        </button>
      </form>
    </div>
  );
}