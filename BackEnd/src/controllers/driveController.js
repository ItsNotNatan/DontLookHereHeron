// src/controllers/driveController.js
const fs = require('fs');
const path = require('path');

exports.uploadParaDrive = async (req, res) => {
  try {
    const { arquivoBase64, nomeArquivo } = req.body;

    if (!arquivoBase64 || !nomeArquivo) {
      return res.status(400).json({ erro: 'Arquivo base64 e nomeArquivo sao obrigatorios.' });
    }

    // Cria a pasta uploads física no servidor caso não exista
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Limpa o cabeçalho base64 do stream
    const base64Data = arquivoBase64.replace(/^data:\w+\/[a-zA-Z+\-.]+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    // Monta um nome seguro e único para evitar colisões
    const nomeUnico = `${Date.now()}_${nomeArquivo.replace(/\s+/g, '_')}`;
    const caminhoFisico = path.join(uploadDir, nomeUnico);

    // Salva o arquivo no disco local
    fs.writeFileSync(caminhoFisico, buffer);

    // Gera a URL baseada no host atual do servidor Express
    const linkAcesso = `${req.protocol}://${req.get('host')}/uploads/${nomeUnico}`;

    console.log(`✅ Arquivo armazenado localmente com sucesso: ${nomeUnico}`);

    res.status(200).json({ sucesso: true, fileId: nomeUnico, link: linkAcesso });
  } catch (error) {
    console.error('Erro no upload local de arquivos:', error);
    res.status(500).json({ erro: 'Falha ao processar e salvar o comprovante localmente.', detalhe: error.message });
  }
};
