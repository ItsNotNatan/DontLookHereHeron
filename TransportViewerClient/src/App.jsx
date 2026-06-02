import { useState, useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './routes'; 
import SplashScreen from './components/SplashScreen/SplashScreen';

function App() {
  const [isAppLoading, setIsAppLoading] = useState(true);

  useEffect(() => {
    // Aqui você faz o carregamento inicial do seu app.
    // Pode ser buscar configurações da API, validar token, etc.
    const initializeApp = async () => {
      try {
        // Exemplo: await api.get('/admin/configuracoes-iniciais');
        
        // Simulando um tempo de carregamento de 2 segundos para você ver a tela
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error("Erro ao carregar dados iniciais", error);
      } finally {
        // Quando terminar (com sucesso ou erro), tira a splash screen
        setIsAppLoading(false);
      }
    };

    initializeApp();
  }, []);

  // Se estiver carregando, mostra APENAS a Splash Screen
  if (isAppLoading) {
    return <SplashScreen />;
  }

  // Se já carregou, mostra o App normal com as rotas
  return (
    <RouterProvider router={router} />
  );
}

export default App;