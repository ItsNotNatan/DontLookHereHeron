const express = require('express');
const router = express.Router();
const motivoController = require('../controllers/motivoController');
const { verificarToken, permitirPerfis } = require('../middlewares/authMiddleware');

// Apenas Admin e Operador podem gerenciar os motivos
router.get('/', verificarToken, permitirPerfis(['Admin', 'Operador', 'Visualizador']), motivoController.listarMotivos);
router.post('/', verificarToken, permitirPerfis(['Admin', 'Operador']), motivoController.criarMotivo);
router.put('/:id', verificarToken, permitirPerfis(['Admin', 'Operador']), motivoController.atualizarMotivo);
router.delete('/:id', verificarToken, permitirPerfis(['Admin', 'Operador']), motivoController.excluirMotivo);

module.exports = router;