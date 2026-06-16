// seed.js
// Popula o PocketBase com os dados iniciais (master data) do ATMLog.
// IDEMPOTENTE: so insere numa colecao se ela estiver vazia -> seguro re-rodar.
// Uso: node seed.js   (chamado automaticamente pelo deploy.bat)
//
// Variavel opcional: SEED_SAMPLE=true  -> tambem insere 4 ATMs de exemplo (teste).
require('dotenv').config();
const fs = require('fs');
const path = require('path');

const PB = require('pocketbase/cjs');
const PocketBase = PB.default || PB;

const pb = new PocketBase(process.env.PB_URL || 'http://127.0.0.1:8091');
pb.autoCancellation(false);

const readJson = (f) => JSON.parse(fs.readFileSync(path.join(__dirname, 'seed', f), 'utf8'));

async function isEmpty(col) {
  try {
    const r = await pb.collection(col).getList(1, 1);
    return r.totalItems === 0;
  } catch (e) {
    console.error(`  ! erro ao checar ${col}: ${e.message}`);
    return false;
  }
}

// Insere em lotes com concorrencia limitada; ignora erros pontuais (ex.: indice unico).
async function insertAll(col, items, conc = 25) {
  let ok = 0, fail = 0;
  const shownErr = new Set();
  for (let i = 0; i < items.length; i += conc) {
    const slice = items.slice(i, i + conc);
    await Promise.all(slice.map(async (it) => {
      try { await pb.collection(col).create(it); ok++; }
      catch (e) {
        fail++;
        if (shownErr.size < 3) { shownErr.add(1); console.error(`    ! ${col}: ${e.message}`); }
      }
    }));
  }
  return { ok, fail };
}

async function seedIfEmpty(col, items, conc) {
  if (!(await isEmpty(col))) {
    console.log(`  = ${col}: ja contem dados, pulando.`);
    return;
  }
  const { ok, fail } = await insertAll(col, items, conc);
  console.log(`  + ${col}: ${ok} inseridos${fail ? `, ${fail} falhas` : ''}.`);
}

