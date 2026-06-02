const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const supabase = require('../config/supabase');
const { formatarProBanco } = require('../utils/formatters');

const SPREADSHEET_ID = '1xacIwga7a_Qe5Z9YG5S6KqfHHwRLGUg9OJO9CD0FthU'; 

// 🟢 Usando as variáveis de ambiente (Igual ao driveController.js)
const auth = new JWT({
  email: process.env.GOOGLE_CLIENT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const doc = new GoogleSpreadsheet(SPREADSHEET_ID, auth);

let isSyncing = false; 

async function puxarDadosDaPlanilha() {
// ... (mantenha o resto do código da função exatamente igual)
  // Se já estiver rodando, cancela essa execução e espera a próxima
  if (isSyncing) {
    console.log('⚠️ Sincronização ignorada: O ciclo anterior ainda não terminou.');
    return;
  }

  isSyncing = true; // Bloqueia novas execuções

  try {
    console.log('🔄 Verificando novos pedidos no Google Sheets...');
    await doc.loadInfo(); 
    const aba = doc.sheetsByIndex[0]; // Pega a primeira aba "Respostas do formulário"
    const linhas = await aba.getRows();

    for (let linha of linhas) {
      // O robô só lê o que não tiver "SIM" na coluna Sincronizado
      if (linha.get('Sincronizado') !== 'SIM') {
        
        // ⚠️ ATENÇÃO: O texto dentro de linha.get('...') tem que ser EXACTAMENTE 
        // igual ao cabeçalho da coluna na sua planilha do Excel/Forms!
        
        const detalhamentoCarga = linha.get('Detalhamento de Cargas e Medidas') || 'Sem detalhamento.';

        // 🟢 Criamos um item de carga genérico usando o texto do Forms
        const cargaGenerica = [{
          id: Date.now(),
          nome: "Carga via Formulário",
          quantidade: parseInt(linha.get('Quantidade Total de Volumes / Peças')) || 1,
          peso: parseFloat(linha.get('Peso Total Estimado (kg)')) || 0,
          comprimento: '', largura: '', altura: '', cor: '#64748b',
          detalhes_adicionais: detalhamentoCarga
        }];

        const payload = {
          solicitante: linha.get('Nome Completo'),
          data_solicitacao: formatarProBanco(linha.get('Data da Solicitação')),
          pedido_compra: linha.get('N° do pedido'),
          wbs: linha.get('WBS/Centro de Custo'),
          nf: linha.get('Nota Fiscal'),
          
          // Contatos (Ajuste os nomes para bater com as colunas da sua planilha)
          contato_coleta: linha.get('Nome do Contato (Coleta)'),
          telefone_coleta: linha.get('Telefone do Contato (Coleta)'),
          empresa_coleta: linha.get('Empresa de Coleta'),
          data_coleta: formatarProBanco(linha.get('Data Desejada Coleta')),
          cidade_coleta: linha.get('Cidade Coleta'),
          uf_coleta: linha.get('UF Coleta') ? linha.get('UF Coleta').slice(-2) : null,
          
          contato_entrega: linha.get('Nome do Contato (Entrega)'),
          telefone_entrega: linha.get('Telefone do Contato (Entrega)'),
          empresa_entrega: linha.get('Empresa de Entrega / Setor'),
          data_entrega: formatarProBanco(linha.get('Data Desejada Entrega')),
          cidade_entrega: linha.get('Cidade Entrega'),
          uf_entrega: linha.get('UF Entrega') ? linha.get('UF Entrega').slice(-2) : null,
          
          // Dados de Carga
          lista_cargas: cargaGenerica,
          quantidade_volumes: parseInt(linha.get('Quantidade Total de Volumes / Peças')) || 0,
          peso: parseFloat(linha.get('Peso Total Estimado (kg)')) || 0,
          
          veiculo_sugerido: linha.get('Veículo'),
          tipo_frete: linha.get('Tipo de frete'),
          observacoes: linha.get('Observações adicionais')
        };

        // Salva na tabela temporária do Supabase
        const { error } = await supabase.from('atms_externos_temp').insert([payload]);

        if (error) {
          console.error(`❌ Erro ao salvar pedido no Supabase:`, error.message);
        } else {
          try {
            // Tenta marcar "SIM" na folha de cálculo
            linha.set('Sincronizado', 'SIM');
            await linha.save();
            console.log(`✅ Pedido de ${payload.solicitante} importado e marcado como SIM!`);
          } catch (planilhaErro) {
            console.error(`❌ O pedido foi pro banco, mas falhou ao escrever "SIM" na planilha. Verifique se o e-mail do robô tem permissão de EDITOR na planilha do Google. Erro:`, planilhaErro.message);
          }
        }
      }
    }
  } catch (erro) {
    console.error('❌ Erro na conexão com a planilha:', erro.message);
  } finally {
    // 🟢 MUITO IMPORTANTE: Libera a trava no final, mesmo se der erro no meio do caminho
    isSyncing = false;
  }
}

module.exports = puxarDadosDaPlanilha;