const jwt = require('jsonwebtoken');

// 1. Verifica se o usuário tem um token válido
const verificarToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ erro: 'Acesso negado! Faça login.' });
  }

  try {
    const decodificado = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = decodificado; // Guarda { id, nome, perfil } no request
    next();
  } catch (erro) {
    res.status(403).json({ erro: 'Token expirado ou inválido.' });
  }
};

// 🟢 2. NOVO: Verifica se o perfil do usuário logado está na lista de permitidos
const permitirPerfis = (perfisPermitidos) => {
  return (req, res, next) => {
    if (!req.usuario || !req.usuario.perfil) {
      return res.status(403).json({ erro: 'Perfil não identificado no token.' });
    }

    if (!perfisPermitidos.includes(req.usuario.perfil)) {
      return res.status(403).json({ erro: 'Acesso negado! Seu perfil não tem permissão para realizar esta ação.' });
    }

    next(); // Se tiver permissão, deixa a rota prosseguir
  };
};

module.exports = { verificarToken, permitirPerfis };