async function main() {
  console.log('=== SEED ATMLog -> PocketBase ===');
  await pb.collection('_superusers').authWithPassword(
    process.env.PB_ADMIN_EMAIL,
    process.env.PB_ADMIN_PASSWORD
  );
  console.log('  [auth] superuser OK\n');

  // --- usuarios (senhas em texto puro, conforme versao atual) ---
  await seedIfEmpty('usuarios', [
    { nome: 'Administrador Comau', email: 'admin@comau.com', senha: 'admin123', perfil: 'Admin', ativo: true },
    { nome: 'Operador Logistica', email: 'operador@comau.com', senha: 'operador123', perfil: 'Operador', ativo: true },
    { nome: 'Visualizador Diretoria', email: 'visualizador@comau.com', senha: 'visu123', perfil: 'Visualizador', ativo: true },
  ]);

  // --- transportadoras ---
  await seedIfEmpty('transportadoras', [
    { nome: 'Expresso M2000 LTDA', ativo: true },
    { nome: 'JSL Logistica S/A', ativo: true },
    { nome: 'ACP TRANSPORTES', ativo: true },
    { nome: 'EXPRESSO BOM SUCESSO', ativo: true },
    { nome: 'DHL', ativo: true },
    { nome: 'VENTANA', ativo: true },
  ]);

  // --- veiculos ---
  await seedIfEmpty('veiculos', [
    { nome: 'Fiorino', comprimento: 1.60, largura: 1.30, altura: 1.10, ativo: true },
    { nome: 'VAN (Sprinter/Master)', comprimento: 3.30, largura: 1.70, altura: 1.80, ativo: true },
    { nome: 'Caminhao VUC', comprimento: 4.50, largura: 2.20, altura: 2.20, ativo: true },
    { nome: 'Caminhao 3/4', comprimento: 5.50, largura: 2.20, altura: 2.30, ativo: true },
    { nome: 'Truck (Padrao)', comprimento: 7.50, largura: 2.45, altura: 2.50, ativo: true },
    { nome: 'Truck (8 metros)', comprimento: 8.00, largura: 2.45, altura: 2.60, ativo: true },
    { nome: 'Carreta (10 metros)', comprimento: 10.00, largura: 2.45, altura: 2.60, ativo: true },
    { nome: 'Carreta (12 metros)', comprimento: 12.00, largura: 2.45, altura: 2.70, ativo: true },
    { nome: 'Carreta (15 metros)', comprimento: 15.00, largura: 2.45, altura: 2.80, ativo: true },
    { nome: 'Sider (Padrao)', comprimento: 14.50, largura: 2.50, altura: 2.70, ativo: true },
    { nome: 'Double Deck (Bau)', comprimento: 14.50, largura: 2.45, altura: 4.00, ativo: true },
  ]);

  // --- motivos (alguns padroes uteis; o admin pode editar) ---
  await seedIfEmpty('motivos', [
    { nome: 'Atraso na Coleta', descricao: 'Transportadora atrasou a coleta agendada.', cor: '#f59e0b' },
    { nome: 'Avaria na Carga', descricao: 'Mercadoria danificada durante o transporte.', cor: '#ef4444' },
    { nome: 'Divergencia de NF', descricao: 'Divergencia entre a nota fiscal e a carga.', cor: '#8b5cf6' },
    { nome: 'Reentrega', descricao: 'Necessaria nova tentativa de entrega.', cor: '#3b82f6' },
  ]);

  // --- projetos (do JSON convertido) ---
  await seedIfEmpty('projetos', readJson('projetos.json'));

  // --- locais_base (do JSON convertido - ~3 mil registros) ---
  await seedIfEmpty('locais_base', readJson('locais_base.json'), 30);

  // --- AMOSTRA (opcional): 4 ATMs de exemplo para validar a tela ---
  if (String(process.env.SEED_SAMPLE).toLowerCase() === 'true') {
    if (await isEmpty('pedidos_atm')) {
      console.log('  [sample] criando 4 ATMs de exemplo...');
      const transp = await pb.collection('transportadoras').getFullList();
      const byNome = (n) => (transp.find((t) => t.nome.toUpperCase().includes(n)) || {}).id;

      const mkEnd = (o) => pb.collection('enderecos_pedido').create(o);
      const eSP = await mkEnd({ nome_local: 'COMAU SP', logradouro: 'Av. das Industrias', numero: '1000', bairro: 'Distrito Industrial', municipio: 'Sao Paulo', uf: 'SP', cep: '01000-000' });
      const eMG = await mkEnd({ nome_local: 'COMAU MG', logradouro: 'Rodovia Fernao Dias', numero: 'S/N', bairro: 'Polo Automotivo', municipio: 'Betim', uf: 'MG', cep: '32600-000' });
      const eA = await mkEnd({ nome_local: 'Fabrica Cliente A', logradouro: 'Rua dos Imigrantes', numero: '500', bairro: 'Centro', municipio: 'Curitiba', uf: 'PR', cep: '80000-000' });
      const eB = await mkEnd({ nome_local: 'Galpao Cliente B', logradouro: 'Av. Brasil', numero: '2500', bairro: 'Penha', municipio: 'Rio de Janeiro', uf: 'RJ', cep: '21000-000' });

      const pedidos = [
        { numero_atm: '10001', data_solicitacao: '2024-10-01', tipo_operacao: 'Nacional', pedido_compra: 'PC-9901', nf: 'NF-111', wbs: '10025A', contato_coleta: 'Carlos Silva', telefone_coleta: '(11) 98888-1111', id_origem: eSP.id, id_destino: eA.id, medidas: '2x2x2', tipo_frete: 'Dedicado', solicitacao: 'Ana Souza', id_transportadora: byNome('M2000'), veiculo: 'Carreta', valor_nf: 55000, volume: 15.5, peso: 4500, data_entrega: '2024-10-03', status: 'Entregue', link_rastreio: 'https://rastreio.m2000.com.br/10001' },
        { numero_atm: '10002', data_solicitacao: '2024-10-02', tipo_operacao: 'Nacional', pedido_compra: 'PC-9902', nf: 'NF-112', wbs: '10025A', contato_coleta: 'Carlos Silva', telefone_coleta: '(11) 98888-1111', id_origem: eSP.id, id_destino: eB.id, medidas: '1x1x1', tipo_frete: 'Fracionado', solicitacao: 'Ana Souza', id_transportadora: byNome('JSL'), veiculo: 'Fiorino', valor_nf: 12000, volume: 2.0, peso: 500, data_entrega: '2024-10-05', status: 'Entregue' },
        { numero_atm: '10003', data_solicitacao: '2024-10-05', tipo_operacao: 'Nacional', pedido_compra: 'PC-9903', nf: 'NF-113', wbs: '88899B', contato_coleta: 'Joao Mendes', telefone_coleta: '(31) 97777-2222', id_origem: eMG.id, id_destino: eA.id, medidas: '3x2x1', tipo_frete: 'Dedicado', solicitacao: 'Roberto Lima', id_transportadora: byNome('M2000'), veiculo: 'Truck', valor_nf: 35000, volume: 10.0, peso: 3000, data_entrega: '2024-10-08', status: 'Entregue' },
        { numero_atm: '10004', data_solicitacao: '2024-10-06', tipo_operacao: 'Nacional', pedido_compra: 'PC-9904', nf: 'NF-114', wbs: '10025A', contato_coleta: 'Carlos Silva', telefone_coleta: '(11) 98888-1111', id_origem: eSP.id, id_destino: eB.id, medidas: '1x2x1', tipo_frete: 'Fracionado', solicitacao: 'Ana Souza', id_transportadora: byNome('JSL'), veiculo: 'Van', valor_nf: 8500, volume: 4.0, peso: 800, data_entrega: '2024-10-10', status: 'Entregue' },
      ];
      const fat = [
        { fatura_cte: 'CTE-001', valor_previsto: 2500.00, data_emissao: '2024-10-04', vencimento: '2024-11-04', elemento_pep_cc_wbs: '10027A', registrado_sap: 'SIM' },
        { fatura_cte: 'CTE-002', valor_previsto: 800.50, data_emissao: '2024-10-06', vencimento: '2024-11-06', elemento_pep_cc_wbs: '10027A', registrado_sap: 'SIM' },
        { fatura_cte: 'CTE-003', valor_previsto: 3100.00, data_emissao: '2024-10-09', vencimento: '2024-11-09', elemento_pep_cc_wbs: '88897B', registrado_sap: 'SIM' },
        { fatura_cte: 'CTE-004', valor_previsto: 450.00, data_emissao: '2024-10-11', vencimento: '2024-11-11', elemento_pep_cc_wbs: '10075A', registrado_sap: 'NAO' },
      ];
      for (let i = 0; i < pedidos.length; i++) {
        const p = await pb.collection('pedidos_atm').create(pedidos[i]);
        await pb.collection('faturamento_atm').create({ ...fat[i], id_atm: p.id });
      }
      console.log('  [sample] 4 ATMs + faturamento criados.');
    } else {
      console.log('  [sample] pedidos_atm ja tem dados, pulando amostra.');
    }
  }

  console.log('\n=== SEED concluido ===');
}

main().catch((e) => {
  console.error('ERRO no seed:', e.message);
  process.exit(1);
});
