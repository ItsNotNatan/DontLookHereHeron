const express = require('express');
const router = express.Router();
const motivoController = require('../controllers/motivoController');
const { verificarToken, permitirPerfis } = require('../middlewares/authMiddleware');

router.get('/', verificarToken, permitirPerfis(['Admin', 'Operador']), motivoController.listarMotivos);
router.post('/', verificarToken, permitirPerfis(['Admin']), motivoController.criarMotivo);
router.put('/:id', verificarToken, permitirPerfis(['Admin']), motivoController.atualizarMotivo);
router.delete('/:id', verificarToken, permitirPerfis(['Admin']), motivoController.excluirMotivo);

module.exports = router;
