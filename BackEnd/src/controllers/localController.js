// src/controllers/localController.js  (PocketBase)
const { pb, withAuth } = require('../config/pocketbase');

const listarLocais = async (req, res) => {
  try {
    const data = await withAuth(() => pb.collection('locais_base').getFullList({ sort: '+nome_local' }));
    res.json(data);
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
};

const criarLocal = async (req, res) => {
  try {
    const { nome_local, cep, logradouro, numero, bairro, municipio, uf } = req.body;
    const data = await withAuth(() => pb.collection('locais_base').create({
      nome_local, cep: cep || '', logradouro: logradouro || '', numero: numero || '',
      bairro: bairro || '', municipio: municipio || '', uf: uf || '', ativo: true,
    }));
    res.status(201).json(data);
  } catch (erro) {
    res.status(400).json({ erro: erro.message });
  }
};

const atualizarLocal = async (req, res) => {
  try {
    const { id } = req.params;
    const { nome_local, cep, logradouro, numero, bairro, municipio, uf } = req.body;
    const data = await withAuth(() => pb.collection('locais_base').update(id, {
      nome_local, cep, logradouro, numero, bairro, municipio, uf,
    }));
    res.json(data);
  } catch (erro) {
    res.status(400).json({ erro: erro.message });
  }
};

const excluirLocal = async (req, res) => {
  try {
    const { id } = req.params;
    await withAuth(() => pb.collection('locais_base').delete(id));
    res.status(204).send();
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
};

module.exports = { listarLocais, criarLocal, atualizarLocal, excluirLocal };
