// src/components/context/context.jsx
import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [usuario, setUsuario] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    const nome = localStorage.getItem('userName');
    const perfil = localStorage.getItem('perfil');
    
    if (token && nome) {
      setUsuario({ nome, perfil });
    }
    setCarregando(false);
  }, []);

  const login = (dados) => {
    localStorage.setItem('accessToken', dados.accessToken);
    localStorage.setItem('refreshToken', dados.refreshToken);
    localStorage.setItem('userName', dados.nome);
    // 🟢 Agora o padrão é Operador
    localStorage.setItem('perfil', dados.perfil || 'Operador'); 
    
    setUsuario({ nome: dados.nome, perfil: dados.perfil });
  };

  const logout = () => {
    localStorage.clear();
    setUsuario(null);
  };

  return (
    <AuthContext.Provider value={{ usuario, login, logout, estaLogado: !!usuario, carregando }}>
      {!carregando && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};
