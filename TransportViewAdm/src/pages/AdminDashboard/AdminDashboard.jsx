// src/pages/AdminDashboard/AdminDashboard.jsx
import React, { useState, useEffect } from 'react';
import api from '../../services/api'; 
import CardExpandido from '../../componentes/CardExpandido/CardExpandido';
import DashboardComponent from '../../componentes/Dashboard/Dashboard';

// 🟢 1. IMPORTA O SOCKET
import { io } from 'socket.io-client';

// 🟢 2. CONECTA AO BACK-END (mesmo host que abriu a pagina, porta 3001 - self-hosted)
const socket = io(`http://${window.location.hostname}:3001`);

export default function AdminDashboard() {
  const [selectedAtm, setSelectedAtm] = useState(null);
  const [atms, setAtms] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [debugInfo, setDebugInfo] = useState('Iniciando busca...'); 

  useEffect(() => {
    // Busca os dados quando a tela carrega pela primeira vez
    buscarPedidos();

    // 🟢 3. FICA ESCUTANDO O BACK-END GRITAR "transportes_atualizados"
    socket.on('transportes_atualizados', () => {
      console.log('🔄 O banco de dados de transportes mudou! Atualizando a tabela sem F5...');
      buscarPedidos();
    });

    // 🟢 4. DESLIGA O "RÁDIO" AO SAIR DA TELA (Evita vazamento de memória e travamentos)
    return () => {
      socket.off('transportes_atualizados');
    };
  }, []);

  const buscarPedidos = async () => {
    // Mantém o estado 'carregando' apenas se a tabela estiver vazia (primeira carga).
    // Assim, quando atualizar em tempo real, a tabela não pisca "Carregando..."
    if (atms.length === 0) setCarregando(true); 
    
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) setDebugInfo("ERRO: Você não tem accessToken no localStorage!");

      const resposta = await api.get('/admin/transportes');
      
      setDebugInfo(`Sucesso! Recebi ${resposta.data.length} pedidos do banco.`); 
      setAtms(resposta.data);
    } catch (erro) {
      setDebugInfo("ERRO NA API: " + (erro.response?.data?.erro || erro.message));
    } finally {
      setCarregando(false);
    }
  };

  const handleOpenBatchEdit = (idsSelecionados) => {
    alert(`Pronto para editar ${idsSelecionados.length} itens em lote!\nIDs selecionados: ${idsSelecionados.join(', ')}`);
  };

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <DashboardComponent 
        atms={atms} 
        carregando={carregando} 
        onOpenAtm={(atm) => setSelectedAtm(atm)} 
        onOpenBatchEdit={handleOpenBatchEdit}
      />

      <CardExpandido 
        atm={selectedAtm} 
        onClose={() => setSelectedAtm(null)}
        onAtmUpdated={() => { setSelectedAtm(null); buscarPedidos(); }} 
      />
    </div>
  );
}