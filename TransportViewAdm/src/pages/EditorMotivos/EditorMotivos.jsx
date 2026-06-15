// src/pages/EditorMotivos/EditorMotivos.jsx
import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import './EditorMotivos.css';

// 🟢 1. IMPORTAÇÃO DO CONTEXTO DE ALERTAS E DO SOCKET
import { useAlert } from '../../componentes/AlertContext/AlertContext';
import { io } from 'socket.io-client';

// 🟢 2. CONECTA AO BACK-END
const socket = io('http://localhost:3001');

// --- Ícones ---
const Save = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>;
const Trash = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2-2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>;
const SearchIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>;
const Plus = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
const TagIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>;

export default function EditorMotivos() {
  const { showAlert, showConfirm } = useAlert();

  const [motivos, setMotivos] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [selecionado, setSelecionado] = useState(null);
  const [mostrarForm, setMostrarForm] = useState(false);

  const [termoBusca, setTermoBusca] = useState('');
  const [itensSelecionados, setItensSelecionados] = useState([]);
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    cor: '#ef4444' 
  });

  useEffect(() => {
    fetchMotivos();

    // 🟢 3. ESCUTA O AVISO DO BACK-END E ATUALIZA A TELA
    socket.on('motivos_atualizados', () => {
        console.log('🔄 Motivos alterados no banco. Recarregando lista...');
        fetchMotivos();
    });

    // 🟢 4. DESLIGA O AVISO AO SAIR DA TELA
    return () => {
        socket.off('motivos_atualizados');
    };
  }, []); // <-- ⚠️ Apenas UM useEffect lidando com motivos

  const fetchMotivos = async () => {
    setCarregando(motivos.length === 0);
    try {
      const response = await api.get('/admin/motivos'); 
      setMotivos(response.data);
    } catch (error) {
      console.error("Erro ao carregar motivos:", error);
      showAlert("Erro", "Não foi possível buscar os motivos operacionais.", "error");
    } finally {
      setCarregando(false);
    }
  };

  const handleSelect = (m) => {
    setSelecionado(m);
    setFormData({
      nome: m.nome || '',
      descricao: m.descricao || '',
      cor: m.cor || '#ef4444'
    });
    setMostrarForm(true); 
  };

  const handleNovo = () => {
    setSelecionado(null);
    setFormData({ nome: '', descricao: '', cor: '#ef4444' });
    setMostrarForm(true); 
  };

  const handleCancelar = () => {
    setMostrarForm(false);
    setSelecionado(null);
  };

  const handleSalvar = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        nome: formData.nome,
        descricao: formData.descricao,
        cor: formData.cor
      };

      if (selecionado) {
        await api.put(`/admin/motivos/${selecionado.id}`, payload);
        showAlert("Sucesso!", "Motivo operacional atualizado!", "success");
      } else {
        await api.post('/admin/motivos', payload);
        showAlert("Sucesso!", "Novo motivo registrado com sucesso.", "success");
      }

      setMostrarForm(false); 
      setSelecionado(null);
    } catch (error) {
      console.error("Erro ao salvar:", error);
      showAlert("Erro", "Falha ao tentar salvar o motivo.", "error");
    }
  };

  const handleExcluir = async (id) => {
    const confirmado = await showConfirm(
      "Excluir Motivo",
      "Tem certeza que deseja excluir esta divergência? Ela sairá das opções de seleção.",
      "error",
      "Sim, Excluir"
    );

    if (!confirmado) return;

    try {
      await api.delete(`/admin/motivos/${id}`);
      if (selecionado && selecionado.id === id) handleCancelar();
      setItensSelecionados(prev => prev.filter(itemId => itemId !== id));
      showAlert("Removido!", "O motivo foi excluído.", "success");
    } catch (error) {
      console.error("Erro ao excluir:", error);
      showAlert("Erro", "Ocorreu um erro ao excluir o motivo.", "error");
    }
  };

  const handleToggleCheck = (e, id) => {
    e.stopPropagation();
    setItensSelecionados(prev => prev.includes(id) ? prev.filter(itemId => itemId !== id) : [...prev, id]);
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setItensSelecionados(motivosFiltrados.map(m => m.id));
    } else {
      setItensSelecionados([]);
    }
  };

  const handleExcluirSelecionados = async () => {
    const confirmado = await showConfirm(
      "Excluir em Lote",
      `Deseja realmente deletar estes ${itensSelecionados.length} motivos do sistema?`,
      "error",
      "Deletar Todos"
    );

    if (!confirmado) return;

    setCarregando(true);
    try {
      await Promise.all(itensSelecionados.map(id => api.delete(`/admin/motivos/${id}`)));
      setItensSelecionados([]);
      if (selecionado && itensSelecionados.includes(selecionado.id)) handleCancelar(); 
      showAlert("Concluído!", "Motivos apagados com sucesso.", "success");
    } catch (error) {
      console.error("Erro ao excluir em lote:", error);
      showAlert("Erro parcial", "Não foi possível remover alguns dos motivos selecionados.", "error");
    } finally {
      setCarregando(false);
    }
  };

  const motivosFiltrados = motivos.filter(m => {
    const termo = termoBusca.toLowerCase();
    return (m.nome || '').toLowerCase().includes(termo) || (m.descricao || '').toLowerCase().includes(termo);
  });

  return (
    <div className="editor-page fade-in">
      <div className="editor-layout-grid">

        {/* ─── LISTA DE MOTIVOS ─── */}
        <aside className="list-panel">
          <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3>Motivos (Divergências)</h3>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{motivos.length} motivos cadastrados</span>
            </div>
            
            <button onClick={handleNovo} style={{ background: '#2563eb', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
              <Plus /> Novo Motivo
            </button>
          </div>

          <div style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', gap: '0.5rem', backgroundColor: '#f8fafc' }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <div style={{ position: 'absolute', left: '0.75rem', color: '#9ca3af' }}><SearchIcon /></div>
              <input 
                type="text" 
                placeholder="Buscar por nome ou descrição..." 
                value={termoBusca} 
                onChange={(e) => setTermoBusca(e.target.value)} 
                style={{ width: '100%', padding: '10px 10px 10px 35px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem', color: '#1f2937', backgroundColor: '#ffffff' }} 
              />
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
              {motivosFiltrados.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#4b5563' }}>
                  <input type="checkbox" checked={itensSelecionados.length === motivosFiltrados.length && motivosFiltrados.length > 0} onChange={handleSelectAll} style={{ cursor: 'pointer', width: '16px', height: '16px', margin: 0 }} />
                  <label style={{ margin: 0, fontWeight: 600 }}>Selecionar todos</label>
                </div>
              )}

              {itensSelecionados.length > 0 && (
                <button onClick={handleExcluirSelecionados} className="fade-in" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5', padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Trash /> Excluir ({itensSelecionados.length})
                </button>
              )}
            </div>
          </div>

          <div className="list-scroll" style={{ backgroundColor: '#f8fafc' }}>
            {carregando && motivos.length === 0 ? <p className="msg-status">Carregando...</p> :
              motivos.length === 0 ? <p className="msg-status">Nenhum motivo cadastrado.</p> :
              motivosFiltrados.length === 0 ? <p className="msg-status">Nenhum motivo encontrado.</p> :
              motivosFiltrados.map(m => (
                <div 
                  key={m.id} 
                  className={`card-item ${selecionado?.id === m.id ? 'active' : ''}`} 
                  style={{ 
                    backgroundColor: itensSelecionados.includes(m.id) ? '#f0fdf4' : '#ffffff',
                    borderLeft: `5px solid ${m.cor || '#ef4444'}`
                  }} 
                  onClick={() => handleSelect(m)}
                >
                  <div style={{ marginRight: '0.75rem', display: 'flex', alignItems: 'center' }}>
                    <input type="checkbox" checked={itensSelecionados.includes(m.id)} onChange={(e) => handleToggleCheck(e, m.id)} onClick={(e) => e.stopPropagation()} style={{ cursor: 'pointer', transform: 'scale(1.1)' }} />
                  </div>
                  
                  <div className="card-info" style={{ flexGrow: 1 }}>
                    <strong style={{ display: 'block', fontSize: '0.9rem', color: '#111827', lineHeight: 1.4, fontWeight: 600 }}>{m.nome || 'Sem Nome'}</strong>
                    <span style={{ display: '-webkit-box', WebkitLineClamp: '2', WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {m.descricao || 'Sem descrição'}
                    </span>
                  </div>
                  <button type="button" className="btn-del-small" onClick={(e) => { e.stopPropagation(); handleExcluir(m.id); }}><Trash /></button>
                </div>
              ))
            }
          </div>
        </aside>

        {/* ─── PAINEL DIREITO (FORMULÁRIO OU EMPTY STATE) ─── */}
        <main className="form-panel">
          {!mostrarForm ? (
            <div className="fade-in" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', color: '#64748b', textAlign: 'center', padding: '2rem' }}>
              <TagIcon />
              <h3 style={{ margin: '15px 0 10px', color: '#334155', fontSize: '1.25rem', fontWeight: 700 }}>Nenhum motivo selecionado</h3>
              <p style={{ maxWidth: '400px', fontSize: '0.95rem', lineHeight: 1.5 }}>Selecione um motivo na lista à esquerda para editar as configurações, ou clique no botão abaixo para criar um novo registro.</p>
              <button onClick={handleNovo} style={{ marginTop: '1rem', background: '#2563eb', color: 'white', border: 'none', padding: '12px 25px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Plus /> Cadastrar Novo Motivo
              </button>
            </div>
          ) : (
            <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div className="panel-header" style={{ padding: '20px', background: '#ffffff', borderBottom: '1px solid #e5e7eb' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#1e293b', fontWeight: 800 }}>{selecionado ? `Editando Motivo` : 'Cadastrar Novo Motivo'}</h3>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Configure as opções visuais de divergência</span>
                </div>
              </div>

              <form onSubmit={handleSalvar} className="form-content" style={{ padding: '30px', overflowY: 'auto', flex: 1 }}>
                <div className="form-group-p" style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#475569', marginBottom: '8px', textTransform: 'uppercase' }}>Nome do Motivo</label>
                  <input 
                    type="text" 
                    required 
                    value={formData.nome} 
                    onChange={e => setFormData({ ...formData, nome: e.target.value })} 
                    placeholder="Ex: Mudança de Modal" 
                    style={{ width: '100%', padding: '12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.95rem', outline: 'none', color: '#1f2937' }}
                  />
                </div>

                <div className="form-group-p" style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#475569', marginBottom: '8px', textTransform: 'uppercase' }}>Cor de Identificação</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <input 
                      type="color" 
                      value={formData.cor} 
                      onChange={e => setFormData({ ...formData, cor: e.target.value })} 
                      style={{ height: '42px', width: '80px', padding: '2px', cursor: 'pointer', border: '1px solid #cbd5e1', borderRadius: '4px' }} 
                    />
                    <span style={{ color: '#64748b', fontSize: '0.9rem', fontStyle: 'italic' }}>Esta cor aparecerá na lateral do cartão.</span>
                  </div>
                </div>

                <div className="form-group-p" style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#475569', marginBottom: '8px', textTransform: 'uppercase' }}>Descrição Detalhada</label>
                  <textarea 
                    required 
                    value={formData.descricao} 
                    onChange={e => setFormData({ ...formData, descricao: e.target.value })} 
                    placeholder="Ex: Utilizado quando o transporte muda de Rodoviário para Aéreo de última hora..." 
                    style={{ width: '100%', padding: '12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.95rem', outline: 'none', color: '#1f2937', minHeight: '100px', resize: 'vertical', fontFamily: 'inherit' }}
                  />
                </div>

                <div className="form-actions-p" style={{ display: 'flex', justifyContent: 'flex-end', gap: '15px', borderTop: '1px solid #e5e7eb', paddingTop: '25px', marginTop: '30px' }}>
                  <button type="button" className="btn-cancel" onClick={handleCancelar} style={{ background: 'white', border: '1px solid #cbd5e1', color: '#4b5563', padding: '12px 25px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn-save-primary" style={{ background: '#2563eb', color: 'white', border: 'none', padding: '12px 25px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Save /> {selecionado ? 'Salvar Alterações' : 'Criar Cadastro'}
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