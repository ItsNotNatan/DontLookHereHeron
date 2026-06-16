const jwt = require('jsonwebtoken');

// 1. Verifica se o usuario tem um token valido
const verificarToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ erro: 'Acesso negado! Faca login.' });
  }

  try {
    const decodificado = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = decodificado; // { id, nome, perfil }
    next();
  } catch (erro) {
    res.status(403).json({ erro: 'Token expirado ou invalido.' });
  }
};

// 2. Verifica se o perfil do usuario esta na lista de permitidos
const permitirPerfis = (perfisPermitidos) => {
  return (req, res, next) => {
    if (!req.usuario || !req.usuario.perfil) {
      return res.status(403).json({ erro: 'Perfil nao identificado no token.' });
    }
    if (!perfisPermitidos.includes(req.usuario.perfil)) {
      return res.status(403).json({ erro: 'Acesso negado! Seu perfil nao tem permissao para esta acao.' });
    }
    next();
  };
};

module.exports = { verificarToken, permitirPerfis };
