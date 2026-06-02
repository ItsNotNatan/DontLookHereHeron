import { createBrowserRouter } from 'react-router-dom';
import Layout from './components/layout/layout'; 
import Home from './pages/Home/Home'; 
import RequestForm from './pages/RequestForm/RequestForm';
import PainelAtm from './pages/PainelAtm/PainelAtm';
import AcompFinan from './pages/AcompFinan/AcompFinan';
import MedidorCargas from './pages/MedidorCargas/MedidorCargas'; 

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />, 
    children: [
      { path: "/", element: <Home /> }, 
      { path: "/solicitar", element: <RequestForm /> }, 
      { path: "/simulador-veiculo", element: <MedidorCargas /> },
      { path: "/painelatm", element: <PainelAtm /> },
      { path: "/financeiro", element: <AcompFinan /> }
    ]
  }
]);