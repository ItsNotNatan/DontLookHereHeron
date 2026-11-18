import React, { useState, useEffect } from 'react';
import './ControleSLA.css';

const KEY_REGISTROS = 'comau_sla_registros_v2';
const KEY_TRANSPORTADORAS = 'comau_sla_transportadoras_v2';

export default function ControleSLA() {
  const [activeTab, setActiveTab] = useState('registro');
  const [transportadoras, setTransportadoras] = useState([]);
  const [registros, setRegistros] = useState([]);
  
  // Estados do formulário de registro
  const [modalidade, setModalidade] = useState('Dedicado');
  const [indicadores, setIndicadores] = useState([]);
  const [mensagem, setMensagem] = useState({ texto: '', tipo: '' });
  const [novaTransportadora, setNovaTransportadora] = useState('');

  // Carrega dados do LocalStorage ao iniciar
  useEffect(() => {
    const trans = JSON.parse(localStorage.getItem(KEY_TRANSPORTADORAS) || '[]');
    const regs = JSON.parse(localStorage.getItem(KEY_REGISTROS) || '[]');
    setTransportadoras(trans);
    setRegistros(regs);
  }, []);

  // Salva no LocalStorage sempre que houver alteração
  useEffect(() => {
    localStorage.setItem(KEY_TRANSPORTADORAS, JSON.stringify(transportadoras));
    localStorage.setItem(KEY_REGISTROS, JSON.stringify(registros));
  }, [transportadoras, registros]);

  // Função para cadastrar transportadora
  const handleAddTransportadora = () => {
    const nome = novaTransportadora.trim();
    if (!nome) {
      setMensagem({ texto: 'Informe o nome da transportadora.', tipo: 'error' });
      return;
    }
    if (transportadoras.some(t => t.toLowerCase() === nome.toLowerCase())) {
      setMensagem({ texto: 'Transportadora já cadastrada.', tipo: 'error' });
      return;
    }
    setTransportadoras(prev => [...prev, nome].sort());
    setNovaTransportadora('');
    setMensagem({ texto: 'Transportadora cadastrada com sucesso.', tipo: 'success' });
  };

  // Função para remover transportadora
  const handleRemoveTransportadora = (nome) => {
    if (registros.some(r => r.transportadora === nome)) {
      alert('Não remova uma transportadora que já possui histórico de viagens.');
      return;
    }
    if (window.confirm(`Remover ${nome} do cadastro?`)) {
      setTransportadoras(prev => prev.filter(t => t !== nome));
    }
  };

  // Registro de nova ocorrência
  const handleRegistrar = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const dados = Object.fromEntries(formData.entries());
    
    if (indicadores.length === 0) {
      setMensagem({ texto: 'Marque pelo menos um indicador que teve ocorrência.', tipo: 'error' });
      return;
    }
    
    const desconto = dados.penalidade !== 'Não' ? Number(dados.frete) * 0.08 : 0;
    const novoRegistro = {
      ...dados,
      modalidade,
      indicadoresOcorrencia: indicadores,
      frete: Number(dados.frete),
      desconto,
      freteLiquido: Number(dados.frete) - desconto,
      dataRegistro: new Date().toISOString()
    };

    setRegistros(prev => [...prev, novoRegistro]);
    setMensagem({ texto: 'Ocorrência registrada com sucesso.', tipo: 'success' });
    e.target.reset();
    setIndicadores([]);
  };

  const handleIndicadorChange = (val) => {
    setIndicadores(prev => 
      prev.includes(val) ? prev.filter(i => i !== val) : [...prev, val]
    );
  };

  return (
    <div className="controle-sla-container">
      <header className="topbar">
        <div className="brand">
          <div className="brand-title">
            <h1>Controle de SLA</h1>
            <p>Fretes dedicados — registro operacional e avaliação de transportadoras</p>
          </div>
        </div>
      </header>

      <main className="app-content">
        <nav className="tabs">
          <button className={`tab-button ${activeTab === 'registro' ? 'active' : ''}`} onClick={() => setActiveTab('registro')}>Registro rápido</button>
          <button className={`tab-button ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>Dashboard</button>
          <button className={`tab-button ${activeTab === 'transportadoras' ? 'active' : ''}`} onClick={() => setActiveTab('transportadoras')}>Transportadoras</button>
        </nav>

        {/* ABA REGISTRO */}
        {activeTab === 'registro' && (
          <section className="tab active">
            <div className="notice"><strong>Preenchimento rápido:</strong> registre somente quando houver uma ocorrência não conforme.</div>
            <section className="card">
              <h2>Registrar não conformidade</h2>
              <form onSubmit={handleRegistrar}>
                <div className="basic-grid">
                  <div className="field">
                    <label>Modalidade</label>
                    <select value={modalidade} onChange={(e) => setModalidade(e.target.value)}>
                      <option value="Dedicado">Dedicado</option>
                      <option value="Fracionado">Fracionado</option>
                    </select>
                  </div>
                  <div className="field"><label>Data da ocorrência</label><input name="data" type="date" required /></div>
                  <div className="field">
                    <label>Transportadora</label>
                    <select name="transportadora" required>
                      <option value="">Selecione...</option>
                      {transportadoras.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="field"><label>Processo / NF</label><input name="processo" type="text" required /></div>
                  <div className="field"><label>Valor do frete (R$)</label><input name="frete" type="number" min="0" step="0.01" required /></div>
                </div>

                <div className="section-title"><h3>Marque somente os indicadores que tiveram ocorrência</h3></div>
                <div className="indicator-grid">
                  {['Coleta', 'Entrega', 'Resposta', 'Frota', 'Ocorrência'].map(ind => (
                    <label key={ind} className="indicator-card">
                      <input 
                        type="checkbox" 
                        checked={indicadores.includes(ind)}
                        onChange={() => handleIndicadorChange(ind)} 
                      />
                      <span><strong>{ind}</strong></span>
                    </label>
                  ))}
                </div>

                <div className="basic-grid occurrence-details" style={{marginTop: '20px'}}>
                  <div className="field"><label>Tipo de desvio</label><input name="evento" type="text" /></div>
                  <div className="field">
                    <label>Penalidade</label>
                    <select name="penalidade">
                      <option value="Não">Não aplicar</option>
                      <option value="No Show">No Show — 8%</option>
                      <option value="Atraso injustificado">Atraso injustificado — 8%</option>
                    </select>
                  </div>
                </div>
                <div className="field" style={{marginTop:'12px'}}>
                  <label>Motivo / observação</label>
                  <input name="observacao" type="text" />
                </div>

                <div className="actions">
                  <button type="submit" className="btn btn-primary">Registrar ocorrência</button>
                </div>
                {mensagem.texto && <div className={`message ${mensagem.tipo}`}>{mensagem.texto}</div>}
              </form>
            </section>
          </section>
        )}

        {/* ABA DASHBOARD */}
        {activeTab === 'dashboard' && (
          <section className="tab active">
            <section className="card">
              <h2>Dashboard Gerencial</h2>
              <p>Total de Ocorrências: {registros.length}</p>
              {/* Sugestão: Reutilizar os gráficos com Recharts que você já tem no projeto (AcompFinan.jsx) */}
            </section>
          </section>
        )}

        {/* ABA TRANSPORTADORAS */}
        {activeTab === 'transportadoras' && (
          <section className="tab active">
            <section className="card">
              <h2>Cadastro de transportadoras</h2>
              <div className="add-company">
                <div className="field">
                  <label>Nome da transportadora</label>
                  <input 
                    type="text" 
                    value={novaTransportadora}
                    onChange={(e) => setNovaTransportadora(e.target.value)}
                  />
                </div>
                <button className="btn btn-primary" type="button" onClick={handleAddTransportadora}>Adicionar</button>
              </div>
              {mensagem.texto && <div className={`message ${mensagem.tipo}`}>{mensagem.texto}</div>}
            </section>

            <section className="card">
              <h3>Transportadoras cadastradas</h3>
              <ul className="company-list">
                {transportadoras.map(t => (
                  <li key={t}>
                    <span>{t}</span>
                    <button className="btn btn-danger" onClick={() => handleRemoveTransportadora(t)}>Remover</button>
                  </li>
                ))}
              </ul>
            </section>
          </section>
        )}
      </main>
    </div>
  );
}
