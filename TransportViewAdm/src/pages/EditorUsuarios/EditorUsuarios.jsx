// src/pages/EditorUsuarios/EditorUsuarios.jsx
import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import './EditorUsuarios.css';

// 🟢 IMPORTAÇÃO DO CONTEXTO DE ALERTAS OFICIAL
import { useAlert } from '../../componentes/AlertContext/AlertContext';

// --- Ícones ---
const Save = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>;
const Trash = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2-2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>;
const SearchIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>;
const Plus = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
const UsersIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>;

export default function EditorUsuarios() {
  const { showAlert, showConfirm } = useAlert();

  const [usuarios, setUsuarios] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [selecionado, setSelecionado] = useState(null);

  // 🟢 Controla se o formulário está visível
  const [mostrarForm, setMostrarForm] = useState(false);

  const [termoBusca, setTermoBusca] = useState('');
  const [itensSelecionados, setItensSelecionados] = useState([]);

  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    senha: '',
    perfil: 'Operador'
  });

  useEffect(() => {
    fetchUsuarios();
  }, []);

  const fetchUsuarios = async () => {
    setCarregando(true);
    try {
      const response = await api.get('/admin/usuarios');
      setUsuarios(response.data);
    } catch (error) {
      console.error("Erro ao carregar usuários:", error);
      showAlert("Erro", "Não foi possível carregar a lista de usuários.", "error");
    } finally {
      setCarregando(false);
    }
  };

  const handleSelect = (u) => {
    setSelecionado(u);
    setFormData({
      nome: u.nome || '',
      email: u.email || '',
      senha: '', // Em branco por segurança
      perfil: u.perfil || 'Operador'
    });
    setMostrarForm(true); // Exibe o formulário
  };

  const handleNovo = () => {
    setSelecionado(null);
    setFormData({ nome: '', email: '', senha: '', perfil: 'Operador' });
    setMostrarForm(true); // Exibe o form vazio
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
        email: formData.email,
        perfil: formData.perfil
      };

      if (formData.senha) payload.senha = formData.senha;

      if (selecionado) {
        await api.put(`/admin/usuarios/${selecionado.id}`, payload);
        showAlert("Sucesso!", "O usuário foi atualizado com sucesso.", "success");
      } else {
        if (!formData.senha) {
          return showAlert("Atenção!", "A senha é obrigatória para registrar novos usuários.", "warning");
        }
        await api.post('/admin/usuarios', payload);
        showAlert("Tudo pronto!", "O novo usuário foi cadastrado.", "success");
      }

      fetchUsuarios();
      setMostrarForm(false); // Fecha o form
      setSelecionado(null);
    } catch (error) {
      console.error("Erro ao salvar:", error);
      showAlert("Ops!", "Ocorreu um erro ao salvar os dados do usuário. Tente novamente.", "error");
    }
  };

  const handleExcluir = async (id) => {
    const confirmado = await showConfirm(
      "Excluir Usuário",
      "Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.",
      "error",
      "Sim, Excluir"
    );

    if (!confirmado) return;

    try {
      await api.delete(`/admin/usuarios/${id}`);
      fetchUsuarios();
      if (selecionado && selecionado.id === id) handleCancelar();
      setItensSelecionados(prev => prev.filter(itemId => itemId !== id));
      showAlert("Removido!", "O usuário foi excluído do sistema.", "success");
    } catch (error) {
      console.error("Erro ao excluir:", error);
      showAlert("Erro", "Ocorreu um problema ao tentar excluir este usuário.", "error");
    }
  };

  const handleToggleCheck = (e, id) => {
    e.stopPropagation();
    setItensSelecionados(prev => prev.includes(id) ? prev.filter(itemId => itemId !== id) : [...prev, id]);
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) setItensSelecionados(usuariosFiltrados.map(u => u.id));
    else setItensSelecionados([]);
  };

  const usuariosFiltrados = usuarios.filter(u => {
    const termo = termoBusca.toLowerCase();
    return (u.nome || '').toLowerCase().includes(termo) || (u.email || '').toLowerCase().includes(termo);
  });

  const handleExcluirSelecionados = async () => {
    const confirmado = await showConfirm(
      "Exclusão em Lote",
      `Tem certeza que deseja excluir os ${itensSelecionados.length} usuários selecionados?`,
      "error",
      "Sim, Excluir Todos"
    );

    if (!confirmado) return;

    setCarregando(true);
    try {
      await Promise.all(itensSelecionados.map(id => api.delete(`/admin/usuarios/${id}`)));
      setItensSelecionados([]);
      if (selecionado && itensSelecionados.includes(selecionado.id)) handleCancelar();
      fetchUsuarios();
      showAlert("Sucesso!", "Os usuários foram excluídos em lote.", "success");
    } catch (error) {
      console.error("Erro ao excluir em lote:", error);
      showAlert("Erro", "Não foi possível excluir todos os usuários selecionados.", "error");
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="user-editor-page fade-in">
      <div className="user-layout-grid">

        {/* ─── LISTA DE USUÁRIOS ─── */}
        <aside className="user-list-panel">
          <div className="user-panel-header">
            <div>
              <h3>Gestão de Acessos</h3>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{usuarios.length} usuários no total</span>
            </div>

            <button onClick={handleNovo} className="user-btn-new">
              <Plus /> Novo Cadastro
            </button>
          </div>

          <div className="user-search-box">
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <div style={{ position: 'absolute', left: '0.75rem', color: '#9ca3af' }}><SearchIcon /></div>
              <input
                type="text"
                placeholder="Buscar por nome ou email..."
                value={termoBusca}
                onChange={(e) => setTermoBusca(e.target.value)}
                className="user-input-search"
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
              {usuariosFiltrados.length > 0 && (
                <div className="user-select-all-row">
                  <input type="checkbox" checked={itensSelecionados.length === usuariosFiltrados.length && usuariosFiltrados.length > 0} onChange={handleSelectAll} />
                  <label>Selecionar todos</label>
                </div>
              )}

              {itensSelecionados.length > 0 && (
                <button onClick={handleExcluirSelecionados} className="user-btn-del-mass fade-in">
                  <Trash /> Excluir ({itensSelecionados.length})
                </button>
              )}
            </div>
          </div>

          <div className="user-list-scroll">
            {carregando ? <p className="user-msg-status">Carregando dados...</p> :
              usuarios.length === 0 ? <p className="user-msg-status">Nenhum usuário cadastrado.</p> :
                usuariosFiltrados.length === 0 ? <p className="user-msg-status">Nenhum usuário encontrado na busca.</p> :
                  usuariosFiltrados.map(u => (
                    <div key={u.id} className={`user-card-item ${selecionado?.id === u.id ? 'active' : ''}`} style={{ backgroundColor: itensSelecionados.includes(u.id) ? '#f0fdf4' : '#ffffff' }} onClick={() => handleSelect(u)}>
                      <div style={{ marginRight: '0.75rem', display: 'flex', alignItems: 'center' }}>
                        <input type="checkbox" checked={itensSelecionados.includes(u.id)} onChange={(e) => handleToggleCheck(e, u.id)} onClick={(e) => e.stopPropagation()} style={{ cursor: 'pointer' }} />
                      </div>
                      <div className="user-card-info">
                        <strong>{u.nome || 'Sem Nome'}</strong>
                        <span>{u.email}</span>
                        <span className="user-badge-perfil">{u.perfil || 'Operador'}</span>
                      </div>
                      <button type="button" className="user-btn-del-small" onClick={(e) => { e.stopPropagation(); handleExcluir(u.id); }} title="Excluir Usuário">
                        <Trash />
                      </button>
                    </div>
                  ))
            }
          </div>
        </aside>

        {/* ─── PAINEL DIREITO (FORMULÁRIO OU EMPTY STATE) ─── */}
        <main className="user-form-panel">

          {!mostrarForm ? (
            /* EMPTY STATE */
            <div className="user-empty-state fade-in">
              <UsersIcon />
              <h3>Nenhum usuário selecionado</h3>
              <p>Selecione um usuário na lista à esquerda para editar seus acessos, ou clique no botão abaixo para criar um novo.</p>
              <button onClick={handleNovo} className="user-btn-save-primary" style={{ marginTop: '1rem' }}>
                <Plus /> Cadastrar Novo Usuário
              </button>
            </div>
          ) : (
            /* FORMULÁRIO */
            <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div className="user-panel-header">
                <div>
                  <h3>{selecionado ? `Editar Cadastro` : 'Cadastrar Novo Usuário'}</h3>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    {selecionado ? `ID: ${selecionado.id.substring(0, 8).toUpperCase()}` : 'Preencha os dados abaixo'}
                  </span>
                </div>
              </div>

              <form onSubmit={handleSalvar} className="user-form-content">
                <div className="user-form-group">
                  <label>Nome Completo *</label>
                  <input type="text" required value={formData.nome} onChange={e => setFormData({ ...formData, nome: e.target.value })} placeholder="Ex: João Silva" />
                </div>

                <div className="user-form-group">
                  <label>E-mail Corporativo (Login) *</label>
                  <input type="email" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="Ex: joao@comau.com" />
                </div>

                <div className="user-form-group">
                  <label>Senha de Acesso {selecionado && <span style={{ color: '#9ca3af', fontWeight: 'normal' }}>(Deixe em branco para manter a atual)</span>}</label>
                  <input type="password" value={formData.senha} onChange={e => setFormData({ ...formData, senha: e.target.value })} placeholder="••••••••" minLength={6} required={!selecionado} />
                </div>

                <div className="user-form-group">
                  <label>Perfil de Acesso *</label>
                  <select required value={formData.perfil} onChange={e => setFormData({ ...formData, perfil: e.target.value })}>
                    <option value="Admin">Administrador (Acesso Total)</option>
                    <option value="Operador">Operador (Leitura e Edição em Lote)</option>
                    <option value="Visualizador">Visualizador (Apenas Leitura)</option>
                  </select>
                </div>

                <div className="user-form-actions">
                  <button type="button" className="user-btn-cancel" onClick={handleCancelar}>Cancelar</button>
                  <button type="submit" className="user-btn-save-primary">
                    <Save /> {selecionado ? 'Salvar Alterações' : 'Confirmar Cadastro'}
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