const supabase = require('../config/supabase');
const jwt = require('jsonwebtoken');

const login = async (req, res) => {
  const { email, senha } = req.body;

  try {
    // 1. Busca usuário
    const { data: usuario, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !usuario || senha !== usuario.senha) {
      return res.status(401).json({ mensagem: 'E-mail ou senha incorretos.' });
    }

    if (!usuario.ativo) {
      return res.status(403).json({ mensagem: 'Usuário inativo.' });
    }

    // 2. Gera Access Token (15 minutos)
    const accessToken = jwt.sign(
      { id: usuario.id, perfil: usuario.perfil, nome: usuario.nome },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    // 3. Gera Refresh Token (7 dias)
    const refreshToken = jwt.sign(
      { id: usuario.id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    // 4. Salva o Refresh Token no Banco
    const dataExp = new Date();
    dataExp.setDate(dataExp.getDate() + 7);

    const { error: dbError } = await supabase
      .from('refresh_tokens')
      .insert([{ 
        usuario_id: usuario.id, 
        token: refreshToken, 
        expira_em: dataExp.toISOString() 
      }]);

    if (dbError) throw dbError;

    res.status(200).json({
      accessToken,
      refreshToken,
      nome: usuario.nome,
      perfil: usuario.perfil
    });

  } catch (erro) {
    console.error(erro);
    res.status(500).json({ mensagem: 'Erro interno no servidor.' });
  }
};

const refresh = async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) return res.status(401).json({ mensagem: 'Token não enviado.' });

  try {
    // Valida a assinatura do Refresh Token
    const decodificado = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    // Verifica se ele ainda existe no banco de dados
    const { data: tokenValido, error } = await supabase
      .from('refresh_tokens')
      .select('*, usuarios(*)')
      .eq('token', refreshToken)
      .single();

    if (error || !tokenValido) {
      return res.status(403).json({ mensagem: 'Refresh Token inválido ou expirado.' });
    }

    // Gera um NOVO Access Token
// ... dentro da função refresh
const novoAccessToken = jwt.sign(
  { 
    id: tokenValido.usuarios?.id || tokenValido.usuario_id, // Fallback caso o join falhe
    perfil: tokenValido.usuarios?.perfil, 
    nome: tokenValido.usuarios?.nome 
  },
  process.env.JWT_SECRET,
  { expiresIn: '15m' }
);

    res.json({ accessToken: novoAccessToken });

  } catch (err) {
    res.status(403).json({ mensagem: 'Sessão expirada.' });
  }
};

const logout = async (req, res) => {
  const { refreshToken } = req.body;
  
  // Remove o token do banco para que ele não possa mais ser usado
  await supabase.from('refresh_tokens').delete().eq('token', refreshToken);
  
  res.status(204).send();
};

module.exports = { login, refresh, logout };