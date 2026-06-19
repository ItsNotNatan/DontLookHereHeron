const express = require('express');
const router = express.Router();
const transporteController = require('../controllers/transporteController');
const { verificarToken, permitirPerfis } = require('../middlewares/authMiddleware');

router.post('/transportes', transporteController.criarTransporte);
router.get('/transportes/rastreio/:codigo', transporteController.rastrearPedidoPublico);
router.get('/admin/transportes', transporteController.listarTransportesAdmin);
router.put('/admin/transportes/lote/editar', verificarToken, permitirPerfis(['Admin', 'Operador']), transporteController.atualizarLoteAdmin);
router.put('/admin/transportes/:id', verificarToken, permitirPerfis(['Admin', 'Operador']), transporteController.atualizarTransporteAdmin);

module.exports = router;
