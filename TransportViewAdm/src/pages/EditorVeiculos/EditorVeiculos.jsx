import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import './EditorVeiculos.css'; 
import { useAlert } from '../../componentes/AlertContext/AlertContext';
import { io } from 'socket.io-client';

const socket = io(`http://${window.location.hostname}:3001`);

// Ícones
const Save = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>;
const Trash = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2-2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>;
const SearchIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>;
const Plus = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
const TruckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>;

export default function EditorVeiculos() {
  const { showAlert, showConfirm } = useAlert();
  const [veiculos, setVeiculos] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [selecionado, setSelecionado] = useState(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [termoBusca, setTermoBusca] = useState('');
  const [formData, setFormData] = useState({ nome: '', comprimento: '', largura: '', altura: '', ativo: true });

  useEffect(() => {
    fetchVeiculos();
    socket.on('veiculos_atualizados', fetchVeiculos);
    return () => socket.off('veiculos_atualizados');
  }, []);

  const fetchVeiculos = async () => {
    setCarregando(veiculos.length === 0);
    try {
      const response = await api.get('/admin/veiculos'); 
      setVeiculos(response.data);
    } catch (error) {
      showAlert("Erro", "Não foi possível buscar veículos.", "error");
    } finally {
      setCarregando(false);
    }
  };

  const veiculosFiltrados = veiculos.filter(v => (v.nome || '').toLowerCase().includes(termoBusca.toLowerCase()));

  const handleSelect = (v) => {
    setSelecionado(v);
    setFormData({ nome: v.nome, comprimento: v.comprimento || '', largura: v.largura || '', altura: v.altura || '', ativo: v.ativo });
    setMostrarForm(true); 
  };

  const handleNovo = () => {
    setSelecionado(null);
    setFormData({ nome: '', comprimento: '', largura: '', altura: '', ativo: true });
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
        await api.put(`/admin/veiculos/${selecionado.id}`, formData);
        showAlert("Sucesso!", "Veículo atualizado!", "success");
      } else {
        await api.post('/admin/veiculos', formData);
        showAlert("Sucesso!", "Veículo criado.", "success");
      }
      setMostrarForm(false); 
    } catch (error) {
      showAlert("Erro", error.response?.data?.error || "Falha ao salvar.", "error");
    }
  };

  const handleExcluir = async (id) => {
    const confirmado = await showConfirm("Excluir", "Tem certeza que deseja excluir o veículo?", "error", "Excluir");
    if (!confirmado) return;
    try {
      await api.delete(`/admin/veiculos/${id}`);
      if (selecionado?.id === id) handleCancelar();
      showAlert("Removido!", "Veículo excluído.", "success");
    } catch (error) {
      showAlert("Erro", "Erro ao excluir veículo.", "error");
    }
  };

  return (
    <div className="editor-page fade-in">
      <div className="editor-layout-grid">
        <aside className="list-panel">
          <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3>Frota de Veículos</h3>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{veiculosFiltrados.length} encontrados</span>
            </div>
            <button onClick={handleNovo} style={{ background: '#2563eb', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', display: 'flex', gap: '8px' }}>
              <Plus /> Novo
            </button>
          </div>
          <div style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb', backgroundColor: '#f8fafc' }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <div style={{ position: 'absolute', left: '0.75rem', color: '#9ca3af' }}><SearchIcon /></div>
              <input type="text" placeholder="Buscar..." value={termoBusca} onChange={(e) => setTermoBusca(e.target.value)} style={{ width: '100%', padding: '10px 10px 10px 35px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
            </div>
          </div>
          <div className="list-scroll">
            {carregando && veiculos.length === 0 ? <p className="msg-status">Carregando...</p> :
              veiculosFiltrados.map(v => (
                <div key={v.id} className={`card-item ${selecionado?.id === v.id ? 'active' : ''}`} onClick={() => handleSelect(v)}>
                  <div className="card-info" style={{ flexGrow: 1 }}>
                      <strong style={{ color: '#1e293b' }}>{v.nome}</strong>
                      <span style={{ color: '#64748b', fontSize: '0.8rem' }}>{v.ativo ? '🟢 Ativo' : '🔴 Inativo'}</span>
                  </div>
                  <button type="button" className="btn-del-small" onClick={(e) => { e.stopPropagation(); handleExcluir(v.id); }}><Trash /></button>
                </div>
            ))}
          </div>
        </aside>

        <main className="form-panel">
          {!mostrarForm ? (
            <div className="fade-in" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <TruckIcon />
              <h3 style={{ color: '#334155' }}>Nenhum selecionado</h3>
            </div>
          ) : (
            <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div className="panel-header" style={{ padding: '20px', background: '#ffffff', borderBottom: '1px solid #e5e7eb' }}>
                <h3 style={{ margin: 0 }}>{selecionado ? `Editando Veículo` : 'Cadastrar Novo'}</h3>
              </div>
              <form onSubmit={handleSalvar} className="form-content" style={{ padding: '30px', flex: 1 }}>
                <div className="form-group-p" style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#475569', marginBottom: '8px' }}>Nome (Modelo)</label>
                  <input type="text" required value={formData.nome} onChange={e => setFormData({ ...formData, nome: e.target.value })} style={{ width: '100%', padding: '12px', border: '1px solid #cbd5e1', borderRadius: '8px' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                    <div className="form-group-p">
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#475569', marginBottom: '8px' }}>Comprimento (m)</label>
                        <input type="number" step="0.01" min="0" value={formData.comprimento} onChange={e => setFormData({ ...formData, comprimento: e.target.value })} style={{ width: '100%', padding: '12px', border: '1px solid #cbd5e1', borderRadius: '8px' }} />
                    </div>
                    <div className="form-group-p">
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#475569', marginBottom: '8px' }}>Largura (m)</label>
                        <input type="number" step="0.01" min="0" value={formData.largura} onChange={e => setFormData({ ...formData, largura: e.target.value })} style={{ width: '100%', padding: '12px', border: '1px solid #cbd5e1', borderRadius: '8px' }} />
                    </div>
                    <div className="form-group-p">
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#475569', marginBottom: '8px' }}>Altura (m)</label>
                        <input type="number" step="0.01" min="0" value={formData.altura} onChange={e => setFormData({ ...formData, altura: e.target.value })} style={{ width: '100%', padding: '12px', border: '1px solid #cbd5e1', borderRadius: '8px' }} />
                    </div>
                </div>
                <div className="form-group-p" style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#475569', marginBottom: '8px' }}>Ativo no Sistema</label>
                  <select value={formData.ativo} onChange={e => setFormData({ ...formData, ativo: e.target.value === 'true' })} style={{ width: '100%', padding: '12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '1rem', outline: 'none' }}>
                    <option value="true">Sim (Disponível para uso)</option>
                    <option value="false">Não (Inativo)</option>
                  </select>
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