// src/routes/transporteRoutes.js
const express = require('express');
const router = express.Router();
const transporteController = require('../controllers/transporteController');
const { verificarToken, permitirPerfis } = require('../middlewares/authMiddleware');

// ROTAS PUBLICAS
router.post('/transportes', transporteController.criarTransporte);
router.get('/transportes/rastreio/:codigo', transporteController.rastrearPedidoPublico);

// Visualizar Tabela: publica (consumida pelo app do Client sem login)
router.get('/admin/transportes', transporteController.listarTransportesAdmin);

// 🟢 CORREÇÃO: Edicao (individual e lote) liberada para Admin, Operador E Visualizador
router.put('/admin/transportes/lote/editar', verificarToken, permitirPerfis(['Admin', 'Operador', 'Visualizador']), transporteController.atualizarLoteAdmin);
router.put('/admin/transportes/:id', verificarToken, permitirPerfis(['Admin', 'Operador', 'Visualizador']), transporteController.atualizarTransporteAdmin);

module.exports = router;
