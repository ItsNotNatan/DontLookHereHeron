const supabase = require('../config/supabase');

const veiculoController = {
  // Listar todos os veículos (Ativos e inativos)
  listarVeiculos: async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('veiculos')
        .select('*')
        .order('comprimento', { ascending: true }); // Ordena do menor pro maior

      if (error) throw error;
      res.json(data);
    } catch (error) {
      console.error("Erro ao listar veículos:", error);
      res.status(500).json({ error: "Erro interno ao buscar veículos" });
    }
  },

  // Criar um novo veículo
  criarVeiculo: async (req, res) => {
    try {
      const { nome, comprimento, largura, altura, ativo } = req.body;
      
      const { data, error } = await supabase
        .from('veiculos')
        .insert([{ nome, comprimento, largura, altura, ativo }])
        .select();

      if (error) throw error;
      res.status(201).json(data[0]);
    } catch (error) {
      console.error("Erro ao criar veículo:", error);
      res.status(500).json({ error: "Erro interno ao criar veículo" });
    }
  },

  // Atualizar um veículo existente
  atualizarVeiculo: async (req, res) => {
    try {
      const { id } = req.params;
      const { nome, comprimento, largura, altura, ativo } = req.body;

      const { data, error } = await supabase
        .from('veiculos')
        .update({ nome, comprimento, largura, altura, ativo })
        .eq('id', id)
        .select();

      if (error) throw error;
      if (data.length === 0) return res.status(404).json({ error: "Veículo não encontrado" });
      
      res.json(data[0]);
    } catch (error) {
      console.error("Erro ao atualizar veículo:", error);
      res.status(500).json({ error: "Erro interno ao atualizar veículo" });
    }
  },

  // Excluir um veículo
  excluirVeiculo: async (req, res) => {
    try {
      const { id } = req.params;

      const { error } = await supabase
        .from('veiculos')
        .delete()
        .eq('id', id);

      if (error) throw error;
      res.status(204).send(); // 204 = No Content (Sucesso sem corpo de resposta)
    } catch (error) {
      console.error("Erro ao excluir veículo:", error);
      res.status(500).json({ error: "Erro interno ao excluir veículo" });
    }
  }
};

module.exports = veiculoController;