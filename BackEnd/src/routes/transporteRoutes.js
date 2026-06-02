const express = require('express');
const router = express.Router();
const transporteController = require('../controllers/transporteController');
const { verificarToken, permitirPerfis } = require('../middlewares/authMiddleware');

// 👇 ROTAS PÚBLICAS (Sem verificarToken)
router.post('/transportes', transporteController.criarTransporte);
router.get('/transportes/rastreio/:codigo', transporteController.rastrearPedidoPublico); // 🟢 Rota Nova!

// 👇 ROTAS PROTEGIDAS POR PERFIL

// Visualizar Tabela: Admin, Operador e Visualizador
// Visualizar Tabela: Rota agora é PÚBLICA
router.get('/admin/transportes', transporteController.listarTransportesAdmin);

// Edição (Individual e Lote): Apenas Admin e Operador
router.put('/admin/transportes/lote/editar', verificarToken, permitirPerfis(['Admin', 'Operador']), transporteController.atualizarLoteAdmin);
router.put('/admin/transportes/:id', verificarToken, permitirPerfis(['Admin', 'Operador']), transporteController.atualizarTransporteAdmin);

module.exports = router;