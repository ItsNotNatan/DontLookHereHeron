// src/components/BtnExcel/BtnExcel.jsx
import React from 'react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import logoComau from '../../assets/logo-comau.png';

const DownloadIcon = ({ size = 20, className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);

export default function BtnExcel({ atmsFiltrados }) {
  
  const shortId = (id) => id ? id.substring(0, 8).toUpperCase() : 'N/A';

  const parseValor = (val) => {
    if (val === null || val === undefined || val === '') return '';
    const num = Number(val);
    return isNaN(num) ? val : num;
  };

  const exportarExcel = async () => {
    if (!atmsFiltrados || atmsFiltrados.length === 0) {
      alert("Não há dados para exportar com os filtros atuais.");
      return;
    }

    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('ATM');

      worksheet.getCell('AA1').value = 'Controle de Ctes/ Nfe de Serviço';
      worksheet.getCell('Z1').font = { bold: true, size: 14 };
      worksheet.getCell('Z1').alignment = { horizontal: 'center' };
      
      worksheet.getCell('D2').value = 'Gestão de Fretes';
      worksheet.getCell('D2').font = { bold: true, size: 16 };
      
      const response = await fetch(logoComau);
      const bufferImage = await response.arrayBuffer();

      const img = new Image();
      img.src = logoComau;
      await new Promise((resolve) => { img.onload = resolve; });

      const alturaDesejada = 80; 
      const larguraProporcional = (img.width / img.height) * alturaDesejada;

      const logoId = workbook.addImage({ buffer: bufferImage, extension: 'png' });
      worksheet.addImage(logoId, { tl: { col: 0, row: 0 }, ext: { width: larguraProporcional, height: alturaDesejada } });

      worksheet.columns = [
        { key: 'data_sol', width: 22 }, { key: 'atm', width: 12 }, { key: 'pedido', width: 20 },
        { key: 'nf', width: 15 }, { key: 'wbs', width: 15 }, { key: 'uf1', width: 6 },
        { key: 'mun1', width: 20 }, { key: 'coleta', width: 30 }, { key: 'x', width: 4 },
        { key: 'entrega', width: 30 }, { key: 'uf2', width: 6 }, { key: 'mun2', width: 20 },
        { key: 'tipo_frete', width: 22 }, { key: 'solicitacao', width: 20 }, { key: 'veiculo', width: 20 },
        { key: 'transportadora', width: 25 }, { key: 'cotacao', width: 15 }, { key: 'valor_nf', width: 15 },
        { key: 'volume', width: 12 }, { key: 'peso', width: 12 }, { key: 'valor_previsto', width: 22 },
        { key: 'status', width: 15 }, { key: 'obs', width: 35 }, { key: 'separador_preto', width: 3 }, 
        { key: 'tipo_doc', width: 15 }, { key: 'data_map', width: 18 }, { key: 'fatura', width: 15 },
        { key: 'valor_realizado', width: 20 }, { key: 'data_emissao', width: 15 }, { key: 'vencimento', width: 15 },
        { key: 'elemento_pep', width: 25 }, { key: 'validacao_pep', width: 25 }, { key: 'lancamento_v360', width: 20 },
        { key: 'id_v360', width: 15 }, { key: 'registrado_sap', width: 22 }
      ];

      const titulos = [
        "DATA DA SOLICITAÇÃO", "ATM", "PEDIDO DE COMPRA", "NF", "WBS", "UF", "MUNICIPIO", "LOCAL DE COLETA", "X", 
        "LOCAL DA ENTREGA", "UF 2", "MUNICIPIO 2", "Fracionado/Dedicado", "SOLICITAÇÃO", "VEÍCULO", "TRANSPORTADORA", 
        "COTAÇÃO/BID", "VALOR NF", "VOLUME", "PESO", "VALOR PREVISTO", "STATUS", "OBSERVAÇÕES", "", 
        "TIPO", "DATA MAPEAMENTO", "FATURA", "VALOR REALIZADO", "DATA EMISSÃO", "VENCIMENTO", "ELEMENTO PEP - CC / WBS", 
        "VALIDAÇÃO PEP - CC /WBS", "Lançamento V360", "Id V360", "Registrado SAP (S/N)"
      ];

      const linhaCabecalho = worksheet.getRow(4);
      linhaCabecalho.values = titulos;

      linhaCabecalho.eachCell((cell, colNumber) => {
        if (worksheet.getColumn(colNumber).key === 'separador_preto') {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF000000' } };
        } else {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
          cell.font = { color: { argb: 'FFFFFFFF' }, bold: true }; 
        }
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      });
      linhaCabecalho.height = 35;

      atmsFiltrados.forEach(atm => {
        const row = worksheet.addRow({
          data_sol: atm.data_solicitacao ? atm.data_solicitacao.split('T')[0] : '-',
          atm: atm.numero_atm || shortId(atm.id),
          pedido: atm.pedido_compra || '-',
          nf: atm.nf || '-',
          wbs: atm.wbs || '-',
          uf1: atm.origem?.uf || '-',
          mun1: atm.origem?.municipio || '-',
          coleta: atm.origem?.nome_local || '-',
          x: 'x',
          entrega: atm.destino?.nome_local || '-',
          uf2: atm.destino?.uf || '-',
          mun2: atm.destino?.municipio || '-',
          tipo_frete: atm.tipo_frete || '-',
          solicitacao: atm.solicitacao || '-',
          veiculo: atm.veiculo || atm.modal || '-',
          transportadora: atm.transportadora?.nome || '-',
          cotacao: atm.cotacao_bid ? "Cotação" : (atm.valor_bid ? "BID" : '-'),
          valor_nf: parseValor(atm.valor_nf),
          volume: atm.volume || '',
          peso: atm.peso || '',
          
          // Valor previsto vem SOMENTE do faturamento (nunca cai no valor da NF)
          valor_previsto: parseValor(atm.faturamento?.valor_previsto),
          
          status: atm.status || '-',
          obs: atm.observacoes || '-',
          separador_preto: '', 
          tipo_doc: atm.tipo_documento || '-',
          data_map: atm.data_mapeamento ? atm.data_mapeamento.split('T')[0] : '-',
          fatura: atm.fatura_cte || '-',
          valor_realizado: parseValor(atm.valor_realizado),
          data_emissao: atm.data_emissao ? atm.data_emissao.split('T')[0] : '-',
          vencimento: atm.vencimento ? atm.vencimento.split('T')[0] : '-',
          elemento_pep: atm.elemento_pep_cc_wbs || '-',
          validacao_pep: atm.validacao_pep || '-',
          lancamento_v360: '', 
          id_v360: '', 
          registrado_sap: atm.registrado_sap || '-'
        });

        row.eachCell((cell, colNumber) => {
          if (worksheet.getColumn(colNumber).key === 'separador_preto') {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF000000' } };
          } else {
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
            cell.border = { top: { style: 'thin', color: { argb: 'FFE5E7EB' } }, bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } } };
          }
        });
      });

      ['valor_nf', 'valor_previsto', 'valor_realizado'].forEach(key => {
        worksheet.getColumn(key).numFmt = '"R$ "#,##0.00';
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, "Gestao_de_Fretes.xlsx");

    } catch (error) {
      console.error("Falha ao exportar excel: ", error);
      alert("Houve um problema ao gerar o arquivo.");
    }
  };

  return (
    <button 
      onClick={exportarExcel} 
      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#10b981', color: 'white', padding: '0.5rem 1rem', borderRadius: '0.5rem', border: 'none', fontWeight: 'bold', cursor: 'pointer', boxSizing: 'border-box', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}
      title="Baixar Tabela no Formato Original"
    >
      <DownloadIcon size={18} /> Exportar Gestão de Fretes
    </button>
  );
}
