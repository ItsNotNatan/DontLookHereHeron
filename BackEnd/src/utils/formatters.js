// src/utils/formatters.js
const formatarProBanco = (dataBR) => {
  if (!dataBR) return ""; // Retorna string vazia para limpar o campo no PocketBase

  // Se já vier do HTML com traço (YYYY-MM-DD), o banco aceita direto
  if (String(dataBR).includes('-')) {
    return String(dataBR).split('T')[0];
  }

  // Tratamento para datas que vêm com barra (DD/MM/YYYY)
  const partes = String(dataBR).split('/');
  if (partes.length === 3) {
    let [dia, mes, ano] = partes;
    if (ano.length === 2) ano = '20' + ano;
    if (ano.length !== 4) throw new Error(`A data "${dataBR}" esta incompleta. Preencha com 4 digitos.`);
    return `${ano}-${mes}-${dia}`;
  }
  
  return "";
};

module.exports = { formatarProBanco };
