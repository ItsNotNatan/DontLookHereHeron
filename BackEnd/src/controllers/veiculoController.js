// src/controllers/veiculoController.js  (PocketBase)
const { pb, withAuth } = require('../config/pocketbase');

const veiculoController = {
  listarVeiculos: async (req, res) => {
    try {
      const data = await withAuth(() => pb.collection('veiculos').getFullList({ sort: '+comprimento' }));
      res.json(data);
    } catch (error) {
      console.error('Erro ao listar veiculos:', error);
      res.status(500).json({ error: 'Erro interno ao buscar veiculos' });
    }
  },

  criarVeiculo: async (req, res) => {
    try {
      const { nome, comprimento, largura, altura, ativo } = req.body;
      const data = await withAuth(() => pb.collection('veiculos').create({
        nome,
        comprimento: parseFloat(comprimento),
        largura: parseFloat(largura),
        altura: parseFloat(altura),
        ativo: ativo === undefined ? true : !!ativo,
      }));
      res.status(201).json(data);
    } catch (error) {
      console.error('Erro ao criar veiculo:', error);
      res.status(500).json({ error: 'Erro interno ao criar veiculo' });
    }
  },

  atualizarVeiculo: async (req, res) => {
    try {
      const { id } = req.params;
      const { nome, comprimento, largura, altura, ativo } = req.body;
      const data = await withAuth(() => pb.collection('veiculos').update(id, {
        nome,
        comprimento: parseFloat(comprimento),
        largura: parseFloat(largura),
        altura: parseFloat(altura),
        ativo: ativo === undefined ? true : !!ativo,
      }));
      res.json(data);
    } catch (error) {
      if (error && error.status === 404) return res.status(404).json({ error: 'Veiculo nao encontrado' });
      console.error('Erro ao atualizar veiculo:', error);
      res.status(500).json({ error: 'Erro interno ao atualizar veiculo' });
    }
  },

  excluirVeiculo: async (req, res) => {
    try {
      const { id } = req.params;
      await withAuth(() => pb.collection('veiculos').delete(id));
      res.status(204).send();
    } catch (error) {
      console.error('Erro ao excluir veiculo:', error);
      res.status(500).json({ error: 'Erro interno ao excluir veiculo' });
    }
  },
};

module.exports = veiculoController;
