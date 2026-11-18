const { pb, withAuth } = require('../config/pocketbase');

const listarAuditorias = async (req, res) => {
  try {
    const data = await withAuth(() => pb.collection('auditoria_seguros').getFullList({ sort: '-periodo' }));
    res.json(data);
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
};

const criarAuditoria = async (req, res) => {
  try {
    const data = await withAuth(() => pb.collection('auditoria_seguros').create(req.body));
    res.status(201).json(data);
  } catch (erro) {
    res.status(400).json({ erro: erro.message });
  }
};

const excluirAuditoria = async (req, res) => {
  try {
    const { id } = req.params;
    await withAuth(() => pb.collection('auditoria_seguros').delete(id));
    res.status(204).send();
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
};

const excluirTodasAuditorias = async (req, res) => {
  try {
    const auditorias = await withAuth(() => pb.collection('auditoria_seguros').getFullList());
    for (const item of auditorias) {
      await withAuth(() => pb.collection('auditoria_seguros').delete(item.id));
    }
    res.status(204).send();
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
};

module.exports = { listarAuditorias, criarAuditoria, excluirAuditoria, excluirTodasAuditorias };
