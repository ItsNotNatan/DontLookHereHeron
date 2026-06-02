import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import './EditorTransportadoras.css';
import { useAlert } from '../../componentes/AlertContext/AlertContext';

const Save = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>;
const Trash = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2-2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>;
const SearchIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>;
const Plus = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
const BuildingIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><path d="M9 22v-4h6v4"></path><path d="M8 6h.01"></path><path d="M16 6h.01"></path><path d="M12 6h.01"></path><path d="M12 10h.01"></path><path d="M12 14h.01"></path><path d="M16 10h.01"></path><path d="M16 14h.01"></path><path d="M8 10h.01"></path><path d="M8 14h.01"></path></svg>;

export default function EditorTransportadoras() {
  const { showAlert, showConfirm } = useAlert();

  const [transportadoras, setTransportadoras] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [selecionado, setSelecionado] = useState(null);
  const [mostrarForm, setMostrarForm] = useState(false);

  const [termoBusca, setTermoBusca] = useState('');
  const [formData, setFormData] = useState({ nome: '' });
  const [itensSelecionados, setItensSelecionados] = useState([]);

  useEffect(() => {
    fetchTransportadoras();
  }, []);

  const fetchTransportadoras = async () => {
    setCarregando(true);
    try {
      const response = await api.get('/admin/transportadoras');
      setTransportadoras(response.data);
    } catch (error) {
      console.error("Erro ao carregar transportadoras:", error);
      showAlert("Erro", "Não foi possível carregar a lista de transportadoras.", "error");
    } finally {
      setCarregando(false);
    }
  };

  const transportadorasFiltradas = transportadoras.filter(t => {
    const termo = termoBusca.toLowerCase();
    const nome = (t.nome || '').toLowerCase();
    return nome.includes(termo);
  });

  const handleSelect = (t) => {
    setSelecionado(t);
    setFormData({ nome: t.nome || '' });
    setMostrarForm(true); 
  };

  const handleNovo = () => {
    setSelecionado(null);
    setFormData({ nome: '' });
    setMostrarForm(true); 
  };

  const handleCancelar = () => {
    setMostrarForm(false);
    setSelecionado(null);
  };

  const handleSalvar = async (e) => {
    e.preventDefault();
    try {
      const payload = { nome: formData.nome };

      if (selecionado) {
        await api.put(`/admin/transportadoras/${selecionado.id}`, payload);
        showAlert("Sucesso!", "Transportadora atualizada com sucesso!", "success");
      } else {
        await api.post('/admin/transportadoras', payload);
        showAlert("Sucesso!", "Nova transportadora cadastrada!", "success");
      }

      fetchTransportadoras();
      setMostrarForm(false);
      setSelecionado(null);
    } catch (error) {
      console.error("Erro ao salvar:", error);
      showAlert("Erro", "Ocorreu um erro ao tentar salvar os dados.", "error");
    }
  };

  const handleExcluir = async (id) => {
    const confirmado = await showConfirm(
      "Excluir Transportadora",
      "Tem certeza que deseja excluir esta transportadora?",
      "error",
      "Sim, Excluir"
    );

    if (!confirmado) return;

    try {
      await api.delete(`/admin/transportadoras/${id}`);
      fetchTransportadoras();
      if (selecionado && selecionado.id === id) handleCancelar(); 
      setItensSelecionados(prev => prev.filter(itemId => itemId !== id));
      showAlert("Excluído!", "Transportadora removida com sucesso.", "success");
    } catch (error) {
      console.error("Erro ao excluir:", error);
      showAlert("Erro", "Não foi possível excluir a transportadora (pode estar em uso).", "error");
    }
  };

  const handleToggleCheck = (e, id) => {
    e.stopPropagation();
    setItensSelecionados(prev =>
      prev.includes(id) ? prev.filter(itemId => itemId !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const todosIds = transportadorasFiltradas.map(t => t.id);
      setItensSelecionados(todosIds);
    } else {
      setItensSelecionados([]);
    }
  };

  const handleExcluirSelecionados = async () => {
    const confirmado = await showConfirm(
      "Excluir em Lote",
      `Tem certeza que deseja excluir as ${itensSelecionados.length} transportadoras selecionadas?`,
      "error",
      "Excluir Todas"
    );

    if (!confirmado) return;

    setCarregando(true);
    try {
      await Promise.all(itensSelecionados.map(id => api.delete(`/admin/transportadoras/${id}`)));
      setItensSelecionados([]);
      if (selecionado && itensSelecionados.includes(selecionado.id)) handleCancelar();
      fetchTransportadoras();
      showAlert("Sucesso!", "Transportadoras excluídas com sucesso!", "success");
    } catch (error) {
      console.error("Erro ao excluir em lote:", error);
      showAlert("Erro parcial", "Ocorreu um erro ao tentar excluir algumas transportadoras.", "error");
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="editor-page fade-in">
      <div className="editor-layout-grid">

        <aside className="list-panel">
          <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3>Transportadoras</h3>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{transportadoras.length} registros ativos</span>
            </div>
            <button onClick={handleNovo} style={{ background: '#2563eb', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
              <Plus /> Adicionar
            </button>
          </div>

          <div style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', gap: '0.5rem', backgroundColor: '#f8fafc' }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <div style={{ position: 'absolute', left: '0.75rem', color: '#9ca3af' }}><SearchIcon /></div>
              <input
                type="text"
                placeholder="Buscar transportadora..."
                value={termoBusca}
                onChange={(e) => setTermoBusca(e.target.value)}
                style={{ width: '100%', padding: '10px 10px 10px 35px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem', color: '#1f2937', backgroundColor: '#ffffff' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
              {transportadorasFiltradas.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#4b5563' }}>
                  <input
                    type="checkbox"
                    checked={itensSelecionados.length === transportadorasFiltradas.length && transportadorasFiltradas.length > 0}
                    onChange={handleSelectAll}
                    style={{ cursor: 'pointer', width: '16px', height: '16px', margin: 0 }}
                  />
                  <label style={{ margin: 0, fontWeight: 600 }}>Selecionar todos</label>
                </div>
              )}

              {itensSelecionados.length > 0 && (
                <button
                  onClick={handleExcluirSelecionados}
                  className="fade-in"
                  style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5', padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Trash /> Excluir ({itensSelecionados.length})
                </button>
              )}
            </div>
          </div>

          <div className="list-scroll">
            {carregando ? <p className="msg-status">Carregando...</p> :
              transportadoras.length === 0 ? <p className="msg-status">Nenhuma transportadora cadastrada.</p> :
                transportadorasFiltradas.length === 0 ? <p className="msg-status">Nenhuma transportadora encontrada.</p> :
                  transportadorasFiltradas.map(t => (
                    <div
                      key={t.id}
                      className={`card-item ${selecionado?.id === t.id ? 'active' : ''}`}
                      style={{ backgroundColor: itensSelecionados.includes(t.id) ? '#f0fdf4' : '#ffffff' }}
                      onClick={() => handleSelect(t)}
                    >
                      <div style={{ marginRight: '0.75rem', display: 'flex', alignItems: 'center' }}>
                        <input
                          type="checkbox"
                          checked={itensSelecionados.includes(t.id)}
                          onChange={(e) => handleToggleCheck(e, t.id)}
                          onClick={(e) => e.stopPropagation()} 
                          style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                        />
                      </div>

                      <div className="card-info" style={{ flexGrow: 1 }}>
                        <strong style={{ display: 'block', fontSize: '0.9rem', color: '#111827', lineHeight: 1.4, fontWeight: 600 }}>
                          {t.nome || 'Transportadora sem nome'}
                        </strong>
                      </div>

                      <button type="button" className="btn-del-small" onClick={(e) => { e.stopPropagation(); handleExcluir(t.id); }}>
                        <Trash />
                      </button>
                    </div>
                  ))
            }
          </div>
        </aside>

        {/* ─── PAINEL DIREITO ─── */}
        <main className="form-panel">
          
          {!mostrarForm ? (
            <div className="empty-state-panel fade-in" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', color: '#64748b', textAlign: 'center', padding: '2rem' }}>
              <BuildingIcon />
              <h3 style={{ margin: '15px 0 10px', color: '#334155', fontSize: '1.25rem', fontWeight: 700 }}>Nenhuma transportadora selecionada</h3>
              <p style={{ maxWidth: '400px', fontSize: '0.95rem', lineHeight: 1.5 }}>Selecione uma transportadora na lista à esquerda para editar, ou clique no botão abaixo para cadastrar uma nova.</p>
              <button onClick={handleNovo} style={{ marginTop: '1rem', background: '#2563eb', color: 'white', border: 'none', padding: '12px 25px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Plus /> Nova Transportadora
              </button>
            </div>
          ) : (
            <div className="fade-in form-container-wrapper" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div className="panel-header" style={{ padding: '20px', background: '#ffffff', borderBottom: '1px solid #e5e7eb' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#1e293b', fontWeight: 800 }}>
                    {selecionado ? `Editando Transportadora` : 'Cadastrar Nova Transportadora'}
                  </h3>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    {selecionado ? `ID: ${selecionado.id.substring(0, 8).toUpperCase()}` : 'Insira os dados da parceira logística'}
                  </span>
                </div>
              </div>

              <form onSubmit={handleSalvar} className="form-content" style={{ padding: '30px', overflowY: 'auto', flex: 1 }}>
                <div className="form-group-p" style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#475569', marginBottom: '8px', textTransform: 'uppercase' }}>
                    Nome da Transportadora *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nome}
                    onChange={e => setFormData({ nome: e.target.value })}
                    placeholder="Ex: Expresso M2000 LTDA"
                    style={{ width: '100%', padding: '12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.95rem', outline: 'none', color: '#1f2937' }}
                  />
                </div>

                <div className="form-actions-p" style={{ display: 'flex', justifyContent: 'flex-end', gap: '15px', borderTop: '1px solid #e5e7eb', paddingTop: '25px', margin: '30px 0 0 0' }}>
                  <button type="button" className="btn-cancel" onClick={handleCancelar} style={{ background: 'white', border: '1px solid #cbd5e1', color: '#4b5563', padding: '12px 25px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn-save-primary" style={{ background: '#2563eb', color: 'white', border: 'none', padding: '12px 25px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Save /> {selecionado ? 'Salvar Alterações' : 'Confirmar Registro'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </main>

      </div>
    </div>
  );
}