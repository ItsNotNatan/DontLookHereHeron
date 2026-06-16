// src/utils/formatters.js
const formatarProBanco = (dataBR) => {
  if (!dataBR) return null;
  const partes = String(dataBR).split('/');
  if (partes.length === 3) {
    let [dia, mes, ano] = partes;
    if (ano.length === 2) ano = '20' + ano;
    if (ano.length !== 4) throw new Error(`A data "${dataBR}" esta incompleta. Preencha com 4 digitos.`);
    return `${ano}-${mes}-${dia}`;
  }
  return null;
};

module.exports = { formatarProBanco };
