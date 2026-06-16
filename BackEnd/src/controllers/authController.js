// src/controllers/authController.js  (PocketBase)
const { pb, withAuth } = require('../config/pocketbase');
const jwt = require('jsonwebtoken');

const login = async (req, res) => {
  const { email, senha } = req.body;
  try {
    // 1. Busca usuario por email
    let usuario;
    try {
      usuario = await withAuth(() =>
        pb.collection('usuarios').getFirstListItem(pb.filter('email = {:e}', { e: email }))
      );
    } catch (e) {
      usuario = null; // 404 = nao encontrado
    }

    // Comparacao em texto puro (mantido conforme versao atual)
    if (!usuario || senha !== usuario.senha) {
      return res.status(401).json({ mensagem: 'E-mail ou senha incorretos.' });
    }
    if (!usuario.ativo) {
      return res.status(403).json({ mensagem: 'Usuario inativo.' });
    }

    // 2. Access Token (15 min)
    const accessToken = jwt.sign(
      { id: usuario.id, perfil: usuario.perfil, nome: usuario.nome },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    // 3. Refresh Token (7 dias)
    const refreshToken = jwt.sign(
      { id: usuario.id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    // 4. Salva o Refresh Token no banco
    const dataExp = new Date();
    dataExp.setDate(dataExp.getDate() + 7);
    await withAuth(() =>
      pb.collection('refresh_tokens').create({
        usuario_id: usuario.id,
        token: refreshToken,
        expira_em: dataExp.toISOString(),
      })
    );

    res.status(200).json({
      accessToken,
      refreshToken,
      nome: usuario.nome,
      perfil: usuario.perfil,
    });
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ mensagem: 'Erro interno no servidor.' });
  }
};

const refresh = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(401).json({ mensagem: 'Token nao enviado.' });

  try {
    jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    let tokenValido;
    try {
      tokenValido = await withAuth(() =>
        pb.collection('refresh_tokens').getFirstListItem(
          pb.filter('token = {:t}', { t: refreshToken }),
          { expand: 'usuario_id' }
        )
      );
    } catch (e) {
      tokenValido = null;
    }
    if (!tokenValido) {
      return res.status(403).json({ mensagem: 'Refresh Token invalido ou expirado.' });
    }

    const u = (tokenValido.expand && tokenValido.expand.usuario_id) || {};
    const novoAccessToken = jwt.sign(
      { id: u.id || tokenValido.usuario_id, perfil: u.perfil, nome: u.nome },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    res.json({ accessToken: novoAccessToken });
  } catch (err) {
    res.status(403).json({ mensagem: 'Sessao expirada.' });
  }
};

const logout = async (req, res) => {
  const { refreshToken } = req.body;
  try {
    const rec = await withAuth(() =>
      pb.collection('refresh_tokens').getFirstListItem(pb.filter('token = {:t}', { t: refreshToken }))
    );
    if (rec) await withAuth(() => pb.collection('refresh_tokens').delete(rec.id));
  } catch (e) {
    // token ja nao existe -> ok
  }
  res.status(204).send();
};

module.exports = { login, refresh, logout };
