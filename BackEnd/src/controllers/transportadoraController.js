const supabase = require('../config/supabase');

const listarTransportadoras = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('transportadoras')
      .select('*')
      .eq('ativo', true) // 🟢 MÁGICA: Só puxa as transportadoras ativas!
      .order('nome', { ascending: true });
      
    if (error) throw error;
    res.json(data);
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
};

const criarTransportadora = async (req, res) => {
  try {
    const { nome } = req.body;
    // Garante que a nova transportadora nasça ativa
    const { data, error } = await supabase
      .from('transportadoras')
      .insert([{ nome, ativo: true }])
      .select();
      
    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (erro) {
    res.status(400).json({ erro: erro.message });
  }
};

const atualizarTransportadora = async (req, res) => {
  try {
    const { id } = req.params;
    const { nome } = req.body;
    
    const { data, error } = await supabase
      .from('transportadoras')
      .update({ nome })
      .eq('id', id)
      .select();
      
    if (error) throw error;
    res.json(data[0]);
  } catch (erro) {
    res.status(400).json({ erro: erro.message });
  }
};

const excluirTransportadora = async (req, res) => {
  try {
    const { id } = req.params;
    
    // 🟢 SOFT DELETE: Em vez de .delete(), usamos .update({ ativo: false })
    const { error } = await supabase
      .from('transportadoras')
      .update({ ativo: false })
      .eq('id', id);
      
    if (error) throw error;
    res.status(204).send();
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
};

module.exports = { listarTransportadoras, criarTransportadora, atualizarTransportadora, excluirTransportadora };