// src/pages/EditorEndereco/EditorEndereco.jsx
import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import './EditorEndereco.css';

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
const MapIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"></polygon><line x1="9" y1="3" x2="9" y2="18"></line><line x1="15" y1="6" x2="15" y2="21"></line></svg>;

export default function EditorEndereco() {
    const { showAlert, showConfirm } = useAlert();

    const [locais, setLocais] = useState([]);
    const [carregando, setCarregando] = useState(false);
    const [selecionado, setSelecionado] = useState(null);
    const [mostrarForm, setMostrarForm] = useState(false);

    const [termoBusca, setTermoBusca] = useState('');
    const [itensSelecionados, setItensSelecionados] = useState([]);

    const [paginaAtual, setPaginaAtual] = useState(1);
    const itensPorPagina = 50; 

    const [formData, setFormData] = useState({
        nome_local: '', cep: '', logradouro: '', numero: '',
        bairro: '', municipio: '', uf: ''
    });

    useEffect(() => {
        fetchLocais();

        // 🟢 3. ESCUTA O AVISO DO BACK-END E ATUALIZA A TELA
        socket.on('locais_atualizados', () => {
            console.log('🔄 Endereços alterados no banco. Recarregando lista...');
            fetchLocais();
        });

        // 🟢 4. DESLIGA O AVISO AO SAIR DA TELA
        return () => {
            socket.off('locais_atualizados');
        };
    }, []);

    useEffect(() => {
        setPaginaAtual(1);
    }, [termoBusca]);

    const fetchLocais = async () => {
        // Só exibe carregando se a lista estiver vazia (evita piscar a tela no Real-Time)
        setCarregando(locais.length === 0); 
        try {
            const response = await api.get('/admin/locais');
            
            let dadosDosEnderecos = [];
            if (Array.isArray(response.data)) dadosDosEnderecos = response.data;
            else if (response.data && Array.isArray(response.data.locais)) dadosDosEnderecos = response.data.locais;
            else if (response.data && Array.isArray(response.data.data)) dadosDosEnderecos = response.data.data;

            setLocais(dadosDosEnderecos);

        } catch (error) {
            console.error("❌ Erro de comunicação com a API:", error);
            const mensagemServidor = error.response?.data?.erro || error.response?.data?.message || "Erro desconhecido";
            showAlert("Falha na Conexão", `Não foi possível carregar os endereços. Motivo: ${mensagemServidor}`, "error");
        } finally {
            setCarregando(false);
        }
    };

    const locaisFiltrados = locais.filter(l => {
        const termo = termoBusca.toLowerCase();
        const texto = `${l.nome_local} ${l.municipio} ${l.uf} ${l.logradouro}`.toLowerCase();
        return texto.includes(termo);
    });

    const totalPaginas = Math.ceil(locaisFiltrados.length / itensPorPagina);
    const indiceUltimoItem = paginaAtual * itensPorPagina;
    const indicePrimeiroItem = indiceUltimoItem - itensPorPagina;
    const locaisExibidos = locaisFiltrados.slice(indicePrimeiroItem, indiceUltimoItem);

    const handleSelect = (local) => {
        setSelecionado(local);
        setFormData({
            nome_local: local.nome_local || '', cep: local.cep || '',
            logradouro: local.logradouro || '', numero: local.numero || '',
            bairro: local.bairro || '', municipio: local.municipio || '',
            uf: local.uf || ''
        });
        setMostrarForm(true);
    };

    const handleNovo = () => {
        setSelecionado(null);
        setFormData({ nome_local: '', cep: '', logradouro: '', numero: '', bairro: '', municipio: '', uf: '' });
        setMostrarForm(true);
    };

    const handleCancelar = () => {
        setMostrarForm(false);
        setSelecionado(null);
    };

    const buscarCep = async (valorCep) => {
        const cepLimpo = valorCep.replace(/\D/g, '');
        setFormData(prev => ({ ...prev, cep: valorCep }));

        if (cepLimpo.length === 8) {
            try {
                const res = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
                const data = await res.json();
                if (data.erro) {
                    showAlert("Atenção", "CEP não encontrado. Preencha manualmente.", "warning");
                    return;
                }
                setFormData(prev => ({
                    ...prev,
                    logradouro: data.logradouro || prev.logradouro,
                    bairro: data.bairro || prev.bairro,
                    municipio: data.localidade || prev.municipio,
                    uf: data.uf || prev.uf
                }));
            } catch (error) {
                console.error("Erro no ViaCEP:", error);
            }
        }
    };

    const handleSalvar = async (e) => {
        e.preventDefault();
        try {
            if (selecionado) {
                await api.put(`/admin/locais/${selecionado.id}`, formData);
                showAlert("Sucesso!", "Endereço atualizado com sucesso!", "success");
            } else {
                await api.post('/admin/locais', formData);
                showAlert("Sucesso!", "Novo endereço cadastrado!", "success");
            }
            setMostrarForm(false);
            setSelecionado(null);
        } catch (error) {
            console.error("Erro ao salvar:", error);
            showAlert("Erro", "Ocorreu um erro ao tentar salvar os dados do endereço.", "error");
        }
    };

    const handleExcluir = async (id) => {
        const confirmado = await showConfirm(
            "Excluir Endereço",
            "Tem certeza que deseja excluir este endereço do sistema?",
            "error", "Sim, Excluir"
        );
        if (!confirmado) return;

        try {
            await api.delete(`/admin/locais/${id}`);
            if (selecionado && selecionado.id === id) handleCancelar();
            setItensSelecionados(prev => prev.filter(itemId => itemId !== id));
            showAlert("Excluído!", "Endereço removido com sucesso.", "success");
        } catch (error) {
            console.error("Erro ao excluir:", error);
            const msgErro = error.response?.data?.erro || error.response?.data?.message || "Não foi possível excluir. Este endereço já está sendo usado em um ou mais pedidos de transporte (ATM).";
            showAlert("Exclusão Bloqueada", msgErro, "error");
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
            const todosIds = locaisFiltrados.map(l => l.id);
            setItensSelecionados(todosIds);
        } else {
            setItensSelecionados([]);
        }
    };

    const handleExcluirSelecionados = async () => {
        const confirmado = await showConfirm(
            "Excluir em Lote",
            `Tem certeza que deseja excluir os ${itensSelecionados.length} endereço(s) selecionado(s)?`,
            "error",
            "Excluir Todos"
        );
        if (!confirmado) return;

        setCarregando(true);
        try {
            await Promise.all(itensSelecionados.map(id => api.delete(`/admin/locais/${id}`)));
            
            setItensSelecionados([]);
            if (selecionado && itensSelecionados.includes(selecionado.id)) handleCancelar();
            showAlert("Sucesso!", "Endereços excluídos com sucesso!", "success");
        } catch (error) {
            console.error("Erro ao excluir em lote:", error);
            const msgErro = error.response?.data?.erro || error.response?.data?.message || "Alguns endereços não puderam ser excluídos pois já fazem parte de rotas de transporte existentes.";
            showAlert("Exclusão Parcial", msgErro, "warning");
        } finally {
            setCarregando(false);
        }
    };

    return (
        <div className="editor-page fade-in">
            <div className="editor-layout-grid">

                {/* ─── LISTA DE ENDEREÇOS ─── */}
                <aside className="list-panel">
                    <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h3>Gestão de Endereços</h3>
                            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{locaisFiltrados.length} resultados</span>
                        </div>
                        <button onClick={handleNovo} className="btn-new-project" style={{ background: '#2563eb', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
                            <Plus /> Novo Local
                        </button>
                    </div>

                    <div style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb', backgroundColor: '#f8fafc' }}>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <div style={{ position: 'absolute', left: '0.75rem', color: '#9ca3af' }}><SearchIcon /></div>
                            <input
                                type="text"
                                placeholder="Buscar por nome ou cidade em todos..."
                                value={termoBusca}
                                onChange={(e) => setTermoBusca(e.target.value)}
                                style={{ width: '100%', padding: '10px 10px 10px 35px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                            />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                            {locaisFiltrados.length > 0 && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#4b5563' }}>
                                    <input
                                        type="checkbox"
                                        checked={itensSelecionados.length === locaisFiltrados.length && locaisFiltrados.length > 0}
                                        onChange={handleSelectAll}
                                        style={{ cursor: 'pointer', width: '16px', height: '16px', margin: 0 }}
                                    />
                                    <label style={{ margin: 0, fontWeight: 600 }}>Selecionar tudo da busca</label>
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
                        {carregando && locais.length === 0 ? <p className="msg-status" style={{textAlign: 'center', padding: '1rem', color: '#64748b'}}>Carregando lista...</p> :
                            locais.length === 0 ? <p className="msg-status" style={{textAlign: 'center', padding: '1rem', color: '#64748b'}}>Nenhum endereço cadastrado.</p> :
                                locaisFiltrados.length === 0 ? <p className="msg-status" style={{textAlign: 'center', padding: '1rem', color: '#64748b'}}>Nenhum endereço encontrado na busca.</p> :
                                    locaisExibidos.map(l => (
                                        <div
                                            key={l.id}
                                            className={`card-item ${selecionado?.id === l.id ? 'active' : ''}`}
                                            style={{ backgroundColor: itensSelecionados.includes(l.id) ? '#f0fdf4' : '#ffffff' }}
                                            onClick={() => handleSelect(l)}
                                        >
                                            <div style={{ marginRight: '0.75rem', display: 'flex', alignItems: 'center' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={itensSelecionados.includes(l.id)}
                                                    onChange={(e) => handleToggleCheck(e, l.id)}
                                                    onClick={(e) => e.stopPropagation()}
                                                    style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                                                />
                                            </div>

                                            <div className="card-info" style={{ flexGrow: 1 }}>
                                                <strong style={{ display: 'block', fontSize: '0.9rem', color: '#111827', fontWeight: 600 }}>
                                                    {l.nome_local || 'Local Sem Nome'}
                                                </strong>
                                                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                                    {l.municipio ? `${l.municipio} - ${l.uf}` : 'Cidade não informada'}
                                                </span>
                                            </div>
                                            <button type="button" className="btn-del-small" onClick={(e) => { e.stopPropagation(); handleExcluir(l.id); }}>
                                                <Trash />
                                            </button>
                                        </div>
                                    ))
                        }
                    </div>

                    {!carregando && locaisFiltrados.length > itensPorPagina && (
                        <div className="pagination-controls">
                            <span>Total: {locaisFiltrados.length}</span>
                            <div className="pagination-buttons">
                                <button className="btn-page" disabled={paginaAtual === 1} onClick={() => setPaginaAtual(prev => Math.max(prev - 1, 1))}>◀</button>
                                <span className="page-indicator">Pág {paginaAtual} de {totalPaginas}</span>
                                <button className="btn-page" disabled={paginaAtual === totalPaginas} onClick={() => setPaginaAtual(prev => Math.min(prev + 1, totalPaginas))}>▶</button>
                            </div>
                        </div>
                    )}
                </aside>

                {/* ─── PAINEL DIREITO (FORMULÁRIO OU EMPTY STATE) ─── */}
                <main className="form-panel">
                    {!mostrarForm ? (
                        <div className="empty-state-panel fade-in" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', color: '#64748b', textAlign: 'center', padding: '2rem' }}>
                            <MapIcon />
                            <h3 style={{ margin: '15px 0 10px', color: '#334155', fontSize: '1.25rem', fontWeight: 700 }}>Nenhum local selecionado</h3>
                            <p style={{ maxWidth: '400px', fontSize: '0.95rem', lineHeight: 1.5 }}>Selecione um endereço na lista à esquerda para editar, ou clique no botão abaixo para adicionar uma nova empresa ou centro de distribuição.</p>
                            <button onClick={handleNovo} className="btn-save-primary" style={{ marginTop: '1rem', background: '#2563eb', color: 'white', border: 'none', padding: '12px 25px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Plus /> Cadastrar Novo Local
                            </button>
                        </div>
                    ) : (
                        <div className="fade-in form-container-wrapper" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                            <div className="panel-header" style={{ padding: '20px', background: '#ffffff', borderBottom: '1px solid #e5e7eb' }}>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#1e293b', fontWeight: 800 }}>
                                        {selecionado ? `Editando Endereço` : 'Cadastrar Novo Endereço'}
                                    </h3>
                                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Insira as informações do ponto de coleta ou entrega</span>
                                </div>
                            </div>

                            <form onSubmit={handleSalvar} className="form-content" style={{ padding: '30px', overflowY: 'auto', flex: 1 }}>
                                <h4 style={{ marginBottom: '1rem', color: '#1e3a8a', fontSize: '0.95rem' }}>Identificação do Local</h4>
                                
                                <div className="form-group-p" style={{ marginBottom: '20px' }}>
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#475569', marginBottom: '8px' }}>Nome da Empresa / Local *</label>
                                    <input type="text" required value={formData.nome_local} onChange={e => setFormData({ ...formData, nome_local: e.target.value })} placeholder="Ex: Galpão Central" style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
                                </div>

                                <h4 style={{ marginBottom: '1rem', color: '#1e3a8a', fontSize: '0.95rem', borderTop: '1px solid #e5e7eb', paddingTop: '20px' }}>Endereço Completo</h4>
                                
                                <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr 100px', gap: '15px', marginBottom: '15px' }}>
                                    <div className="form-group-p" style={{ marginBottom: 0 }}>
                                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#475569', marginBottom: '8px' }}>CEP</label>
                                        <input type="text" value={formData.cep} onChange={e => buscarCep(e.target.value)} maxLength="9" placeholder="00000-000" style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
                                    </div>
                                    <div className="form-group-p" style={{ marginBottom: 0 }}>
                                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#475569', marginBottom: '8px' }}>Logradouro (Rua/Av) *</label>
                                        <input type="text" required value={formData.logradouro} onChange={e => setFormData({ ...formData, logradouro: e.target.value })} style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
                                    </div>
                                    <div className="form-group-p" style={{ marginBottom: 0 }}>
                                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#475569', marginBottom: '8px' }}>Número *</label>
                                        <input type="text" required value={formData.numero} onChange={e => setFormData({ ...formData, numero: e.target.value })} style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 80px', gap: '15px', marginBottom: '20px' }}>
                                    <div className="form-group-p" style={{ marginBottom: 0 }}>
                                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#475569', marginBottom: '8px' }}>Bairro *</label>
                                        <input type="text" required value={formData.bairro} onChange={e => setFormData({ ...formData, bairro: e.target.value })} style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
                                    </div>
                                    <div className="form-group-p" style={{ marginBottom: 0 }}>
                                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#475569', marginBottom: '8px' }}>Cidade *</label>
                                        <input type="text" required value={formData.municipio} onChange={e => setFormData({ ...formData, municipio: e.target.value })} style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
                                    </div>
                                    <div className="form-group-p" style={{ marginBottom: 0 }}>
                                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#475569', marginBottom: '8px' }}>UF *</label>
                                        <input type="text" required maxLength="2" value={formData.uf} onChange={e => setFormData({ ...formData, uf: e.target.value.toUpperCase() })} style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px', textTransform: 'uppercase' }} />
                                    </div>
                                </div>

                                <div className="form-actions-p" style={{ display: 'flex', justifyContent: 'flex-end', gap: '15px', borderTop: '1px solid #e5e7eb', paddingTop: '25px', marginTop: '30px' }}>
                                    <button type="button" className="btn-cancel" onClick={handleCancelar} style={{ background: 'white', border: '1px solid #cbd5e1', color: '#4b5563', padding: '12px 25px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
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