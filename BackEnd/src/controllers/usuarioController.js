// src/controllers/usuarioController.js  (PocketBase)
const { pb, withAuth } = require('../config/pocketbase');

const listarUsuarios = async (req, res) => {
  try {
    const recs = await withAuth(() => pb.collection('usuarios').getFullList({ sort: '-created_at' }));
    // Nao expor a senha
    const data = recs.map(({ id, nome, email, perfil, ativo, created_at }) => ({ id, nome, email, perfil, ativo, created_at }));
    res.json(data);
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
};

const criarUsuario = async (req, res) => {
  try {
    const { nome, email, senha, perfil } = req.body;
    const data = await withAuth(() => pb.collection('usuarios').create({ nome, email, senha, perfil, ativo: true }));
    const { senha: _omit, ...safe } = data;
    res.status(201).json(safe);
  } catch (erro) {
    res.status(400).json({ erro: erro.message });
  }
};

const atualizarUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, email, senha, perfil } = req.body;
    const atualizacao = { nome, email, perfil };
    if (senha) atualizacao.senha = senha; // so muda a senha se enviada
    const data = await withAuth(() => pb.collection('usuarios').update(id, atualizacao));
    const { senha: _omit, ...safe } = data;
    res.json(safe);
  } catch (erro) {
    res.status(400).json({ erro: erro.message });
  }
};

const excluirUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    await withAuth(() => pb.collection('usuarios').delete(id));
    res.status(204).send();
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
};

module.exports = { listarUsuarios, criarUsuario, atualizarUsuario, excluirUsuario };
