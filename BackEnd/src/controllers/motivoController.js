const supabase = require('../config/supabase');

const listarMotivos = async (req, res) => {
  try {
    const { data, error } = await supabase.from('motivos').select('*').order('nome', { ascending: true });
    if (error) throw error;
    res.json(data);
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
};

const criarMotivo = async (req, res) => {
  try {
    const { nome, descricao, cor } = req.body;
    const { data, error } = await supabase.from('motivos').insert([{ nome, descricao, cor }]).select();
    if (error) throw error;

    // 🟢 AVISA O FRONT-END
    req.app.get('io').emit('motivos_atualizados');

    res.status(201).json(data[0]);
  } catch (erro) {
    res.status(400).json({ erro: erro.message });
  }
};

const atualizarMotivo = async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, descricao, cor } = req.body;
    const { data, error } = await supabase.from('motivos').update({ nome, descricao, cor }).eq('id', id).select();
    if (error) throw error;

    // 🟢 AVISA O FRONT-END
    req.app.get('io').emit('motivos_atualizados');

    res.json(data[0]);
  } catch (erro) {
    res.status(400).json({ erro: erro.message });
  }
};

const excluirMotivo = async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('motivos').delete().eq('id', id);
    if (error) throw error;

    // 🟢 AVISA O FRONT-END
    req.app.get('io').emit('motivos_atualizados');

    res.status(204).send();
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
};

module.exports = { listarMotivos, criarMotivo, atualizarMotivo, excluirMotivo };