import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import './EditorTransportadoras.css';
import { useAlert } from '../../componentes/AlertContext/AlertContext';
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001');

// Ícones
const Save = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>;
const Trash = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2-2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>;
const SearchIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>;
const Plus = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
const TruckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><path d="M9 22v-4h6v4"></path></svg>;

export default function EditorTransportadoras() {
  const { showAlert, showConfirm } = useAlert();
  const [transportadoras, setTransportadoras] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [selecionado, setSelecionado] = useState(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [termoBusca, setTermoBusca] = useState('');
  const [itensSelecionados, setItensSelecionados] = useState([]);
  const [formData, setFormData] = useState({ nome: '' });

  useEffect(() => {
    fetchTransportadoras();
    socket.on('transportadoras_atualizadas', fetchTransportadoras);
    return () => socket.off('transportadoras_atualizadas');
  }, []);

  const fetchTransportadoras = async () => {
    setCarregando(transportadoras.length === 0);
    try {
      const response = await api.get('/admin/transportadoras'); 
      setTransportadoras(response.data);
    } catch (error) {
      showAlert("Erro", "Não foi possível buscar as transportadoras.", "error");
    } finally {
      setCarregando(false);
    }
  };

  const transportadorasFiltradas = transportadoras.filter(t => (t.nome || '').toLowerCase().includes(termoBusca.toLowerCase()));

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
      if (selecionado) {
        await api.put(`/admin/transportadoras/${selecionado.id}`, formData);
        showAlert("Sucesso!", "Transportadora atualizada!", "success");
      } else {
        await api.post('/admin/transportadoras', formData);
        showAlert("Sucesso!", "Nova transportadora registrada.", "success");
      }
      setMostrarForm(false); 
      setSelecionado(null);
    } catch (error) {
      showAlert("Erro", "Falha ao tentar salvar.", "error");
    }
  };

  const handleExcluir = async (id) => {
    const confirmado = await showConfirm("Excluir", "Tem certeza que deseja inativar?", "error", "Sim");
    if (!confirmado) return;
    try {
      await api.delete(`/admin/transportadoras/${id}`);
      if (selecionado?.id === id) handleCancelar();
      setItensSelecionados(prev => prev.filter(itemId => itemId !== id));
      showAlert("Removido!", "Transportadora inativada.", "success");
    } catch (error) {
      showAlert("Erro", "Erro ao inativar.", "error");
    }
  };

  const handleToggleCheck = (e, id) => {
    e.stopPropagation();
    setItensSelecionados(prev => prev.includes(id) ? prev.filter(itemId => itemId !== id) : [...prev, id]);
  };

  const handleSelectAll = (e) => setItensSelecionados(e.target.checked ? transportadorasFiltradas.map(p => p.id) : []);

  return (
    <div className="editor-page fade-in">
      <div className="editor-layout-grid">
        <aside className="list-panel">
          <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3>Transportadoras</h3>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{transportadorasFiltradas.length} encontradas</span>
            </div>
            <button onClick={handleNovo} style={{ background: '#2563eb', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', display: 'flex', gap: '8px' }}>
              <Plus /> Nova
            </button>
          </div>
          <div style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb', backgroundColor: '#f8fafc' }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <div style={{ position: 'absolute', left: '0.75rem', color: '#9ca3af' }}><SearchIcon /></div>
              <input type="text" placeholder="Buscar..." value={termoBusca} onChange={(e) => setTermoBusca(e.target.value)} style={{ width: '100%', padding: '10px 10px 10px 35px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
            </div>
            {transportadorasFiltradas.length > 0 && (
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <input type="checkbox" checked={itensSelecionados.length === transportadorasFiltradas.length} onChange={handleSelectAll} />
                <label style={{ fontSize: '0.85rem' }}>Selecionar todas</label>
              </div>
            )}
          </div>
          <div className="list-scroll">
            {carregando && transportadoras.length === 0 ? <p className="msg-status">Carregando...</p> :
              transportadorasFiltradas.map(t => (
                <div key={t.id} className={`card-item ${selecionado?.id === t.id ? 'active' : ''}`} style={{ backgroundColor: itensSelecionados.includes(t.id) ? '#f0fdf4' : '#ffffff' }} onClick={() => handleSelect(t)}>
                  <input type="checkbox" checked={itensSelecionados.includes(t.id)} onChange={(e) => handleToggleCheck(e, t.id)} onClick={e => e.stopPropagation()} style={{ marginRight: '10px' }} />
                  <div className="card-info" style={{ flexGrow: 1 }}><strong style={{ color: '#1e293b' }}>{t.nome}</strong></div>
                  <button type="button" className="btn-del-small" onClick={(e) => { e.stopPropagation(); handleExcluir(t.id); }}><Trash /></button>
                </div>
            ))}
          </div>
        </aside>

        <main className="form-panel">
          {!mostrarForm ? (
            <div className="fade-in" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <TruckIcon />
              <h3 style={{ color: '#334155' }}>Nenhuma selecionada</h3>
            </div>
          ) : (
            <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div className="panel-header" style={{ padding: '20px', background: '#ffffff', borderBottom: '1px solid #e5e7eb' }}>
                <h3 style={{ margin: 0 }}>{selecionado ? `Editando Transportadora` : 'Cadastrar Nova'}</h3>
              </div>
              <form onSubmit={handleSalvar} className="form-content" style={{ padding: '30px', flex: 1 }}>
                <div className="form-group-p" style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#475569', marginBottom: '8px' }}>Nome da Transportadora</label>
                  <input type="text" required value={formData.nome} onChange={e => setFormData({ nome: e.target.value })} style={{ width: '100%', padding: '12px', border: '1px solid #cbd5e1', borderRadius: '8px' }} />
                </div>
                <div className="form-actions-p" style={{ display: 'flex', justifyContent: 'flex-end', gap: '15px', borderTop: '1px solid #e5e7eb', paddingTop: '25px', marginTop: '30px' }}>
                  <button type="button" onClick={handleCancelar} style={{ background: 'white', border: '1px solid #cbd5e1', padding: '12px 25px', borderRadius: '8px', cursor: 'pointer' }}>Cancelar</button>
                  <button type="submit" style={{ background: '#2563eb', color: 'white', border: 'none', padding: '12px 25px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}><Save /> Salvar</button>
                </div>
              </form>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}