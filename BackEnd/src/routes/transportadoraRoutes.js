const express = require('express');
const router = express.Router();
const transportadoraController = require('../controllers/transportadoraController');
const { verificarToken, permitirPerfis } = require('../middlewares/authMiddleware');

router.get('/', verificarToken, permitirPerfis(['Admin', 'Operador', 'Visualizador']), transportadoraController.listarTransportadoras);
router.post('/', verificarToken, permitirPerfis(['Admin', 'Operador']), transportadoraController.criarTransportadora);
router.put('/:id', verificarToken, permitirPerfis(['Admin', 'Operador']), transportadoraController.atualizarTransportadora);
router.delete('/:id', verificarToken, permitirPerfis(['Admin', 'Operador']), transportadoraController.excluirTransportadora);

module.exports = router;