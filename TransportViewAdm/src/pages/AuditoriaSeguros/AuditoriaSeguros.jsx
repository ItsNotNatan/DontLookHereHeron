import React, { useState, useEffect } from 'react';
import './AuditoriaSeguros.css';

const KEY = 'comau_auditorias_seguros_v1';
const getDataAtual = () => new Date().toISOString().slice(0, 10);
const fmt = (v) => v ? new Date(v + 'T00:00:00').toLocaleDateString('pt-BR') : '-';
const money = (v) => v ? Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '-';

export default function AuditoriaSeguros() {
  const [activeTab, setActiveTab] = useState('registro');
  const [registros, setRegistros] = useState([]);
  
  // Estados do formulário
  const [msg, setMsg] = useState({ show: false, texto: '', tipo: '' });
  const [resultado, setResultado] = useState('Conforme');

  // Estados dos filtros
  const [fTransportadora, setFTransportadora] = useState('');
  const [fResultado, setFResultado] = useState('');
  const [fPeriodo, setFPeriodo] = useState('');

  useEffect(() => {
    const salvos = JSON.parse(localStorage.getItem(KEY) || '[]');
    setRegistros(salvos);
  }, []);

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(registros));
  }, [registros]);

  const transportadorasUnicas = [...new Set(registros.map(x => x.transportadora).filter(Boolean))].sort();
  
  const registrosFiltrados = registros.filter(x => 
    (!fTransportadora || x.transportadora === fTransportadora) &&
    (!fResultado || x.resultado === fResultado) &&
    (!fPeriodo || x.periodo >= fPeriodo)
  ).sort((a, b) => b.periodo.localeCompare(a.periodo));

  const total = registrosFiltrados.length;
  const ok = registrosFiltrados.filter(x => x.resultado === 'Conforme').length;
  const pend = registrosFiltrados.filter(x => x.resultado === 'Pendente').length;
  const nao = registrosFiltrados.filter(x => x.resultado === 'Não conforme').length;
  const rate = total ? Math.round((ok / total) * 100) : 0;

  const handleSubmeterAuditoria = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const dados = Object.fromEntries(formData.entries());
    const file = e.target.anexo.files[0];

    if (file && file.size > 5 * 1024 * 1024) {
      setMsg({ show: true, texto: 'O anexo é maior que 5 MB. Escolha um arquivo menor.', tipo: 'err' });
      return;
    }

    const salvarRegistro = (anexoInfo) => {
      const novoRegistro = {
        id: crypto.randomUUID(),
        periodo: dados.periodo,
        transportadora: dados.transportadora.trim(),
        atm: dados.atm.trim(),
        dataFrete: dados.dataFrete,
        valorCarga: dados.valorCarga,
        valorSeguro: dados.valorSeguro,
        dataSolicitacao: dados.dataSolicitacao,
        dataRecebimento: dados.dataRecebimento,
        resultado: resultado,
        tipoDocumento: dados.tipoDocumento,
        referencia: dados.referencia.trim(),
        documentoLink: dados.documentoLink.trim(),
        anexoData: anexoInfo?.data || '',
        anexoNome: anexoInfo?.name || '',
        anexoTipo: anexoInfo?.type || '',
        responsavel: dados.responsavel.trim(),
        observacoes: dados.observacoes.trim()
      };
      
      setRegistros(prev => [...prev, novoRegistro]);
      e.target.reset();
      e.target.periodo.value = getDataAtual();
      setResultado('Conforme');
      setMsg({ show: true, texto: 'Auditoria salva com sucesso, com o anexo vinculado.', tipo: 'ok' });
      setTimeout(() => setMsg({ show: false, texto: '', tipo: '' }), 3500);
    };

    if (!file) {
      salvarRegistro(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => salvarRegistro({ data: reader.result, name: file.name, type: file.type });
    reader.onerror = () => setMsg({ show: true, texto: 'Não foi possível ler o anexo.', tipo: 'err' });
    reader.readAsDataURL(file);
  };

  const apagarTudo = () => {
    if (registros.length && window.confirm('Apagar todo o histórico? Esta ação não pode ser desfeita.')) {
      setRegistros([]);
    }
  };

  const removeOne = (id) => {
    if (window.confirm('Excluir esta auditoria?')) {
      setRegistros(prev => prev.filter(x => x.id !== id));
    }
  };

  const abrirAnexo = (id) => {
    const x = registros.find(a => a.id === id);
    if (!x?.anexoData) return;
    const w = window.open();
    if (w) {
      w.document.write(`<title>${x.anexoNome || 'Anexo'}</title><p style="font-family:Arial;padding:20px">Anexo: ${x.anexoNome}</p><iframe src="${x.anexoData}" style="width:100%;height:90vh;border:0"></iframe>`);
      w.document.close();
    } else {
      alert('O navegador bloqueou a nova aba. Permita pop-ups para abrir o anexo.');
    }
  };

  const renderTag = (r) => {
    const c = r === 'Conforme' ? 'ok' : r === 'Pendente' ? 'warn' : 'bad';
    return <span className={`status ${c}`}>{r}</span>;
  };

  const exportarCSV = (lista) => {
    const cols = ['Período','Transportadora','ATM','Data do frete','Valor da carga','Valor do seguro','Resultado','Tipo de documento','Referência','Solicitação','Recebimento','Responsável','Link/arquivo','Observações'];
    const rows = lista.map(x => [x.periodo, x.transportadora, x.atm, x.dataFrete, x.valorCarga, x.valorSeguro, x.resultado, x.tipoDocumento, x.referencia, x.dataSolicitacao, x.dataRecebimento, x.responsavel, x.documentoLink, x.observacoes]);
    const text = [cols, ...rows].map(row => row.map(v => '"' + String(v ?? '').replaceAll('"', '""') + '"').join(';')).join('\n');
    const blob = new Blob(['\ufeff' + text], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'auditorias_seguros_comau.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="auditoria-container">
      <header className="topbar">
        <div className="brand">
          <img className="brand-logo" src="/comauazul.jfif" alt="Logotipo Comau" onError={(e) => e.target.style.display='none'} />
          <div>
            <h1>Auditoria Quinzenal de Seguros</h1>
            <p>Fretes dedicados — controle de documentos de seguro e averbação</p>
          </div>
        </div>
        <div className="topnote">Comau<br />Gestão logística</div>
      </header>

      <main className="app">
        <nav className="tabs">
          {['registro', 'painel', 'historico', 'regras'].map(tab => (
            <button 
              key={tab} 
              className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'registro' ? 'Nova auditoria' : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>

        {activeTab === 'registro' && (
          <section className="tab active">
            <div className="notice"><strong>Como preencher:</strong> a cada 15 dias, sorteie uma ATM realizada pela transportadora, solicite o documento oficial do seguro/averbação e registre aqui o resultado da conferência.</div>
            <section className="card">
              <h2>Registrar auditoria quinzenal</h2>
              <form onSubmit={handleSubmeterAuditoria}>
                <div className="grid">
                  <div className="field"><label>Período da auditoria</label><input name="periodo" type="date" defaultValue={getDataAtual()} required /></div>
                  <div className="field"><label>Transportadora</label><input name="transportadora" type="text" placeholder="Ex.: Transportadora ABC" required /></div>
                  <div className="field"><label>ATM sorteada</label><input name="atm" type="text" placeholder="Ex.: ATM 123" required /></div>
                  <div className="field"><label>Data do frete</label><input name="dataFrete" type="date" /></div>
                  <div className="field"><label>Valor da carga (R$)</label><input name="valorCarga" type="number" min="0" step="0.01" placeholder="0,00" /></div>
                  <div className="field"><label>Valor do seguro/averbação (R$)</label><input name="valorSeguro" type="number" min="0" step="0.01" placeholder="0,00" /></div>
                  <div className="field"><label>Data da solicitação do documento</label><input name="dataSolicitacao" type="date" /></div>
                  <div className="field"><label>Data do recebimento</label><input name="dataRecebimento" type="date" /></div>
                </div>

                <div className="section-title">
                  <h3>Resultado da conferência</h3>
                  <span className="muted">Marque o que foi identificado no documento recebido.</span>
                </div>
                <div className="checks">
                  {['Conforme', 'Pendente', 'Não conforme'].map(res => (
                    <label key={res} className="check">
                      <input 
                        type="radio" 
                        name="resultado" 
                        value={res} 
                        checked={resultado === res}
                        onChange={(e) => setResultado(e.target.value)}
                      /> {`Documento ${res.toLowerCase()}`}
                    </label>
                  ))}
                </div>

                <div className="grid" style={{ marginTop: '11px' }}>
                  <div className="field">
                    <label>Tipo de documento</label>
                    <select name="tipoDocumento">
                      <option value="Averbação">Averbação</option>
                      <option value="Apólice / certificado">Apólice / certificado</option>
                      <option value="Comprovante de cobrança">Comprovante de cobrança</option>
                      <option value="Outro">Outro</option>
                    </select>
                  </div>
                  <div className="field"><label>Nº do documento / referência</label><input name="referencia" type="text" placeholder="Opcional" /></div>
                  <div className="field"><label>Link ou nome do arquivo</label><input name="documentoLink" type="text" placeholder="Opcional" /></div>
                  <div className="field">
                    <label>Anexo do documento</label>
                    <input name="anexo" type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx,.txt" />
                    <span className="muted">PDF, imagem ou documento. Limite recomendado: 5 MB.</span>
                  </div>
                  <div className="field"><label>Responsável pela conferência</label><input name="responsavel" type="text" placeholder="Nome do analista" /></div>
                  <div className="field full"><label>Observações</label><textarea name="observacoes" placeholder="Informe divergências, justificativas ou detalhes da conferência"></textarea></div>
                </div>

                <div className="actions">
                  <span className="muted">Os registros são salvos localmente neste navegador.</span>
                  <div className="actions-right">
                    <button type="reset" className="btn secondary">Limpar</button>
                    <button type="submit" className="btn primary">Salvar auditoria</button>
                  </div>
                </div>
                {msg.show && <div className={`msg ${msg.tipo === 'ok' ? 'ok' : 'err'} show`}>{msg.texto}</div>}
              </form>
            </section>
            
            <section className="card">
              <h2>Resumo do processo</h2>
              <div className="rules">
                <div className="rule"><strong>Periodicidade</strong>A auditoria deve ser realizada a cada 15 dias.</div>
                <div className="rule"><strong>Amostragem</strong>Sortear uma ATM/frete realizado pela transportadora.</div>
                <div className="rule"><strong>Documento</strong>Solicitar o documento oficial do seguro ou averbação da ATM.</div>
                <div className="rule"><strong>Registro</strong>Guardar o resultado e a evidência da conferência.</div>
              </div>
            </section>
          </section>
        )}

        {activeTab === 'painel' && (
          <section className="tab active">
            <div className="kpis">
              <div className="kpi"><small>Total de auditorias</small><strong>{total}</strong></div>
              <div className="kpi"><small>Conformes</small><strong>{ok}</strong></div>
              <div className="kpi"><small>Pendentes</small><strong>{pend}</strong></div>
              <div className="kpi"><small>Não conformes</small><strong>{nao}</strong></div>
              <div className="kpi"><small>Taxa de conformidade</small><strong>{rate}%</strong></div>
            </div>

            <section className="card">
              <h2>Filtros do dashboard</h2>
              <div className="filters">
                <div className="field">
                  <label>Transportadora</label>
                  <select value={fTransportadora} onChange={e => setFTransportadora(e.target.value)}>
                    <option value="">Todas</option>
                    {transportadorasUnicas.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Resultado</label>
                  <select value={fResultado} onChange={e => setFResultado(e.target.value)}>
                    <option value="">Todos</option>
                    <option value="Conforme">Conforme</option>
                    <option value="Pendente">Pendente</option>
                    <option value="Não conforme">Não conforme</option>
                  </select>
                </div>
                <div className="field"><label>Período a partir de</label><input type="date" value={fPeriodo} onChange={e => setFPeriodo(e.target.value)} /></div>
                <button className="btn secondary" onClick={() => { setFTransportadora(''); setFResultado(''); setFPeriodo(''); }}>Limpar filtros</button>
              </div>
              <div className="summary">{total} auditoria(s) no filtro atual.</div>
            </section>

            <div className="dashgrid">
              <section className="card">
                <h2>Distribuição por resultado</h2>
                <div>
                  {[
                    ['Conforme', ok, '#3c9b55'],
                    ['Pendente', pend, '#d49b22'],
                    ['Não conforme', nao, '#c94e4e']
                  ].map(([n, v, c]) => (
                    <div className="barrow" key={n}>
                      <span>{n}</span>
                      <div className="track"><div className="fill" style={{ width: total ? `${(v/total)*100}%` : '0%', background: c }}></div></div>
                      <span className="barvalue">{v} ({total ? Math.round((v/total)*100) : 0}%)</span>
                    </div>
                  ))}
                </div>
              </section>
              <section className="card">
                <h2>Indicador de conformidade</h2>
                <div style={{ textAlign: 'center', padding: '18px 8px' }}>
                  <div style={{ fontSize: '42px', fontWeight: 700, color: 'var(--dark)' }}>{rate}%</div>
                  <div className="muted">Percentual de auditorias conformes no filtro atual</div>
                  <div className="track" style={{ height: '22px', marginTop: '18px' }}>
                    <div className="fill" style={{ width: `${rate}%` }}></div>
                  </div>
                  <div className="summary">Meta gerencial sugerida: acompanhar a evolução e tratar todos os casos pendentes ou não conformes.</div>
                </div>
              </section>
            </div>

            <section className="card">
              <div className="section-title"><h2 style={{ margin: 0 }}>Auditorias filtradas</h2><button className="btn primary" onClick={() => exportarCSV(registrosFiltrados)}>Exportar CSV</button></div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Período</th><th>Transportadora</th><th>ATM</th><th>Tipo</th><th>Resultado</th><th>Solicitado</th><th>Recebido</th><th>Documento</th><th>Anexo</th></tr>
                  </thead>
                  <tbody>
                    {registrosFiltrados.length ? registrosFiltrados.map(x => (
                      <tr key={x.id}>
                        <td>{fmt(x.periodo)}</td><td>{x.transportadora}</td><td>{x.atm}</td><td>{x.tipoDocumento}</td><td>{renderTag(x.resultado)}</td><td>{fmt(x.dataSolicitacao)}</td><td>{fmt(x.dataRecebimento)}</td><td>{x.referencia || x.documentoLink || '-'}</td>
                        <td>{x.anexoData ? <button className="btn secondary" onClick={() => abrirAnexo(x.id)}>Abrir anexo</button> : '-'}</td>
                      </tr>
                    )) : <tr><td colSpan="9" className="empty">Nenhuma auditoria encontrada.</td></tr>}
                  </tbody>
                </table>
              </div>
            </section>
          </section>
        )}

        {activeTab === 'historico' && (
          <section className="tab active">
            <section className="card">
              <div className="section-title">
                <h2 style={{ margin: 0 }}>Histórico de auditorias</h2>
                <div className="actions-right">
                  <button className="btn secondary" onClick={() => exportarCSV(registros)}>Exportar CSV</button>
                  <button className="btn danger" onClick={apagarTudo}>Apagar histórico</button>
                </div>
              </div>
              <p className="muted">Use esta aba para consultar todos os registros salvos, abrir o documento anexado e remover um registro individual quando necessário.</p>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Período</th><th>Transportadora</th><th>ATM</th><th>Valor carga</th><th>Seguro</th><th>Resultado</th><th>Observação</th><th>Anexo</th><th>Ações</th></tr>
                  </thead>
                  <tbody>
                    {registros.length ? [...registros].sort((a,b) => b.periodo.localeCompare(a.periodo)).map(x => (
                      <tr key={x.id}>
                        <td>{fmt(x.periodo)}</td><td>{x.transportadora}</td><td>{x.atm}</td><td>{money(x.valorCarga)}</td><td>{money(x.valorSeguro)}</td><td>{renderTag(x.resultado)}</td>
                        <td title={x.observacoes}>{(x.observacoes || '-').slice(0, 55)}</td>
                        <td>{x.anexoData ? <button className="btn secondary" onClick={() => abrirAnexo(x.id)}>Abrir</button> : '-'}</td>
                        <td><button className="btn danger" onClick={() => removeOne(x.id)}>Excluir</button></td>
                      </tr>
                    )) : <tr><td colSpan="9" className="empty">Nenhum registro salvo.</td></tr>}
                  </tbody>
                </table>
              </div>
            </section>
          </section>
        )}

        {activeTab === 'regras' && (
          <section className="tab active">
            <section className="card">
              <h2>Regra resumida para apresentação</h2>
              <ol className="info-list">
                <li>A cada 15 dias, a equipe seleciona aleatoriamente um frete realizado por uma transportadora dedicada.</li>
                <li>A operação selecionada é identificada pela ATM e o documento oficial do seguro/averbação é solicitado à transportadora.</li>
                <li>Quando o documento é recebido, a equipe confere se a ATM, o valor e a cobrança do seguro estão compatíveis com a operação.</li>
                <li>O resultado da conferência é classificado como <strong>Conforme</strong>, <strong>Pendente</strong> ou <strong>Não conforme</strong>.</li>
                <li>O histórico permite demonstrar a rastreabilidade da auditoria, a evidência solicitada e a tratativa de cada desvio.</li>
              </ol>
              <h3 style={{ marginTop: '22px' }}>Indicadores sugeridos</h3>
              <div className="formula">Taxa de conformidade = Auditorias conformes ÷ Total de auditorias realizadas × 100</div>
              <div className="formula" style={{ marginTop: '10px' }}>Pendência = documento ainda não recebido ou registro aguardando tratativa</div>
              <div className="formula" style={{ marginTop: '10px' }}>Não conformidade = documento recebido com divergência, ausência de evidência ou cobrança incompatível</div>
              <p className="footer">Este controle utiliza LocalStorage. Para uso multiusuário, anexos reais e trilha de auditoria corporativa, a próxima evolução recomendada é conectar a uma base de dados e armazenamento de documentos.</p>
            </section>
          </section>
        )}
      </main>
    </div>
  );
}
