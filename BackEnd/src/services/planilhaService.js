// src/services/planilhaService.js
const { google } = require('googleapis');
const cron = require('node-cron');
const transporteController = require('../controllers/transporteController');

// 1. Configuração da Autenticação do Google
const auth = new google.auth.GoogleAuth({
  keyFile: './credenciais.json', 
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

// 2. Variáveis da tua Planilha
const SPREADSHEET_ID = '1cZCQW3W-DQE0JkX0wXUYmsmNLAex6aPz3Vy3kDC9Muc'; 
const NOME_DA_ABA = 'Respostas ao formulário 1';

// 3. Função extra: Converte o número da coluna na letra correspondente
function obterLetraColuna(indice) {
  let letra = '';
  let temp = indice;
  while (temp >= 0) {
    letra = String.fromCharCode((temp % 26) + 65) + letra;
    temp = Math.floor(temp / 26) - 1;
  }
  return letra;
}

async function verificarNovasRespostas() {
  console.log('🔍 [Planilha] A procurar novos pedidos de transporte...');

  try {
    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client });

    // Lemos até ZZ para garantir que apanhamos todas as colunas
    const resposta = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${NOME_DA_ABA}!A:ZZ`, 
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

        // 🟢 MAPEAMENTO EXATO COM AS TUAS COLUNAS DO GOOGLE FORMS
        const dadosFormulario = {
          dataSolicitacao: linha[2] || linha[0] || '', // Coluna C (Data Solicitação) - Se falhar, usa o Carimbo (A)
          solicitante: linha[1] || '',                 // Coluna B (Nome Completo)
          pedidoCompra: linha[3] || '',                // Coluna D (PO de Compras)
          wbs: linha[4] || '',                         // Coluna E (WBS / Projeto)
          empresaColeta: linha[5] || '',               // Coluna F (Empresa de Coleta)
          cepColeta: linha[6] || '',                   // Coluna G (CEP Coleta)
          logradouroColeta: linha[7] || '',            // Coluna H (Logradouro Coleta)
          numeroColeta: linha[8] || '',                // Coluna I (Número/Comp Coleta)
          bairroColeta: linha[9] || '',                // Coluna J (Bairro Coleta)
          cidadeColeta: linha[10] || '',               // Coluna K (Cidade Coleta)
          ufColeta: linha[11] || '',                   // Coluna L (UF Coleta)
          nomeContatoColeta: linha[12] || '',          // Coluna M (Contato Coleta)
          telefoneColeta: linha[13] || '',             // Coluna N (Telefone Coleta)
          empresaEntrega: linha[14] || '',             // Coluna O (FILIAL FATURAMENTO -> Funciona como destino da COMAU)
          pesoTotal: linha[15] || '',                  // Coluna P (Peso kg)
          quantidadeVolumes: linha[16] || '1',         // Coluna Q (Volumes)
          obs: linha[17] || '',                        // Coluna R (Medidas do Material -> Usadas como Obs)
          veiculo: linha[18] || '',                    // Coluna S (Veículo)
          frete: linha[19] || '',                      // Coluna T (Tipo de frete)
          nf: linha[20] || ''                          // Coluna U (Nº da Nota Fiscal)
        };

        let erroNoBanco = false; // Detetor de falhas

        const reqMock = {
          body: dadosFormulario,
          app: { get: () => ({ emit: () => {} }) }
        };

        const resMock = {
          status: function(code) { 
            if (code >= 400) erroNoBanco = true; // Se o status for erro, ativamos o alarme
            return this; 
          },
          send: function(msg) { console.log('   Retorno (send):', msg); },
          json: function(msg) { console.log('   Retorno (json):', msg); }
        };

        // Grava na Base de Dados PocketBase
        await transporteController.receberWebhookGoogleForms(reqMock, resMock);

        // Se deu erro no banco, abortamos e NÃO escrevemos "Registado"
        if (erroNoBanco) {
           console.log(`⚠️ Falha ao salvar a linha ${i + 1} no banco de dados. A planilha NÃO será marcada.`);
           continue; 
        }

        // Se não houve erro, descobre a letra da coluna "Status do Sistema" e marca "Registado"
        const letraColunaStatus = obterLetraColuna(indexStatus);
        
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
  cron.schedule('*/30 * * * * *', () => {
    verificarNovasRespostas();
  });
}

module.exports = { iniciarMonitoramentoPlanilha };
