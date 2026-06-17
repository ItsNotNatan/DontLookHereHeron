import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAlert } from '../../componentes/AlertContext/AlertContext';
import { io } from 'socket.io-client';

import './EditorProjetos.css';

const socket = io('http://localhost:3001');

// Ícones
const Save = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>;
const Trash = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2-2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>;
const SearchIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>;
const Plus = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
const FolderIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>;

export default function EditorProjetos() {
  const { showAlert, showConfirm } = useAlert();
  const [projetos, setProjetos] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [selecionado, setSelecionado] = useState(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [termoBusca, setTermoBusca] = useState('');
  const [itensSelecionados, setItensSelecionados] = useState([]);
  const [formData, setFormData] = useState({ descricao: '' });

  useEffect(() => {
    fetchProjetos();
    socket.on('projetos_atualizados', fetchProjetos);
    return () => socket.off('projetos_atualizados');
  }, []);

  const fetchProjetos = async () => {
    setCarregando(projetos.length === 0);
    try {
      const response = await api.get('/admin/projetos'); 
      setProjetos(response.data);
    } catch (error) {
      showAlert("Erro", "Não foi possível buscar os projetos.", "error");
    } finally {
      setCarregando(false);
    }
  };

  const projetosFiltrados = projetos.filter(p => (p.wbs || '').toLowerCase().includes(termoBusca.toLowerCase()));

  const handleSelect = (p) => {
    setSelecionado(p);
    setFormData({ descricao: p.wbs || '' });
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
      if (selecionado) {
        await api.put(`/admin/projetos/${selecionado.id}`, formData);
        showAlert("Sucesso!", "Projeto atualizado!", "success");
      } else {
        await api.post('/admin/projetos', formData);
        showAlert("Sucesso!", "Novo projeto registrado.", "success");
      }
      setMostrarForm(false); 
      setSelecionado(null);
    } catch (error) {
      showAlert("Erro", "Falha ao tentar salvar o projeto.", "error");
    }
  };

  const handleExcluir = async (id) => {
    const confirmado = await showConfirm("Excluir Projeto", "Tem certeza que deseja excluir?", "error", "Sim, Excluir");
    if (!confirmado) return;
    try {
      await api.delete(`/admin/projetos/${id}`);
      if (selecionado?.id === id) handleCancelar();
      setItensSelecionados(prev => prev.filter(itemId => itemId !== id));
      showAlert("Removido!", "O projeto foi excluído.", "success");
    } catch (error) {
      showAlert("Erro", "Este projeto já está atrelado a um pedido.", "error");
    }
  };

  const handleToggleCheck = (e, id) => {
    e.stopPropagation();
    setItensSelecionados(prev => prev.includes(id) ? prev.filter(itemId => itemId !== id) : [...prev, id]);
  };

  const handleSelectAll = (e) => setItensSelecionados(e.target.checked ? projetosFiltrados.map(p => p.id) : []);

  const handleExcluirSelecionados = async () => {
    const confirmado = await showConfirm("Excluir em Lote", `Deletar ${itensSelecionados.length} projetos?`, "error", "Deletar Todos");
    if (!confirmado) return;
    setCarregando(true);
    try {
      await Promise.all(itensSelecionados.map(id => api.delete(`/admin/projetos/${id}`)));
      setItensSelecionados([]);
      if (selecionado && itensSelecionados.includes(selecionado.id)) handleCancelar(); 
      showAlert("Concluído!", "Projetos apagados com sucesso.", "success");
    } catch (error) {
      showAlert("Erro parcial", "Alguns projetos não puderam ser excluídos.", "error");
    } finally {
      setCarregando(false);
      fetchProjetos();
    }
  };

  return (
    <div className="editor-page fade-in">
      <div className="editor-layout-grid">
        <aside className="list-panel">
          <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3>Projetos / WBS</h3>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{projetosFiltrados.length} encontrados</span>
            </div>
            <button onClick={handleNovo} style={{ background: '#2563eb', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
              <Plus /> Novo Projeto
            </button>
          </div>
          <div style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb', backgroundColor: '#f8fafc' }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <div style={{ position: 'absolute', left: '0.75rem', color: '#9ca3af' }}><SearchIcon /></div>
              <input type="text" placeholder="Buscar WBS..." value={termoBusca} onChange={(e) => setTermoBusca(e.target.value)} style={{ width: '100%', padding: '10px 10px 10px 35px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }} />
            </div>
            {projetosFiltrados.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                  <input type="checkbox" checked={itensSelecionados.length === projetosFiltrados.length} onChange={handleSelectAll} />
                  <label>Selecionar todos</label>
                </div>
                {itensSelecionados.length > 0 && (
                  <button onClick={handleExcluirSelecionados} style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5', padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer' }}><Trash /> Excluir ({itensSelecionados.length})</button>
                )}
              </div>
            )}
          </div>
          <div className="list-scroll">
            {carregando && projetos.length === 0 ? <p className="msg-status">Carregando...</p> :
              projetosFiltrados.map(p => (
                <div key={p.id} className={`card-item ${selecionado?.id === p.id ? 'active' : ''}`} style={{ backgroundColor: itensSelecionados.includes(p.id) ? '#f0fdf4' : '#ffffff' }} onClick={() => handleSelect(p)}>
                  <input type="checkbox" checked={itensSelecionados.includes(p.id)} onChange={(e) => handleToggleCheck(e, p.id)} onClick={e => e.stopPropagation()} style={{ marginRight: '10px' }} />
                  <div className="card-info" style={{ flexGrow: 1 }}><strong style={{ color: '#1e293b' }}>{p.wbs || 'Sem Nome'}</strong></div>
                  <button type="button" className="btn-del-small" onClick={(e) => { e.stopPropagation(); handleExcluir(p.id); }}><Trash /></button>
                </div>
            ))}
          </div>
        </aside>

        <main className="form-panel">
          {!mostrarForm ? (
            <div className="fade-in" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', color: '#64748b' }}>
              <FolderIcon />
              <h3 style={{ margin: '15px 0 10px', color: '#334155' }}>Nenhum projeto selecionado</h3>
            </div>
          ) : (
            <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div className="panel-header" style={{ padding: '20px', background: '#ffffff', borderBottom: '1px solid #e5e7eb' }}>
                <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#1e293b' }}>{selecionado ? `Editando Projeto` : 'Cadastrar Novo'}</h3>
              </div>
              <form onSubmit={handleSalvar} className="form-content" style={{ padding: '30px', flex: 1 }}>
                <div className="form-group-p" style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#475569', marginBottom: '8px' }}>Nome / Código WBS</label>
                  <input type="text" required value={formData.descricao} onChange={e => setFormData({ descricao: e.target.value })} style={{ width: '100%', padding: '12px', border: '1px solid #cbd5e1', borderRadius: '8px' }} />
                </div>
                <div className="form-actions-p" style={{ display: 'flex', justifyContent: 'flex-end', gap: '15px', borderTop: '1px solid #e5e7eb', paddingTop: '25px', marginTop: '30px' }}>
                  <button type="button" className="btn-cancel" onClick={handleCancelar} style={{ background: 'white', border: '1px solid #cbd5e1', padding: '12px 25px', borderRadius: '8px', cursor: 'pointer' }}>Cancelar</button>
                  <button type="submit" className="btn-save-primary" style={{ background: '#2563eb', color: 'white', border: 'none', padding: '12px 25px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}><Save /> Salvar</button>
                </div>
              </form>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}