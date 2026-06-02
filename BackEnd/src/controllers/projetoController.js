const supabase = require('../config/supabase');

const listarProjetos = async (req, res) => {
  try {
    const { data, error } = await supabase.from('projetos').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
};

const criarProjeto = async (req, res) => {
  try {
    // Pega o nome do projeto/wbs que veio do Front-end
    const { descricao } = req.body;
    
    // 🟢 GRAVA NA COLUNA CERTA (wbs) O VALOR QUE VEIO (descricao)
    const { data, error } = await supabase.from('projetos').insert([{ wbs: descricao }]).select();
    
    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (erro) {
    res.status(400).json({ erro: erro.message });
  }
};

const atualizarProjeto = async (req, res) => {
  try {
    const { id } = req.params;
    const { descricao } = req.body;
    
    // 🟢 ATUALIZA A COLUNA CERTA (wbs)
    const { data, error } = await supabase.from('projetos').update({ wbs: descricao }).eq('id', id).select();
    
    if (error) throw error;
    res.json(data[0]);
  } catch (erro) {
    res.status(400).json({ erro: erro.message });
  }
};

const excluirProjeto = async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('projetos').delete().eq('id', id);
    if (error) throw error;
    res.status(204).send();
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
};

module.exports = { listarProjetos, criarProjeto, atualizarProjeto, excluirProjeto };