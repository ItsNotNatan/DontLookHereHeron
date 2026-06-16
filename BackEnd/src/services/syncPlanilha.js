// src/services/syncPlanilha.js  (PocketBase)
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const { pb, withAuth } = require('../config/pocketbase');
const { formatarProBanco } = require('../utils/formatters');

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID || '1xacIwga7a_Qe5Z9YG5S6KqfHHwRLGUg9OJO9CD0FthU';

const auth = new JWT({
  email: process.env.GOOGLE_CLIENT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const doc = new GoogleSpreadsheet(SPREADSHEET_ID, auth);

let isSyncing = false;

async function puxarDadosDaPlanilha() {
  if (!process.env.GOOGLE_CLIENT_EMAIL) return; // sync desativado
  if (isSyncing) {
    console.log('⚠️ Sincronizacao ignorada: ciclo anterior ainda em andamento.');
    return;
  }
  isSyncing = true;

  try {
    console.log('🔄 Verificando novos pedidos no Google Sheets...');
    await doc.loadInfo();
    const aba = doc.sheetsByIndex[0];
    const linhas = await aba.getRows();

    for (const linha of linhas) {
      if (linha.get('Sincronizado') === 'SIM') continue;

      const detalhamentoCarga = linha.get('Detalhamento de Cargas e Medidas') || 'Sem detalhamento.';

      const cargaGenerica = [{
        id: Date.now(),
        nome: 'Carga via Formulario',
        quantidade: parseInt(linha.get('Quantidade Total de Volumes / Pecas')) || parseInt(linha.get('Quantidade Total de Volumes / Peças')) || 1,
        peso: parseFloat(linha.get('Peso Total Estimado (kg)')) || 0,
        comprimento: '', largura: '', altura: '', cor: '#64748b',
        detalhes_adicionais: detalhamentoCarga,
      }];

      const ufColeta = linha.get('UF Coleta');
      const ufEntrega = linha.get('UF Entrega');

      const payload = {
        solicitante: linha.get('Nome Completo') || '',
        data_solicitacao: formatarProBanco(linha.get('Data da Solicitacao') || linha.get('Data da Solicitação')) || '',
        pedido_compra: linha.get('N° do pedido') || '',
        wbs: linha.get('WBS/Centro de Custo') || '',
        nf: linha.get('Nota Fiscal') || '',

        contato_coleta: linha.get('Nome do Contato (Coleta)') || '',
        telefone_coleta: linha.get('Telefone do Contato (Coleta)') || '',
        empresa_coleta: linha.get('Empresa de Coleta') || '',
        data_coleta: formatarProBanco(linha.get('Data Desejada Coleta')) || '',
        cidade_coleta: linha.get('Cidade Coleta') || '',
        uf_coleta: ufColeta ? String(ufColeta).slice(-2) : '',

        contato_entrega: linha.get('Nome do Contato (Entrega)') || '',
        telefone_entrega: linha.get('Telefone do Contato (Entrega)') || '',
        empresa_entrega: linha.get('Empresa de Entrega / Setor') || '',
        data_entrega: formatarProBanco(linha.get('Data Desejada Entrega')) || '',
        cidade_entrega: linha.get('Cidade Entrega') || '',
        uf_entrega: ufEntrega ? String(ufEntrega).slice(-2) : '',

        lista_cargas: cargaGenerica,
        quantidade_volumes: parseInt(linha.get('Quantidade Total de Volumes / Peças')) || 0,
        peso: parseFloat(linha.get('Peso Total Estimado (kg)')) || 0,

        veiculo_sugerido: linha.get('Veiculo') || linha.get('Veículo') || '',
        tipo_frete: linha.get('Tipo de frete') || '',
        observacoes: linha.get('Observacoes adicionais') || linha.get('Observações adicionais') || '',
        processado: false,
      };

      try {
        await withAuth(() => pb.collection('atms_externos_temp').create(payload));
        try {
          linha.set('Sincronizado', 'SIM');
          await linha.save();
          console.log(`✅ Pedido de ${payload.solicitante} importado e marcado como SIM!`);
        } catch (planilhaErro) {
          console.error('❌ Foi pro banco, mas falhou ao marcar "SIM" na planilha (verifique permissao de EDITOR do robo):', planilhaErro.message);
        }
      } catch (erroBanco) {
        console.error('❌ Erro ao salvar pedido no PocketBase:', erroBanco.message);
      }
    }
  } catch (erro) {
    console.error('❌ Erro na conexao com a planilha:', erro.message);
  } finally {
    isSyncing = false;
  }
}

module.exports = puxarDadosDaPlanilha;
