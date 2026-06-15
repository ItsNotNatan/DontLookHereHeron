const supabase = require('../config/supabase');

const listarUsuarios = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('usuarios')
      .select('id, nome, email, perfil, ativo, created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
};

const criarUsuario = async (req, res) => {
  try {
    const { nome, email, senha, perfil } = req.body;
    
    const { data, error } = await supabase
      .from('usuarios')
      .insert([{ nome, email, senha, perfil, ativo: true }])
      .select();

    if (error) throw error;

    // 🟢 AVISA O FRONT-END
    req.app.get('io').emit('usuarios_atualizados');

    res.status(201).json(data[0]);
  } catch (erro) {
    res.status(400).json({ erro: erro.message });
  }
};

const atualizarUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, email, senha, perfil } = req.body;

    const atualizacao = { nome, email, perfil };
    if (senha) {
      atualizacao.senha = senha;
    }

    const { data, error } = await supabase
      .from('usuarios')
      .update(atualizacao)
      .eq('id', id)
      .select();

    if (error) throw error;

    // 🟢 AVISA O FRONT-END
    req.app.get('io').emit('usuarios_atualizados');

    res.json(data[0]);
  } catch (erro) {
    res.status(400).json({ erro: erro.message });
  }
};

const excluirUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('usuarios').delete().eq('id', id);
    
    if (error) throw error;

    // 🟢 AVISA O FRONT-END
    req.app.get('io').emit('usuarios_atualizados');

    res.status(204).send();
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
};

module.exports = { listarUsuarios, criarUsuario, atualizarUsuario, excluirUsuario };