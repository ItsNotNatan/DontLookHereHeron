// src/componentes/BtnPdf/BtnPdf.jsx
import React, { useState } from 'react';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';

// Importação das imagens
import carimbo from '../../assets/carimbo.png';
import logoComau from '../../assets/logo-comau.png';

try {
  pdfMake.vfs = pdfFonts.pdfMake.vfs;
} catch (e) {
  console.error("Erro ao carregar fontes do PDF:", e);
}

const FileText = ({ size = 18 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
  </svg>
);

export default function BtnPdf({ atm }) {
  const [gerando, setGerando] = useState(false);

  if (!atm) return null;

  const getBase64ImageFromURL = (url) => {
    return new Promise((resolve, reject) => {
      var img = new Image();
      img.setAttribute("crossOrigin", "anonymous");
      img.onload = function () {
        var canvas = document.createElement("canvas");
        canvas.width = this.width;
        canvas.height = this.height;
        var ctx = canvas.getContext("2d");
        ctx.drawImage(this, 0, 0);
        var dataURL = canvas.toDataURL("image/png");
        resolve(dataURL);
      };
      img.onerror = (error) => reject(error);
      img.src = url;
    });
  };

  const formatarData = (dataStr) => {
    if (!dataStr) return 'N/A';
    const partes = dataStr.split('T')[0].split('-');
    return partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : dataStr;
  };

  // 🟢 Tratamento para a lista de cargas
  const extrairCargas = () => {
    if (!atm.lista_cargas) return [];
    try {
      return typeof atm.lista_cargas === 'string' ? JSON.parse(atm.lista_cargas) : atm.lista_cargas;
    } catch (e) {
      return [];
    }
  };

  const handleGerarPdf = async () => {
    setGerando(true);

    try {
      const [logoBase64, carimboBase64] = await Promise.all([
        getBase64ImageFromURL(logoComau),
        getBase64ImageFromURL(carimbo)
      ]);

      const cargas = extrairCargas();
      
      // Monta as linhas da tabela de itens
      const linhasItens = cargas.length > 0 
        ? cargas.map(c => [
            { text: c.nome || c.name || '-', margin: [0, 4] },
            { text: c.quantidade || c.qty || '-', alignment: 'center', margin: [0, 4] },
            { text: c.peso ? `${c.peso} kg` : '-', alignment: 'center', margin: [0, 4] },
            { text: (c.comprimento || c.l) ? `${c.comprimento || c.l}x${c.largura || c.w}x${c.altura || c.h}m` : '-', alignment: 'center', margin: [0, 4] }
          ])
        : [[{ text: 'Nenhum item detalhado', colSpan: 4, alignment: 'center', margin: [0, 5] }, {}, {}, {}]];

      const docDefinition = {
        pageSize: 'A4',
        pageMargins: [40, 20, 40, 25], 
        content: [
          // LOGO
          {
            image: logoBase64,
            width: 85,
            alignment: 'center',
            margin: [0, 0, 0, 8] 
          },

          // CABEÇALHO
          { text: 'ATM - AUTORIZAÇÃO DE TRANSPORTE DE MERCADORIA', style: 'headerMain' },
          { text: 'SISTEMA DE GESTÃO LOGÍSTICA', style: 'headerSub' },
          { canvas: [{ type: 'line', x1: 0, y1: 3, x2: 515, y2: 3, lineWidth: 1.2, lineColor: '#333333' }] },
          
          // NÚMERO E TRANSPORTADORA
          {
            margin: [0, 15, 0, 12],
            columns: [
              { text: [{ text: 'Nº ATM: ', bold: true }, atm.numero_atm || (atm.id ? atm.id.substring(0,8).toUpperCase() : 'N/A')] },
              { text: [{ text: 'Transportadora: ', bold: true }, atm.transportadora?.nome || atm.nome_transportadora || 'A DEFINIR'], alignment: 'right' }
            ]
          },

          // IDENTIFICAÇÃO
          {
            table: { widths: ['*'], body: [[{ text: 'IDENTIFICAÇÃO', style: 'sectionTitle', fillColor: '#EEEEEE' }]] },
            margin: [0, 0, 0, 4]
          },
          {
            table: {
              widths: [150, '*'],
              body: [
                [{ text: 'Solicitante:', bold: true, margin: [0, 4] }, { text: atm.solicitacao || 'N/A', margin: [0, 4] }],
                [{ text: 'Data da Solicitação:', bold: true, margin: [0, 4] }, { text: formatarData(atm.data_solicitacao || atm.created_at), margin: [0, 4] }],
                [{ text: 'Centro de Custo / WBS:', bold: true, margin: [0, 4] }, { text: atm.wbs || 'N/A', margin: [0, 4] }],
                [{ text: 'Tipo de Operação:', bold: true, margin: [0, 4] }, { text: atm.tipo_operacao?.toUpperCase() || 'N/A', margin: [0, 4] }]
              ]
            },
            margin: [0, 0, 0, 15]
          },

          // COLETA
          {
            table: { widths: ['*'], body: [[{ text: 'LOCAL DA COLETA (ORIGEM)', style: 'sectionTitle', fillColor: '#EEEEEE' }]] },
            margin: [0, 0, 0, 4]
          },
          {
            table: {
              widths: ['*', 140],
              body: [
                [
                  { text: [{ text: 'Endereço: ', bold: true }, `${atm.origem?.logradouro || ''}, ${atm.origem?.numero || ''} - ${atm.origem?.municipio || ''}/${atm.origem?.uf || ''} - CEP: ${atm.origem?.cep || 'N/A'}`], margin: [0, 5] },
                  { text: [{ text: 'Previsão: ', bold: true }, formatarData(atm.data_coleta)], alignment: 'right', margin: [0, 5] } // 🟢 CORREÇÃO: data_coleta ao invés de created_at
                ],
                [
                  { 
                    text: [
                      { text: 'Contato: ', bold: true }, 
                      atm.contato_coleta || atm.origem?.contato || 'N/A', 
                      '   |   ', 
                      { text: 'Telefone: ', bold: true }, 
                      atm.telefone_coleta || atm.origem?.telefone || 'N/A'
                    ], 
                    colSpan: 2, 
                    margin: [0, 5] 
                  },
                  {} // Espaço vazio obrigatório devido ao colSpan
                ]
              ]
            },
            margin: [0, 0, 0, 15]
          },

          // ENTREGA
          {
            table: { widths: ['*'], body: [[{ text: 'LOCAL DA ENTREGA (DESTINO)', style: 'sectionTitle', fillColor: '#EEEEEE' }]] },
            margin: [0, 0, 0, 4]
          },
          {
            table: {
              widths: ['*', 140],
              body: [
                [
                  { text: [{ text: 'Endereço: ', bold: true }, `${atm.destino?.logradouro || ''}, ${atm.destino?.numero || ''} - ${atm.destino?.municipio || ''}/${atm.destino?.uf || ''} - CEP: ${atm.destino?.cep || 'N/A'}`], margin: [0, 5] },
                  { text: [{ text: 'Previsão: ', bold: true }, formatarData(atm.data_entrega)], alignment: 'right', margin: [0, 5] }
                ],
                [
                  { 
                    text: [
                      { text: 'Contato: ', bold: true }, 
                      atm.contato_entrega || atm.destino?.contato || 'N/A', 
                      '   |   ', 
                      { text: 'Telefone: ', bold: true }, 
                      atm.telefone_entrega || atm.destino?.telefone || 'N/A'
                    ], 
                    colSpan: 2, 
                    margin: [0, 5] 
                  },
                  {} 
                ]
              ]
            },
            margin: [0, 0, 0, 15]
          },

          // 🟢 NOVA SEÇÃO: DETALHAMENTO DA CARGA (ITENS)
          {
            table: { widths: ['*'], body: [[{ text: 'DETALHAMENTO DA CARGA', style: 'sectionTitle', fillColor: '#EEEEEE' }]] },
            margin: [0, 0, 0, 4]
          },
          {
            table: {
              widths: ['*', 50, 70, 100], // Proporções da tabela
              headerRows: 1,
              body: [
                // Cabeçalho da tabela de itens
                [
                  { text: 'Descrição do Item', bold: true, fillColor: '#f8fafc', margin: [0, 4] },
                  { text: 'Qtd.', bold: true, alignment: 'center', fillColor: '#f8fafc', margin: [0, 4] },
                  { text: 'Peso Unit.', bold: true, alignment: 'center', fillColor: '#f8fafc', margin: [0, 4] },
                  { text: 'Medidas (CxLxA)', bold: true, alignment: 'center', fillColor: '#f8fafc', margin: [0, 4] }
                ],
                // Linhas mapeadas dinamicamente
                ...linhasItens
              ]
            },
            margin: [0, 0, 0, 15]
          },

          // OBSERVAÇÕES
          {
            table: { widths: ['*'], body: [[{ text: 'OBSERVAÇÕES', style: 'sectionTitle', fillColor: '#EEEEEE' }]] },
            margin: [0, 0, 0, 4]
          },
          {
            table: {
              widths: ['*'],
              heights: 45, 
              body: [[{ text: atm.observacoes || 'Nenhuma observação extra.', fontSize: 9.5, margin: [5, 4, 5, 4] }]]
            },
            margin: [0, 0, 0, 5]
          },

          // ASSINATURA CENTRALIZADA COM CARIMBO
          {
            margin: [0, 5, 0, 0], 
            columns: [
              { width: '*', text: '' },
              {
                width: 280,
                stack: [
                  {
                    image: carimboBase64,
                    width: 220, 
                    alignment: 'center',
                    margin: [0, 0, 0, 5] 
                  },
                  { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 280, y2: 0, lineWidth: 1 }] },
                  { text: `Emissão: ${new Date().toLocaleDateString()} | Sistema ATM Log`, fontSize: 8, color: 'gray', margin: [0, 5, 0, 2]  }
                ],
                alignment: 'center'
              },
              { width: '*', text: '' }
            ]
          }
        ],
        styles: {
          headerMain: { fontSize: 17, bold: true, alignment: 'center', color: '#000000' },
          headerSub: { fontSize: 11, alignment: 'center', margin: [0, 1, 0, 1], color: '#444444' },
          sectionTitle: { fontSize: 10.5, bold: true, color: '#000000', margin: [5, 2, 5, 2] },
          signatureLabel: { fontSize: 9.5, bold: true }
        },
        defaultStyle: { 
          fontSize: 10.5, 
          columnGap: 18 
        }
      };

      pdfMake.createPdf(docDefinition).download(`ATM_${atm.numero_atm || 'doc'}.pdf`);
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      alert("Erro ao carregar imagens ou gerar PDF.");
    } finally {
      setGerando(false);
    }
  };

  return (
    <button onClick={handleGerarPdf} disabled={gerando} 
      style={{ 
        display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.7rem 1.5rem', 
        borderRadius: '0.5rem', border: '1px solid #fca5a5', cursor: gerando ? 'not-allowed' : 'pointer', 
        fontWeight: 'bold', backgroundColor: '#fee2e2', color: '#ef4444', transition: 'all 0.2s',
        opacity: gerando ? 0.7 : 1, fontSize: '1rem'
      }}
    >
      <FileText size={20} /> {gerando ? 'Processando...' : 'Gerar Autorização (PDF)'}
    </button>
  );
}
