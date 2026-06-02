// src/controllers/driveController.js
const { google } = require('googleapis');
const { Readable } = require('stream');

// Configuração da autenticação usando variáveis de ambiente
const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/drive.file'],
});

const drive = google.drive({ version: 'v3', auth });

exports.uploadParaDrive = async (req, res) => {
  try {
    const { arquivoBase64, nomeArquivo } = req.body;

    // 🟢 COLOQUE O ID DA SUA PASTA DO DRIVE AQUI DENTRO DAS ASPAS:
    const PASTA_ID = "1TPmKcYqv3Gj5IVDiaMcs7y2w3l9TjYoM?hl"; 

    if (!arquivoBase64 || !nomeArquivo) {
      return res.status(400).json({ erro: 'Arquivo base64 e nomeArquivo são obrigatórios.' });
    }

    // Remove o prefixo do base64 gerado pelo frontend
    const base64Data = arquivoBase64.replace(/^data:\w+\/[a-zA-Z+\-.]+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    // Converte o buffer para uma stream (o Google Drive API exige stream)
    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);

    const fileMetadata = {
      name: nomeArquivo,
      parents: [PASTA_ID], // 🟢 Agora ele sempre vai jogar na pasta certa!
    };

    const media = {
      mimeType: 'application/pdf', // Ou o tipo de imagem, o drive se vira
      body: stream,
    };

    // Faz o upload de fato
    const file = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id, webViewLink, webContentLink',
    });

    // Para o usuário poder baixar, enviamos o webViewLink
    res.status(200).json({ sucesso: true, fileId: file.data.id, link: file.data.webViewLink });
  } catch (error) {
    console.error('Erro no upload para o Drive:', error);
    res.status(500).json({ erro: 'Falha ao fazer upload para o Google Drive.', detalhe: error.message });
  }
};