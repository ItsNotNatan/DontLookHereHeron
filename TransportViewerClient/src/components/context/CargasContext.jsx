// src/components/context/CargasContext.jsx
import React, { createContext, useState, useContext } from 'react';

// Cria o contexto
const CargasContext = createContext();

export const CargasProvider = ({ children }) => {
  // Esta é a lista global que ambas as telas vão usar
  const [cargasGlobais, setCargasGlobais] = useState([]);

  return (
    <CargasContext.Provider value={{ cargasGlobais, setCargasGlobais }}>
      {children}
    </CargasContext.Provider>
  );
};

// Hook personalizado para facilitar o uso nas telas
export const useCargasContext = () => useContext(CargasContext);