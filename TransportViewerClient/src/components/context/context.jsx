// src/components/context/context.js
import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [usuario, setUsuario] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    const nome = localStorage.getItem('userName');
    if (token && nome) {
      setUsuario({ nome });
    }
    setCarregando(false);
  }, []);

  const login = (dados) => {
    localStorage.setItem('accessToken', dados.accessToken);
    localStorage.setItem('refreshToken', dados.refreshToken);
    localStorage.setItem('userName', dados.nome);
    setUsuario({ nome: dados.nome });
  };

  const logout = () => {
    localStorage.clear();
    setUsuario(null);
  };

  return (
    <AuthContext.Provider value={{ usuario, login, logout, estaLogado: !!usuario, carregando }}>
      {/* 🟢 Só renderiza o app quando terminar de checar o localStorage */}
      {!carregando && children}
    </AuthContext.Provider>
  );
};

// Esse é o cara que você usa no Login e no Layout
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};