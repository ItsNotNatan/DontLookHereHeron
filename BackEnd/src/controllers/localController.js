// src/controllers/localController.js
const supabase = require('../config/supabase');

const listarLocais = async (req, res) => {
  try {
    let todosLocais = [];
    let limite = 1000;
    let offset = 0;
    let temMaisDados = true;

    while (temMaisDados) {
      const { data, error } = await supabase
        .from('locais_base')
        .select('*')
        // 🔴 Removemos o .eq('ativo', true) daqui
        .order('nome_local', { ascending: true })
        .range(offset, offset + limite - 1);
        
      if (error) throw error;

      if (data.length > 0) {
        todosLocais = [...todosLocais, ...data];
        offset += limite;
      } else {
        temMaisDados = false;
      }
    }

    res.json(todosLocais);
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
};

// ... resto do seu arquivo continua igual (criarLocal, atualizarLocal, etc)

const criarLocal = async (req, res) => {
  try {
    const { nome_local, cep, logradouro, numero, bairro, municipio, uf } = req.body;
    
    const { data, error } = await supabase.from('locais_base').insert([{ // 🌟 MUDOU AQUI
      nome_local, cep, logradouro, numero, bairro, municipio, uf, 
      ativo: true // 🌟 MUDOU AQUI: Usando o novo campo "ativo"
    }]).select();
    
    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (erro) {
    res.status(400).json({ erro: erro.message });
  }
};

const atualizarLocal = async (req, res) => {
  try {
    const { id } = req.params;
    const { nome_local, cep, logradouro, numero, bairro, municipio, uf } = req.body;
    
    const { data, error } = await supabase.from('locais_base').update({ // 🌟 MUDOU AQUI
      nome_local, cep, logradouro, numero, bairro, municipio, uf
    }).eq('id', id).select();
    
    if (error) throw error;
    res.json(data[0]);
  } catch (erro) {
    res.status(400).json({ erro: erro.message });
  }
};

const excluirLocal = async (req, res) => {
  try {
    const { id } = req.params;
    
    // 🔴 Voltamos para o .delete() oficial do Supabase
    const { error } = await supabase
      .from('locais_base')
      .delete() 
      .eq('id', id);
    
    if (error) throw error;
    
    res.status(204).send();
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
};

module.exports = { listarLocais, criarLocal, atualizarLocal, excluirLocal };