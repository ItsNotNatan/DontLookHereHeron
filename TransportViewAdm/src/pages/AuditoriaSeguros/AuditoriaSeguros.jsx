import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import logoComau from '../../assets/logo-comau.png';
import './AuditoriaSeguros.css';

const LIMITE_ANEXO = 5 * 1024 * 1024;
const LINHAS_POR_PAGINA = 20;

function getDataAtual() {
  const agora = new Date();
  const dataLocal = new Date(agora.getTime() - agora.getTimezoneOffset() * 60000);
  return dataLocal.toISOString().slice(0, 10);
}

function formatarData(valor) {
  if (!valor) return '-';
  const somenteData = String(valor).slice(0, 10);
  const data = new Date(`${somenteData}T00:00:00`);
  return Number.isNaN(data.getTime()) ? '-' : data.toLocaleDateString('pt-BR');
}

function formatarMoeda(valor) {
  if (valor === null || valor === undefined || valor === '') return '-';
  const numero = Number(valor);
  return Number.isFinite(numero)
    ? numero.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    : '-';
}

function mensagemErro(error, padrao) {
  return error?.response?.data?.erro
    || error?.response?.data?.mensagem
    || error?.response?.data?.message
    || error?.message
    || padrao;
}

function lerArquivoComoDataUrl(arquivo) {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => resolve(leitor.result);
    leitor.onerror = () => reject(new Error('Não foi possível ler o anexo.'));
    leitor.readAsDataURL(arquivo);
  });
}

function dataUrlParaBlob(dataUrl, tipoFallback = 'application/octet-stream') {
  const partes = String(dataUrl).split(',');
  if (partes.length !== 2) throw new Error('O anexo salvo possui um formato inválido.');

  const tipoInformado = partes[0].match(/^data:([^;]+)/)?.[1] || tipoFallback;
  const binario = window.atob(partes[1]);
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i += 1) bytes[i] = binario.charCodeAt(i);
  return new Blob([bytes], { type: tipoInformado });
}

