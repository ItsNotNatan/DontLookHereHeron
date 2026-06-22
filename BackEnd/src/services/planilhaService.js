// src/services/planilhaService.js
const { google } = require('googleapis');
const cron = require('node-cron');
const transporteController = require('../controllers/transporteController');

// 1. Configuração da Autenticação do Google
// O ficheiro credenciais.json deve estar na raiz do teu projeto (junto ao package.json)
const auth = new google.auth.GoogleAuth({
  keyFile: './credenciais.json', 
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

// 2. Variáveis da tua Planilha (ID e Nome da aba corrigidos!)
const SPREADSHEET_ID = '1cZCQW3W-DQE0JkX0wXUYmsmNLAex6aPz3Vy3kDC9Muc'; 
const NOME_DA_ABA = 'Respostas ao formulário 1';

async function verificarNovasRespostas() {
  console.log('🔍 [Planilha] A procurar novos pedidos de transporte...');

  try {
    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client });

    const resposta = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${NOME_DA_ABA}!A:Z`,
    });

    const linhas = resposta.data.values;
    if (!linhas || linhas.length === 0) {
      return;
    }

    const cabecalhos = linhas[0];
    const indexStatus = cabecalhos.indexOf('Status do Sistema');

    if (indexStatus === -1) {
      console.error('❌ Coluna "Status do Sistema" não encontrada. Cria esta coluna no final da planilha.');
      return;
    }

    for (let i = 1; i < linhas.length; i++) {
      const linha = linhas[i];
      const statusDaLinha = linha[indexStatus];

      if (statusDaLinha !== 'Registado') {
        console.log(`Nova solicitação encontrada na linha ${i + 1}. A processar...`);

        const dadosFormulario = {
          dataSolicitacao: linha[0] || '', 
          solicitante: WebHeaderContext[1] || '',
          pedidoCompra: linha[2] || '',
          wbs: linha[3] || '',
          empresaColeta: linha[4] || '',
          cepColeta: linha[5] || '',
          logradouroColeta: linha[6] || '',
          numeroColeta: linha[7] || '',
          bairroColeta: linha[8] || '',
          cidadeColeta: linha[9] || '',
          ufColeta: linha[10] || '',
          nomeContatoColeta: linha[11] || '',
          telefoneColeta: linha[12] || '',
          empresaEntrega: linha[13] || '',
          pesoTotal: linha[14] || '',
          quantidadeVolumes: linha[15] || '1',
          obs: linha[16] || '',
          veiculo: linha[17] || '',
          frete: linha[18] || '',
          nf: linha[19] || ''
        };

        const reqMock = {
          body: dadosFormulario,
          app: { get: () => ({ emit: () => {} }) }
        };

        const resMock = {
          status: function(code) { return this; },
          send: function(msg) { console.log('✅ Controller respondeu:', msg); },
          json: function(msg) { console.log('✅ Controller respondeu:', msg); }
        };

        await transporteController.receberWebhookGoogleForms(reqMock, resMock);

        const letraColunaStatus = String.fromCharCode(65 + indexStatus);
        await sheets.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range: `${NOME_DA_ABA}!${letraColunaStatus}${i + 1}`,
          valueInputOption: 'USER_ENTERED',
          resource: {
            values: [['Registado']],
          },
        });

        console.log(`✅ Linha ${i + 1} processada e marcada como Registada na planilha!`);
      }
    }
  } catch (erro) {
    console.error('❌ Erro ao comunicar com o Google Sheets:', erro.message);
  }
}

function iniciarMonitoramentoPlanilha() {
  console.log('⏰ Robô do Google Sheets ativado. A verificar a cada 30 segundos.');
  // 🟢 Alterado para '*/30 * * * * *' (Roda de 30 em 30 segundos)
  cron.schedule('*/30 * * * * *', () => {
    verificarNovasRespostas();
  });
}

module.exports = { iniciarMonitoramentoPlanilha };
