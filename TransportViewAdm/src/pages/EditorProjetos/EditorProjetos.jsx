// src/pages/EditorProjetos/EditorProjetos.jsx
import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import './EditorProjetos.css';

// 🟢 1. IMPORTAÇÃO DO SEU CONTEXTO DE ALERTAS OFICIAL
import { useAlert } from '../../componentes/AlertContext/AlertContext';

// --- Ícones ---
const Save = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>;
const Trash = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2-2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>;
const SearchIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>;
const Plus = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
const ProjectIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/><path d="M8 10v4"/><path d="M12 10v2"/><path d="M16 10v6"/></svg>;

export default function EditorProjetos() {
  const { showAlert, showConfirm } = useAlert();

  const [projetos, setProjetos] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [selecionado, setSelecionado] = useState(null);
  const [mostrarForm, setMostrarForm] = useState(false);

  const [termoBusca, setTermoBusca] = useState('');
  const [formData, setFormData] = useState({ descricao: '' });
  const [itensSelecionados, setItensSelecionados] = useState([]);

  useEffect(() => {
    fetchProjetos();
  }, []);

  const fetchProjetos = async () => {
    setCarregando(true);
    try {
      const response = await api.get('/admin/projetos');
      setProjetos(response.data);
    } catch (error) {
      console.error("Erro ao carregar projetos:", error);
      showAlert("Erro", "Não foi possível carregar a lista de projetos.", "error");
    } finally {
      setCarregando(false);
    }
  };

  // 🟢 FILTRO SEGURO DE PROJETOS (Declarado antes de ser usado!)
  const projetosFiltrados = projetos.filter(p => {
    const termo = termoBusca.toLowerCase();
    const desc = (p.descricao || p.wbs || p.nome_projeto || '').toLowerCase();
    return desc.includes(termo);
  });

  const handleSelect = (p) => {
    setSelecionado(p);
    setFormData({
      descricao: p.descricao || p.wbs || p.nome_projeto || ''
    });
    setMostrarForm(true); 
  };

  const handleNovo = () => {
    setSelecionado(null);
    setFormData({ descricao: '' });
    setMostrarForm(true); 
  };

  const handleCancelar = () => {
    setMostrarForm(false);
    setSelecionado(null);
  };

  const handleSalvar = async (e) => {
    e.preventDefault();
    try {
      const payload = { descricao: formData.descricao };

      if (selecionado) {
        await api.put(`/admin/projetos/${selecionado.id}`, payload);
        showAlert("Sucesso!", "Projeto atualizado com sucesso!", "success");
      } else {
        await api.post('/admin/projetos', payload);
        showAlert("Sucesso!", "Novo projeto cadastrado!", "success");
      }

      fetchProjetos();
      setMostrarForm(false);
      setSelecionado(null);
    } catch (error) {
      console.error("Erro ao salvar:", error);
      showAlert("Erro", "Ocorreu um erro ao tentar salvar os dados do projeto.", "error");
    }
  };

  const handleExcluir = async (id) => {
    const confirmado = await showConfirm(
      "Excluir Projeto",
      "Tem certeza que deseja excluir este projeto? Os dados associados serão impactados.",
      "error",
      "Sim, Excluir"
    );

    if (!confirmado) return;

    try {
      await api.delete(`/admin/projetos/${id}`);
      fetchProjetos();
      if (selecionado && selecionado.id === id) handleCancelar(); 
      setItensSelecionados(prev => prev.filter(itemId => itemId !== id));
      showAlert("Excluído!", "Projeto removido com sucesso.", "success");
    } catch (error) {
      console.error("Erro ao excluir:", error);
      showAlert("Erro", "Não foi possível excluir o projeto selecionado.", "error");
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
      const todosIds = projetosFiltrados.map(p => p.id);
      setItensSelecionados(todosIds);
    } else {
      setItensSelecionados([]);
    }
  };

  const handleExcluirSelecionados = async () => {
    const confirmado = await showConfirm(
      "Excluir em Lote",
      `Tem certeza que deseja excluir os ${itensSelecionados.length} projeto(s) selecionado(s)?`,
      "error",
      "Excluir Todos"
    );

    if (!confirmado) return;

    setCarregando(true);
    try {
      await Promise.all(itensSelecionados.map(id => api.delete(`/admin/projetos/${id}`)));
      setItensSelecionados([]);
      if (selecionado && itensSelecionados.includes(selecionado.id)) handleCancelar();
      fetchProjetos();
      showAlert("Sucesso!", "Projetos excluídos com sucesso!", "success");
    } catch (error) {
      console.error("Erro ao excluir em lote:", error);
      showAlert("Erro parcial", "Ocorreu um erro ao tentar excluir alguns projetos.", "error");
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="editor-page fade-in">
      <div className="editor-layout-grid">

        {/* ─── LISTA DE PROJETOS ─── */}
        <aside className="list-panel">
          <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3>Gestão de Projetos</h3>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{projetos.length} registros ativos</span>
            </div>
            <button onClick={handleNovo} className="btn-new-project" style={{ background: '#2563eb', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
              <Plus /> Novo Projeto
            </button>
          </div>

          <div className="search-filter-box" style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', gap: '0.5rem', backgroundColor: '#f8fafc' }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <div style={{ position: 'absolute', left: '0.75rem', color: '#9ca3af' }}><SearchIcon /></div>
              <input
                type="text"
                placeholder="Buscar projeto..."
                value={termoBusca}
                onChange={(e) => setTermoBusca(e.target.value)}
                style={{ width: '100%', padding: '10px 10px 10px 35px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem', color: '#1f2937', backgroundColor: '#ffffff' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
              {projetosFiltrados.length > 0 && (
                <div className="select-all-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#4b5563' }}>
                  <input
                    type="checkbox"
                    checked={itensSelecionados.length === projetosFiltrados.length && projetosFiltrados.length > 0}
                    onChange={handleSelectAll}
                    style={{ cursor: 'pointer', width: '16px', height: '16px', margin: 0 }}
                  />
                  <label style={{ margin: 0, fontWeight: 600 }}>Selecionar todos</label>
                </div>
              )}

              {itensSelecionados.length > 0 && (
                <button
                  onClick={handleExcluirSelecionados}
                  className="btn-del-mass-project fade-in"
                  style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5', padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Trash /> Excluir ({itensSelecionados.length})
                </button>
              )}
            </div>
          </div>

          <div className="list-scroll">
            {carregando ? <p className="msg-status">Carregando...</p> :
              projetos.length === 0 ? <p className="msg-status">Nenhum projeto cadastrado.</p> :
                projetosFiltrados.length === 0 ? <p className="msg-status">Nenhum projeto encontrado.</p> :
                  projetosFiltrados.map(p => (
                    <div
                      key={p.id}
                      className={`card-item ${selecionado?.id === p.id ? 'active' : ''}`}
                      style={{ backgroundColor: itensSelecionados.includes(p.id) ? '#f0fdf4' : '#ffffff' }}
                      onClick={() => handleSelect(p)}
                    >
                      <div className="checkbox-item-wrapper" style={{ marginRight: '0.75rem', display: 'flex', alignItems: 'center' }}>
                        <input
                          type="checkbox"
                          checked={itensSelecionados.includes(p.id)}
                          onChange={(e) => handleToggleCheck(e, p.id)}
                          onClick={(e) => e.stopPropagation()} 
                          style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                        />
                      </div>

                      <div className="card-info" style={{ flexGrow: 1 }}>
                        <strong style={{ display: 'block', fontSize: '0.9rem', color: '#111827', lineHeight: 1.4, fontWeight: 600 }}>
                          {p.descricao || p.wbs || p.nome_projeto || 'Projeto sem descrição'}
                        </strong>
                      </div>

                      <button type="button" className="btn-del-small" onClick={(e) => { e.stopPropagation(); handleExcluir(p.id); }}>
                        <Trash />
                      </button>
                    </div>
                  ))
            }
          </div>
        </aside>

        {/* ─── PAINEL DIREITO (FORMULÁRIO OU EMPTY STATE) ─── */}
        <main className="form-panel">
          
          {!mostrarForm ? (
            /* 🟢 EMPTY STATE: Tela de descanso (Agora com chave de fechamento correta) */
            <div className="empty-state-panel fade-in" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', color: '#64748b', textAlign: 'center', padding: '2rem' }}>
              <ProjectIcon />
              <h3 style={{ margin: '15px 0 10px', color: '#334155', fontSize: '1.25rem', fontWeight: 700 }}>Nenhum projeto selecionado</h3>
              <p style={{ maxWidth: '400px', fontSize: '0.95rem', lineHeight: 1.5 }}>Selecione um projeto na lista à esquerda para editar, ou clique no botão abaixo para iniciar uma nova atribuição de WBS.</p>
              <button onClick={handleNovo} className="btn-save-primary" style={{ marginTop: '1rem', background: '#2563eb', color: 'white', border: 'none', padding: '12px 25px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Plus /> Cadastrar Novo Projeto
              </button>
            </div>
          ) : (
            /* 🟢 FORMULÁRIO */
            <div className="fade-in form-container-wrapper" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div className="panel-header" style={{ padding: '20px', background: '#ffffff', borderBottom: '1px solid #e5e7eb' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#1e293b', fontWeight: 800 }}>
                    {selecionado ? `Editando Projeto` : 'Cadastrar Novo Projeto'}
                  </h3>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    {selecionado ? `ID: ${selecionado.id.substring(0, 8).toUpperCase()}` : 'Insira as diretrizes de faturamento'}
                  </span>
                </div>
              </div>

              <form onSubmit={handleSalvar} className="form-content" style={{ padding: '30px', overflowY: 'auto', flex: 1 }}>
                <div className="form-group-p" style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#475569', marginBottom: '8px', textTransform: 'uppercase' }}>
                    Informações unificadas do projeto *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.descricao}
                    onChange={e => setFormData({ descricao: e.target.value })}
                    placeholder="Nome do Cliente - Cidade - Nome do Projeto - WBS"
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