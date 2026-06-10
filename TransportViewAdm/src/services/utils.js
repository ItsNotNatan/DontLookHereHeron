// src/services/utils.js

/**
 * Retorna uma versão encurtada do ID (8 primeiros caracteres)
 */
export const shortId = (id) => {
  if (!id) return 'N/A';
  return id.substring(0, 8).toUpperCase();
};

/**
 * Formata uma string de data (ex: YYYY-MM-DD) para o formato DD/MM/YY
 */
export const formatarDataCurta = (dataStr) => {
  if (!dataStr) return '-';
  
  const apenasData = dataStr.split('T')[0]; 
  const partes = apenasData.split('-'); 

  if (partes.length === 3) {
    const ano = partes[0];
    const mes = partes[1];
    const dia = partes[2];
    const anoCurto = ano.substring(2, 4); 
    
    return `${dia}/${mes}/${anoCurto}`;
  }

  return dataStr;
};

/**
 * Formata um valor numérico ou string para o padrão monetário brasileiro (R$)
 */
export const formatarMoeda = (valor) => {
  const numero = Number(valor);
  if (Number.isNaN(numero)) return 'R$ 0,00';
  
  return numero.toLocaleString('pt-BR', { 
    style: 'currency', 
    currency: 'BRL' 
  });
};

/**
 * Verifica se um valor bate com um filtro de múltipla escolha (separado por vírgulas)
 */
export const matchMultiSelect = (valorDoItem, filtro) => {
  if (!filtro) return true;

  const textoItem = valorDoItem ? String(valorDoItem).toUpperCase() : '';
  const termosDoFiltro = filtro.toUpperCase().split(',');

  for (let i = 0; i < termosDoFiltro.length; i++) {
    if (textoItem.includes(termosDoFiltro[i].trim())) return true;
  }

  return false;
};

/**
 * Verifica se um valor bate com um filtro de texto simples, múltiplo (vírgulas) ou intervalo (hífen)
 */
export const matchFiltro = (valorDoItem, filtro) => {
  if (!filtro) return true;

  const textoItem = valorDoItem ? String(valorDoItem).toUpperCase() : '';
  const textoFiltro = String(filtro).toUpperCase().trim();

  // 1. MODO ESPECÍFICO: Múltiplas opções separadas por vírgula
  if (textoFiltro.includes(',')) {
    const termos = textoFiltro.split(',');
    for (let termo of termos) {
      if (textoItem.includes(termo.trim())) return true; 
    }
    return false;
  }

  // 2. MODO LOTE / INTERVALO: Separado por hífen
  if (textoFiltro.includes('-') && !textoItem.includes(textoFiltro)) {
    const partes = textoFiltro.split('-');
    if (partes.length === 2) {
      const de = partes[0].trim();
      const ate = partes[1].trim();

      if (!isNaN(textoItem) && !isNaN(de) && (!ate || !isNaN(ate))) {
        const numItem = Number(textoItem);
        const numDe = Number(de);
        const numAte = ate ? Number(ate) : Infinity;
        return numItem >= numDe && numItem <= numAte;
      }
      
      if (de && ate) return textoItem >= de && textoItem <= ate;
      if (de) return textoItem >= de;
      if (ate) return textoItem <= ate;
    }
  }

  // 3. PESQUISA NORMAL
  return textoItem.includes(textoFiltro);
};

/**
 * Compara as datas para o Modo Específico e Lote
 */
export const matchData = (dataAtm, filtroEspecifico, dataInicio, dataFim) => {
  // Se não preencheu nenhuma data no filtro, exibe a linha
  if (!filtroEspecifico && !dataInicio && !dataFim) return true;
  
  // Se preencheu, mas o item não tem data no banco, então esconde-o
  if (!dataAtm) return false;

  const dataBase = dataAtm.split('T')[0]; // Deixa apenas a data pura (ex: "2024-05-20")

  // 1. Modo Específico (Múltiplas datas)
  if (filtroEspecifico) {
    const datasEscolhidas = filtroEspecifico.split(',');
    return datasEscolhidas.includes(dataBase);
  }

  // 2. Modo Lote (Intervalo)
  if (dataInicio || dataFim) {
    const valorDataAtual = new Date(dataBase).getTime();
    const valorDataIni = dataInicio ? new Date(dataInicio).getTime() : 0;
    const valorDataFim = dataFim ? new Date(dataFim).getTime() : Infinity;
    
    return valorDataAtual >= valorDataIni && valorDataAtual <= valorDataFim;
  }

  return true;
};

/**
 * Verifica se há algum filtro da aba Operação ativo (Inclui as datas)
 */
export const temFiltroOpAtivo = (filtros) => {
  if (filtros.id !== '' || 
      filtros.solicitante !== '' || 
      filtros.pedido !== '' || 
      filtros.nf !== '' || 
      filtros.status !== '' || 
      filtros.transportadora !== '' ||
      filtros.data_especifica !== '' || 
      filtros.data_inicio !== '' ||
      filtros.data_fim !== '') {
    return true;
  }
  
  return false;
};

/**
 * Verifica se há algum filtro da aba Faturamento ativo
 */
export const temFiltroFatAtivo = (filtros) => {
  if (filtros.fatura !== '' || 
      filtros.elemento_pep !== '' || 
      filtros.registrado_sap !== '' || 
      filtros.tipo_documento !== '') {
    return true;
  }
  
  return false;
};