function baixarOuAbrirAnexo(registro) {
  if (!registro?.anexo_data) return;

  try {
    const blob = dataUrlParaBlob(registro.anexo_data, registro.anexo_tipo);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    const tipo = blob.type.toLowerCase();
    const podeVisualizar = tipo === 'application/pdf' || tipo.startsWith('image/') || tipo.startsWith('text/');
    if (!podeVisualizar) link.download = registro.anexo_nome || 'anexo';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (error) {
    window.alert(mensagemErro(error, 'Não foi possível abrir o anexo.'));
  }
}

function exportarCSV(lista) {
  if (!lista.length) {
    window.alert('Não há auditorias para exportar.');
    return;
  }

  const colunas = [
    'Período', 'Transportadora', 'ATM', 'Data do frete', 'Valor da carga',
    'Valor do seguro', 'Resultado', 'Tipo de documento', 'Referência',
    'Solicitação', 'Recebimento', 'Responsável', 'Link/arquivo', 'Nome do anexo', 'Observações'
  ];

  const linhas = lista.map((item) => [
    item.periodo,
    item.transportadora,
    item.atm,
    item.data_frete,
    item.valor_carga,
    item.valor_seguro,
    item.resultado,
    item.tipo_documento,
    item.referencia,
    item.data_solicitacao,
    item.data_recebimento,
    item.responsavel,
    item.documento_link,
    item.anexo_nome,
    item.observacoes
  ]);

  const escapar = (valor) => `"${String(valor ?? '').replaceAll('"', '""')}"`;
  const conteudo = [colunas, ...linhas]
    .map((linha) => linha.map(escapar).join(';'))
    .join('\r\n');
  const blob = new Blob(['\ufeff', conteudo], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'auditorias_seguros_comau.csv';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function BadgeResultado({ resultado }) {
  const classe = resultado === 'Conforme'
    ? 'ok'
    : resultado === 'Pendente'
      ? 'warn'
      : resultado === 'Não conforme'
        ? 'bad'
        : 'neutral';

  return <span className={`auditoria-status ${classe}`}>{resultado || 'Sem classificação'}</span>;
}

function Paginacao({ total, pagina, aoMudar }) {
  const totalPaginas = Math.max(1, Math.ceil(total / LINHAS_POR_PAGINA));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const inicio = total ? (paginaAtual - 1) * LINHAS_POR_PAGINA + 1 : 0;
  const fim = Math.min(paginaAtual * LINHAS_POR_PAGINA, total);

  return (
    <div className="auditoria-pagination">
      <span>Mostrando {inicio} até {fim} de {total} auditoria(s)</span>
      <div className="auditoria-pagination-controls">
        <button
          type="button"
          className="auditoria-btn auditoria-btn-secondary"
          onClick={() => aoMudar(Math.max(1, paginaAtual - 1))}
          disabled={paginaAtual <= 1}
        >
          ‹ Anterior
        </button>
        <strong>{paginaAtual} / {totalPaginas}</strong>
        <button
          type="button"
          className="auditoria-btn auditoria-btn-secondary"
          onClick={() => aoMudar(Math.min(totalPaginas, paginaAtual + 1))}
          disabled={paginaAtual >= totalPaginas}
        >
          Próxima ›
        </button>
      </div>
    </div>
  );
}

function CampoDetalhe({ rotulo, valor }) {
  return (
    <div className="auditoria-detail-item">
      <dt>{rotulo}</dt>
      <dd>{valor || '-'}</dd>
    </div>
  );
}

export default function AuditoriaSeguros() {
  const [abaAtiva, setAbaAtiva] = useState('registro');
  const [registros, setRegistros] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erroCarregamento, setErroCarregamento] = useState('');
  const [mensagem, setMensagem] = useState({ tipo: '', texto: '' });
  const [resultado, setResultado] = useState('Conforme');
  const [fTransportadora, setFTransportadora] = useState('');
  const [fResultado, setFResultado] = useState('');
  const [fPeriodo, setFPeriodo] = useState('');
  const [paginaDashboard, setPaginaDashboard] = useState(1);
  const [paginaHistorico, setPaginaHistorico] = useState(1);
  const [auditoriaSelecionada, setAuditoriaSelecionada] = useState(null);

  // A API permite exclusões somente para o perfil Admin.
  const ehAdmin = localStorage.getItem('perfil') === 'Admin';

  const carregarRegistros = useCallback(async () => {
    setCarregando(true);
    try {
      const response = await api.get('/admin/auditoria-seguros');
      const dados = Array.isArray(response.data) ? response.data : [];
      setRegistros(dados);
      setErroCarregamento('');
      return true;
    } catch (error) {
      const texto = mensagemErro(error, 'Não foi possível carregar as auditorias do servidor.');
      setErroCarregamento(texto);
      return false;
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregarRegistros();
  }, [carregarRegistros]);

  const registrosOrdenados = useMemo(() => (
    [...registros].sort((a, b) => String(b.periodo || '').localeCompare(String(a.periodo || '')))
  ), [registros]);

  const transportadorasUnicas = useMemo(() => (
    [...new Set(registros.map((item) => item.transportadora).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, 'pt-BR'))
  ), [registros]);

  const registrosFiltrados = useMemo(() => (
    registrosOrdenados.filter((item) => (
      (!fTransportadora || item.transportadora === fTransportadora)
      && (!fResultado || item.resultado === fResultado)
      && (!fPeriodo || String(item.periodo || '') >= fPeriodo)
    ))
  ), [registrosOrdenados, fTransportadora, fResultado, fPeriodo]);

  const total = registrosFiltrados.length;
  const conformes = registrosFiltrados.filter((item) => item.resultado === 'Conforme').length;
  const pendentes = registrosFiltrados.filter((item) => item.resultado === 'Pendente').length;
  const naoConformes = registrosFiltrados.filter((item) => item.resultado === 'Não conforme').length;
  const taxaConformidade = total ? Math.round((conformes / total) * 100) : 0;

  const totalPaginasDashboard = Math.max(1, Math.ceil(total / LINHAS_POR_PAGINA));
  const paginaDashboardAtual = Math.min(paginaDashboard, totalPaginasDashboard);
  const registrosDashboardPagina = registrosFiltrados.slice(
    (paginaDashboardAtual - 1) * LINHAS_POR_PAGINA,
    paginaDashboardAtual * LINHAS_POR_PAGINA
  );

  const totalPaginasHistorico = Math.max(1, Math.ceil(registrosOrdenados.length / LINHAS_POR_PAGINA));
  const paginaHistoricoAtual = Math.min(paginaHistorico, totalPaginasHistorico);
  const registrosHistoricoPagina = registrosOrdenados.slice(
    (paginaHistoricoAtual - 1) * LINHAS_POR_PAGINA,
    paginaHistoricoAtual * LINHAS_POR_PAGINA
  );

  const limparMensagem = () => setMensagem({ tipo: '', texto: '' });

  const handleSubmeterAuditoria = async (event) => {
    event.preventDefault();
    const formulario = event.currentTarget;
    const formData = new FormData(formulario);
    const arquivo = formData.get('anexo');

    if (arquivo instanceof File && arquivo.size > LIMITE_ANEXO) {
      setMensagem({ tipo: 'err', texto: 'O anexo é maior que 5 MB. Escolha um arquivo menor.' });
      return;
    }

    setSalvando(true);
    limparMensagem();

    try {
      let anexoData = '';
      let anexoNome = '';
      let anexoTipo = '';

      if (arquivo instanceof File && arquivo.size > 0) {
        anexoData = await lerArquivoComoDataUrl(arquivo);
        anexoNome = arquivo.name;
        anexoTipo = arquivo.type || 'application/octet-stream';
      }

      const payload = {
        periodo: String(formData.get('periodo') || ''),
        transportadora: String(formData.get('transportadora') || '').trim(),
        atm: String(formData.get('atm') || '').trim(),
        data_frete: String(formData.get('dataFrete') || ''),
        valor_carga: formData.get('valorCarga') ? Number(formData.get('valorCarga')) : 0,
        valor_seguro: formData.get('valorSeguro') ? Number(formData.get('valorSeguro')) : 0,
        data_solicitacao: String(formData.get('dataSolicitacao') || ''),
        data_recebimento: String(formData.get('dataRecebimento') || ''),
        resultado: String(formData.get('resultado') || 'Conforme'),
        tipo_documento: String(formData.get('tipoDocumento') || 'Averbação'),
        referencia: String(formData.get('referencia') || '').trim(),
        documento_link: String(formData.get('documentoLink') || '').trim(),
        anexo_data: anexoData,
        anexo_nome: anexoNome,
        anexo_tipo: anexoTipo,
        responsavel: String(formData.get('responsavel') || '').trim(),
        observacoes: String(formData.get('observacoes') || '').trim()
      };

      await api.post('/admin/auditoria-seguros', payload);
      formulario.reset();
      setResultado('Conforme');
      setAbaAtiva('registro');
      setPaginaHistorico(1);
      setMensagem({ tipo: 'ok', texto: 'Auditoria salva com sucesso no banco de dados.' });

      const atualizou = await carregarRegistros();
      if (!atualizou) {
        setMensagem({
          tipo: 'err',
          texto: 'A auditoria foi enviada, mas não foi possível atualizar a lista. Atualize a página para conferir o registro.'
        });
      }
    } catch (error) {
      setMensagem({
        tipo: 'err',
        texto: mensagemErro(error, 'Não foi possível salvar a auditoria. Confira sua conexão e tente novamente.')
      });
    } finally {
      setSalvando(false);
    }
  };

  const excluirAuditoria = async (id) => {
    if (!ehAdmin) return;
    if (!window.confirm('Excluir esta auditoria? Esta ação não pode ser desfeita.')) return;

    try {
      await api.delete(`/admin/auditoria-seguros/${id}`);
      if (auditoriaSelecionada?.id === id) setAuditoriaSelecionada(null);
      await carregarRegistros();
      setMensagem({ tipo: 'ok', texto: 'Auditoria excluída com sucesso.' });
    } catch (error) {
      window.alert(mensagemErro(error, 'Erro ao excluir a auditoria.'));
    }
  };

  const apagarTudo = async () => {
    if (!ehAdmin || !registros.length) return;
    if (!window.confirm('Apagar todo o histórico? Esta ação não pode ser desfeita.')) return;

    try {
      await api.delete('/admin/auditoria-seguros');
      setAuditoriaSelecionada(null);
      setPaginaDashboard(1);
      setPaginaHistorico(1);
      await carregarRegistros();
      setMensagem({ tipo: 'ok', texto: 'Todo o histórico foi excluído.' });
    } catch (error) {
      window.alert(mensagemErro(error, 'Erro ao excluir o histórico.'));
    }
  };

  const mudarFiltro = (setter, valor) => {
    setter(valor);
    setPaginaDashboard(1);
  };

  const abrirDetalhes = (registro) => setAuditoriaSelecionada(registro);

  return (
    <div className="auditoria-container">
      <header className="auditoria-topbar">
        <div className="auditoria-brand">
          <img className="auditoria-brand-logo" src={logoComau} alt="Logotipo Comau" />
          <div className="auditoria-brand-title">
            <h1>Auditoria Quinzenal de Seguros</h1>
            <p>Fretes dedicados — controle de documentos de seguro e averbação</p>
          </div>
        </div>
        <div className="auditoria-topnote">Comau<br />Gestão logística</div>
      </header>

      <main className="auditoria-app">
        <nav className="auditoria-tabs" aria-label="Navegação da auditoria">
          {[
            ['registro', 'Nova auditoria'],
            ['painel', 'Dashboard'],
            ['historico', 'Histórico'],
            ['regras', 'Regra resumida']
          ].map(([id, rotulo]) => (
            <button
              key={id}
              type="button"
              className={`auditoria-tab-btn ${abaAtiva === id ? 'active' : ''}`}
              aria-current={abaAtiva === id ? 'page' : undefined}
              onClick={() => {
                setAbaAtiva(id);
                limparMensagem();
                if (id === 'painel') setPaginaDashboard(1);
              }}
            >
              {rotulo}
            </button>
          ))}
        </nav>

        {erroCarregamento && (
          <div className="auditoria-alert auditoria-alert-error" role="alert">
            <strong>Não foi possível carregar os registros.</strong> {erroCarregamento}
            <button type="button" className="auditoria-btn auditoria-btn-secondary" onClick={carregarRegistros}>
              Tentar novamente
            </button>
          </div>
        )}

        {abaAtiva === 'registro' && (
          <section className="auditoria-tab-content">
            <div className="auditoria-notice">
              <strong>Como preencher:</strong> a cada 15 dias, sorteie uma ATM realizada pela transportadora, solicite o documento oficial do seguro/averbação e registre aqui o resultado da conferência.
            </div>

            <section className="auditoria-card">
              <h2>Registrar auditoria quinzenal</h2>
              <form onSubmit={handleSubmeterAuditoria} onReset={() => setResultado('Conforme')}>
                <div className="auditoria-grid">
                  <div className="auditoria-field">
                    <label htmlFor="aud-periodo">Período da auditoria</label>
                    <input id="aud-periodo" name="periodo" type="date" defaultValue={getDataAtual()} required />
                  </div>
                  <div className="auditoria-field">
                    <label htmlFor="aud-transportadora">Transportadora</label>
                    <input id="aud-transportadora" name="transportadora" type="text" placeholder="Ex.: Transportadora ABC" maxLength={255} required />
                  </div>
                  <div className="auditoria-field">
                    <label htmlFor="aud-atm">ATM sorteada</label>
                    <input id="aud-atm" name="atm" type="text" placeholder="Ex.: ATM 123" maxLength={100} required />
                  </div>
                  <div className="auditoria-field">
                    <label htmlFor="aud-data-frete">Data do frete</label>
                    <input id="aud-data-frete" name="dataFrete" type="date" />
                  </div>
                  <div className="auditoria-field">
                    <label htmlFor="aud-valor-carga">Valor da carga (R$)</label>
                    <input id="aud-valor-carga" name="valorCarga" type="number" min="0" step="0.01" placeholder="0,00" />
                  </div>
                  <div className="auditoria-field">
                    <label htmlFor="aud-valor-seguro">Valor do seguro/averbação (R$)</label>
                    <input id="aud-valor-seguro" name="valorSeguro" type="number" min="0" step="0.01" placeholder="0,00" />
                  </div>
                  <div className="auditoria-field">
                    <label htmlFor="aud-data-solicitacao">Data da solicitação do documento</label>
                    <input id="aud-data-solicitacao" name="dataSolicitacao" type="date" />
                  </div>
                  <div className="auditoria-field">
                    <label htmlFor="aud-data-recebimento">Data do recebimento</label>
                    <input id="aud-data-recebimento" name="dataRecebimento" type="date" />
                  </div>
                </div>

                <div className="auditoria-section-title">
                  <h3>Resultado da conferência</h3>
                  <span className="auditoria-muted">Marque o que foi identificado no documento recebido.</span>
                </div>
                <div className="auditoria-checks">
                  {[
                    ['Conforme', 'Documento conforme'],
                    ['Pendente', 'Documento pendente'],
                    ['Não conforme', 'Documento não conforme']
                  ].map(([valor, rotulo]) => (
                    <label key={valor} className={`auditoria-check ${resultado === valor ? 'selected' : ''}`}>
                      <input
                        type="radio"
                        name="resultado"
                        value={valor}
                        checked={resultado === valor}
                        onChange={() => setResultado(valor)}
                      />
                      <span>{rotulo}</span>
                    </label>
                  ))}
                </div>

                <div className="auditoria-grid auditoria-grid-details">
                  <div className="auditoria-field">
                    <label htmlFor="aud-tipo-documento">Tipo de documento</label>
                    <select id="aud-tipo-documento" name="tipoDocumento" defaultValue="Averbação">
                      <option value="Averbação">Averbação</option>
                      <option value="Apólice / certificado">Apólice / certificado</option>
                      <option value="Comprovante de cobrança">Comprovante de cobrança</option>
                      <option value="Outro">Outro</option>
                    </select>
                  </div>
                  <div className="auditoria-field">
                    <label htmlFor="aud-referencia">Nº do documento / referência</label>
                    <input id="aud-referencia" name="referencia" type="text" maxLength={255} placeholder="Opcional" />
                  </div>
                  <div className="auditoria-field">
                    <label htmlFor="aud-documento-link">Link ou nome do arquivo</label>
                    <input id="aud-documento-link" name="documentoLink" type="text" maxLength={500} placeholder="Opcional" />
                  </div>
                  <div className="auditoria-field">
                    <label htmlFor="aud-anexo">Anexo do documento</label>
                    <input id="aud-anexo" name="anexo" type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx,.txt" />
                    <span className="auditoria-muted">PDF, imagem ou documento. Limite máximo: 5 MB.</span>
                  </div>
                  <div className="auditoria-field">
                    <label htmlFor="aud-responsavel">Responsável pela conferência</label>
                    <input id="aud-responsavel" name="responsavel" type="text" maxLength={255} placeholder="Nome do analista" />
                  </div>
                  <div className="auditoria-field auditoria-field-full">
                    <label htmlFor="aud-observacoes">Observações</label>
                    <textarea id="aud-observacoes" name="observacoes" maxLength={5000} placeholder="Informe divergências, justificativas ou detalhes da conferência" />
                  </div>
                </div>

                <div className="auditoria-actions">
                  <span className="auditoria-muted">Os registros serão salvos no banco de dados do sistema.</span>
                  <div className="auditoria-actions-right">
                    <button type="reset" className="auditoria-btn auditoria-btn-secondary" disabled={salvando}>Limpar</button>
                    <button type="submit" className="auditoria-btn auditoria-btn-primary" disabled={salvando}>
                      {salvando ? 'Salvando...' : 'Salvar auditoria'}
                    </button>
                  </div>
                </div>
                {mensagem.texto && (
                  <div className={`auditoria-message ${mensagem.tipo === 'ok' ? 'ok' : 'err'}`} role="status">
                    {mensagem.texto}
                  </div>
                )}
              </form>
            </section>

            <section className="auditoria-card">
              <h2>Resumo do processo</h2>
              <div className="auditoria-rules">
                <div className="auditoria-rule"><strong>Periodicidade</strong>A auditoria deve ser realizada a cada 15 dias.</div>
                <div className="auditoria-rule"><strong>Amostragem</strong>Sortear uma ATM/frete realizado pela transportadora.</div>
                <div className="auditoria-rule"><strong>Documento</strong>Solicitar o documento oficial do seguro ou averbação da ATM.</div>
                <div className="auditoria-rule"><strong>Registro</strong>Guardar o resultado e a evidência da conferência.</div>
              </div>
            </section>
          </section>
        )}

        {abaAtiva === 'painel' && (
          <section className="auditoria-tab-content">
            <div className="auditoria-kpis">
              <div className="auditoria-kpi"><small>Total de auditorias</small><strong>{total}</strong></div>
              <div className="auditoria-kpi"><small>Conformes</small><strong>{conformes}</strong></div>
              <div className="auditoria-kpi"><small>Pendentes</small><strong>{pendentes}</strong></div>
              <div className="auditoria-kpi"><small>Não conformes</small><strong>{naoConformes}</strong></div>
              <div className="auditoria-kpi"><small>Taxa de conformidade</small><strong>{taxaConformidade}%</strong></div>
            </div>

            <section className="auditoria-card">
              <h2>Filtros do dashboard</h2>
              <div className="auditoria-filters">
                <div className="auditoria-field">
                  <label htmlFor="aud-f-transportadora">Transportadora</label>
                  <select id="aud-f-transportadora" value={fTransportadora} onChange={(event) => mudarFiltro(setFTransportadora, event.target.value)}>
                    <option value="">Todas</option>
                    {transportadorasUnicas.map((nome) => <option key={nome} value={nome}>{nome}</option>)}
                  </select>
                </div>
                <div className="auditoria-field">
                  <label htmlFor="aud-f-resultado">Resultado</label>
                  <select id="aud-f-resultado" value={fResultado} onChange={(event) => mudarFiltro(setFResultado, event.target.value)}>
                    <option value="">Todos</option>
                    <option value="Conforme">Conforme</option>
                    <option value="Pendente">Pendente</option>
                    <option value="Não conforme">Não conforme</option>
                  </select>
                </div>
                <div className="auditoria-field">
                  <label htmlFor="aud-f-periodo">Período a partir de</label>
                  <input id="aud-f-periodo" type="date" value={fPeriodo} onChange={(event) => mudarFiltro(setFPeriodo, event.target.value)} />
                </div>
                <button
                  type="button"
                  className="auditoria-btn auditoria-btn-secondary"
                  onClick={() => {
                    setFTransportadora('');
                    setFResultado('');
                    setFPeriodo('');
                    setPaginaDashboard(1);
                  }}
                >
                  Limpar filtros
                </button>
              </div>
              <div className="auditoria-summary">{total} auditoria(s) no filtro atual.</div>
            </section>

            <div className="auditoria-dashgrid">
              <section className="auditoria-card">
                <h2>Distribuição por resultado</h2>
                {[
                  ['Conforme', conformes, 'ok'],
                  ['Pendente', pendentes, 'warn'],
                  ['Não conforme', naoConformes, 'bad']
                ].map(([nome, quantidade, classe]) => {
                  const percentual = total ? Math.round((quantidade / total) * 100) : 0;
                  return (
                    <div className="auditoria-barrow" key={nome}>
                      <span>{nome}</span>
                      <div className="auditoria-track">
                        <div className={`auditoria-fill ${classe}`} style={{ width: `${percentual}%` }} />
                      </div>
                      <span className="auditoria-barvalue">{quantidade} ({percentual}%)</span>
                    </div>
                  );
                })}
                {!total && <p className="auditoria-empty-inline">Nenhuma auditoria no filtro selecionado.</p>}
              </section>

              <section className="auditoria-card">
                <h2>Indicador de conformidade</h2>
                <div className="auditoria-rate-box">
                  <div className="auditoria-rate-big">{taxaConformidade}%</div>
                  <div className="auditoria-muted">Percentual de auditorias conformes no filtro atual</div>
                  <div className="auditoria-track auditoria-rate-track">
                    <div className="auditoria-fill ok" style={{ width: `${taxaConformidade}%` }} />
                  </div>
                  <div className="auditoria-summary">Meta gerencial sugerida: acompanhar a evolução e tratar todos os casos pendentes ou não conformes.</div>
                </div>
              </section>
            </div>

            <section className="auditoria-card">
              <div className="auditoria-section-title auditoria-section-title-table">
                <h2>Auditorias filtradas</h2>
                <button type="button" className="auditoria-btn auditoria-btn-primary" onClick={() => exportarCSV(registrosFiltrados)}>
                  Exportar CSV
                </button>
              </div>
              <div className="auditoria-table-wrap">
                <table className="auditoria-table">
                  <thead>
                    <tr>
                      <th>Período</th><th>Transportadora</th><th>ATM</th><th>Tipo</th><th>Resultado</th>
                      <th>Solicitado</th><th>Recebido</th><th>Documento</th><th>Anexo</th><th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {carregando ? (
                      <tr><td colSpan="10" className="auditoria-empty">Carregando auditorias...</td></tr>
                    ) : registrosDashboardPagina.length ? registrosDashboardPagina.map((item) => (
                      <tr key={item.id}>
                        <td>{formatarData(item.periodo)}</td>
                        <td>{item.transportadora || '-'}</td>
                        <td>{item.atm || '-'}</td>
                        <td>{item.tipo_documento || '-'}</td>
                        <td><BadgeResultado resultado={item.resultado} /></td>
                        <td>{formatarData(item.data_solicitacao)}</td>
                        <td>{formatarData(item.data_recebimento)}</td>
                        <td>{item.referencia || item.documento_link || '-'}</td>
                        <td>
                          {item.anexo_data
                            ? <button type="button" className="auditoria-btn auditoria-btn-secondary auditoria-btn-small" onClick={() => baixarOuAbrirAnexo(item)}>Abrir anexo</button>
                            : '-'}
                        </td>
                        <td><button type="button" className="auditoria-btn auditoria-btn-secondary auditoria-btn-small" onClick={() => abrirDetalhes(item)}>Ver</button></td>
                      </tr>
                    )) : (
                      <tr><td colSpan="10" className="auditoria-empty">Nenhuma auditoria encontrada.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <Paginacao total={total} pagina={paginaDashboardAtual} aoMudar={setPaginaDashboard} />
            </section>
          </section>
        )}

        {abaAtiva === 'historico' && (
          <section className="auditoria-tab-content">
            <section className="auditoria-card">
              <div className="auditoria-section-title auditoria-section-title-table">
                <h2>Histórico de auditorias</h2>
                <div className="auditoria-actions-right">
                  <button type="button" className="auditoria-btn auditoria-btn-secondary" onClick={() => exportarCSV(registrosOrdenados)}>
                    Exportar CSV
                  </button>
                  {ehAdmin && (
                    <button type="button" className="auditoria-btn auditoria-btn-danger" onClick={apagarTudo} disabled={!registros.length}>
                      Apagar histórico
                    </button>
                  )}
                </div>
              </div>
              <p className="auditoria-muted">Consulte todos os registros, abra os documentos anexados, visualize os detalhes ou remova uma auditoria individual.</p>
              <div className="auditoria-table-wrap">
                <table className="auditoria-table auditoria-history-table">
                  <thead>
                    <tr>
                      <th>Período</th><th>Transportadora</th><th>ATM</th><th>Valor carga</th><th>Seguro</th>
                      <th>Resultado</th><th>Observação</th><th>Anexo</th><th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {carregando ? (
                      <tr><td colSpan="9" className="auditoria-empty">Carregando histórico...</td></tr>
                    ) : registrosHistoricoPagina.length ? registrosHistoricoPagina.map((item) => (
                      <tr key={item.id}>
                        <td>{formatarData(item.periodo)}</td>
                        <td>{item.transportadora || '-'}</td>
                        <td>{item.atm || '-'}</td>
                        <td>{formatarMoeda(item.valor_carga)}</td>
                        <td>{formatarMoeda(item.valor_seguro)}</td>
                        <td><BadgeResultado resultado={item.resultado} /></td>
                        <td title={item.observacoes || ''}>{(item.observacoes || '-').slice(0, 55)}</td>
                        <td>
                          {item.anexo_data
                            ? <button type="button" className="auditoria-btn auditoria-btn-secondary auditoria-btn-small" onClick={() => baixarOuAbrirAnexo(item)}>Abrir</button>
                            : '-'}
                        </td>
                        <td>
                          <div className="auditoria-row-actions">
                            <button type="button" className="auditoria-btn auditoria-btn-secondary auditoria-btn-small" onClick={() => abrirDetalhes(item)}>Ver</button>
                            {ehAdmin && (
                              <button type="button" className="auditoria-btn auditoria-btn-danger auditoria-btn-small" onClick={() => excluirAuditoria(item.id)}>Excluir</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )) : (
                      <tr><td colSpan="9" className="auditoria-empty">Nenhum registro salvo no banco.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <Paginacao total={registrosOrdenados.length} pagina={paginaHistoricoAtual} aoMudar={setPaginaHistorico} />
              {!ehAdmin && <p className="auditoria-footer">A exclusão de auditorias está disponível somente para usuários com perfil Admin.</p>}
            </section>
          </section>
        )}

        {abaAtiva === 'regras' && (
          <section className="auditoria-tab-content">
            <section className="auditoria-card">
              <h2>Regra resumida para apresentação</h2>
              <ol className="auditoria-info-list">
                <li>A cada 15 dias, a equipe seleciona aleatoriamente um frete realizado por uma transportadora dedicada.</li>
                <li>A operação selecionada é identificada pela ATM e o documento oficial do seguro/averbação é solicitado à transportadora.</li>
                <li>Quando o documento é recebido, a equipe confere se a ATM, o valor e a cobrança do seguro estão compatíveis com a operação.</li>
                <li>O resultado da conferência é classificado como <strong>Conforme</strong>, <strong>Pendente</strong> ou <strong>Não conforme</strong>.</li>
                <li>O histórico permite demonstrar a rastreabilidade da auditoria, a evidência solicitada e a tratativa de cada desvio.</li>
              </ol>

              <h3 className="auditoria-subheading">Indicadores sugeridos</h3>
              <div className="auditoria-formula">Taxa de conformidade = Auditorias conformes ÷ Total de auditorias realizadas × 100</div>
              <div className="auditoria-formula">Pendência = documento ainda não recebido ou registro aguardando tratativa</div>
              <div className="auditoria-formula">Não conformidade = documento recebido com divergência, ausência de evidência ou cobrança incompatível</div>
              <p className="auditoria-footer">Este controle é integrado ao banco de dados do ATMLog. Os anexos são armazenados junto ao registro da auditoria.</p>
            </section>
          </section>
        )}
      </main>

      {auditoriaSelecionada && (
        <div className="auditoria-modal-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setAuditoriaSelecionada(null);
        }}>
          <section className="auditoria-modal" role="dialog" aria-modal="true" aria-labelledby="auditoria-modal-title">
            <div className="auditoria-modal-header">
              <div>
                <h2 id="auditoria-modal-title">Detalhes da auditoria</h2>
                <p>ATM {auditoriaSelecionada.atm || '-'}</p>
              </div>
              <button type="button" className="auditoria-modal-close" aria-label="Fechar" onClick={() => setAuditoriaSelecionada(null)}>×</button>
            </div>
            <div className="auditoria-modal-body">
              <div className="auditoria-detail-result">
                <span>Resultado da conferência</span>
                <BadgeResultado resultado={auditoriaSelecionada.resultado} />
              </div>
              <dl className="auditoria-detail-grid">
                <CampoDetalhe rotulo="Período da auditoria" valor={formatarData(auditoriaSelecionada.periodo)} />
                <CampoDetalhe rotulo="Transportadora" valor={auditoriaSelecionada.transportadora} />
                <CampoDetalhe rotulo="ATM sorteada" valor={auditoriaSelecionada.atm} />
                <CampoDetalhe rotulo="Data do frete" valor={formatarData(auditoriaSelecionada.data_frete)} />
                <CampoDetalhe rotulo="Valor da carga" valor={formatarMoeda(auditoriaSelecionada.valor_carga)} />
                <CampoDetalhe rotulo="Valor do seguro/averbação" valor={formatarMoeda(auditoriaSelecionada.valor_seguro)} />
                <CampoDetalhe rotulo="Data da solicitação" valor={formatarData(auditoriaSelecionada.data_solicitacao)} />
                <CampoDetalhe rotulo="Data do recebimento" valor={formatarData(auditoriaSelecionada.data_recebimento)} />
                <CampoDetalhe rotulo="Tipo de documento" valor={auditoriaSelecionada.tipo_documento} />
                <CampoDetalhe rotulo="Referência" valor={auditoriaSelecionada.referencia} />
                <CampoDetalhe rotulo="Responsável" valor={auditoriaSelecionada.responsavel} />
                <CampoDetalhe rotulo="Link/nome do arquivo" valor={auditoriaSelecionada.documento_link} />
              </dl>
              <div className="auditoria-detail-observations">
                <strong>Observações</strong>
                <p>{auditoriaSelecionada.observacoes || 'Nenhuma observação registrada.'}</p>
              </div>
              {auditoriaSelecionada.anexo_data && (
                <button type="button" className="auditoria-btn auditoria-btn-primary" onClick={() => baixarOuAbrirAnexo(auditoriaSelecionada)}>
                  Abrir / baixar anexo ({auditoriaSelecionada.anexo_nome || 'Documento'})
                </button>
              )}
            </div>
            <div className="auditoria-modal-footer">
              {ehAdmin && (
                <button type="button" className="auditoria-btn auditoria-btn-danger" onClick={() => excluirAuditoria(auditoriaSelecionada.id)}>
                  Excluir auditoria
                </button>
              )}
              <button type="button" className="auditoria-btn auditoria-btn-secondary" onClick={() => setAuditoriaSelecionada(null)}>Fechar</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
