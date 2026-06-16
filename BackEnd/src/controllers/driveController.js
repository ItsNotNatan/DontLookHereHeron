// src/controllers/driveController.js
const { google } = require('googleapis');
const { Readable } = require('stream');

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
  },
  scopes: ['https://www.googleapis.com/auth/drive.file'],
});

const drive = google.drive({ version: 'v3', auth });

exports.uploadParaDrive = async (req, res) => {
  try {
    const { arquivoBase64, nomeArquivo } = req.body;

    // ID da pasta do Drive vindo do .env (corrige o ID malformado fixo no codigo)
    const PASTA_ID = process.env.DRIVE_FOLDER_ID;

    if (!process.env.GOOGLE_CLIENT_EMAIL || !PASTA_ID) {
      return res.status(503).json({ erro: 'Upload para o Drive nao configurado (defina GOOGLE_CLIENT_EMAIL e DRIVE_FOLDER_ID no .env).' });
    }
    if (!arquivoBase64 || !nomeArquivo) {
      return res.status(400).json({ erro: 'Arquivo base64 e nomeArquivo sao obrigatorios.' });
    }

    const base64Data = arquivoBase64.replace(/^data:\w+\/[a-zA-Z+\-.]+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);

    const file = await drive.files.create({
      resource: { name: nomeArquivo, parents: [PASTA_ID] },
      media: { mimeType: 'application/pdf', body: stream },
      fields: 'id, webViewLink, webContentLink',
    });

    res.status(200).json({ sucesso: true, fileId: file.data.id, link: file.data.webViewLink });
  } catch (error) {
    console.error('Erro no upload para o Drive:', error);
    res.status(500).json({ erro: 'Falha ao fazer upload para o Google Drive.', detalhe: error.message });
  }
};
