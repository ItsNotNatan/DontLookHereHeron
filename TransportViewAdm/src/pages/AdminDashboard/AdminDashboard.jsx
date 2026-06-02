import React, { useState, useEffect } from 'react';
import api from '../../services/api'; 
import CardExpandido from '../../componentes/CardExpandido/CardExpandido';
import DashboardComponent from '../../componentes/Dashboard/Dashboard';

export default function AdminDashboard() {
  const [selectedAtm, setSelectedAtm] = useState(null);
  const [atms, setAtms] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [debugInfo, setDebugInfo] = useState('Iniciando busca...'); 

  useEffect(() => {
    buscarPedidos();
  }, []);

  const buscarPedidos = async () => {
    setCarregando(true);
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

  // 🟢 NOVO: Função para lidar com a abertura do modal de edição em lote
  const handleOpenBatchEdit = (idsSelecionados) => {
    // Para já, mostramos um alert, mas no futuro vais abrir o teu modal aqui!
    alert(`Pronto para editar ${idsSelecionados.length} itens em lote!\nIDs selecionados: ${idsSelecionados.join(', ')}`);
    
    // Exemplo do futuro: 
    // setBatchEditModalOpen(true);
    // setIdsParaEditar(idsSelecionados);
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