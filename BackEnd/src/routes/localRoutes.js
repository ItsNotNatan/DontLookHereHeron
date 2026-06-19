const express = require('express');
const router = express.Router();
const localController = require('../controllers/localController');
const { verificarToken, permitirPerfis } = require('../middlewares/authMiddleware');

router.get('/', localController.listarLocais);
// Apenas Admin pode mexer nos Endereços fixos
router.post('/', verificarToken, permitirPerfis(['Admin']), localController.criarLocal);
router.put('/:id', verificarToken, permitirPerfis(['Admin']), localController.atualizarLocal);
router.delete('/:id', verificarToken, permitirPerfis(['Admin']), localController.excluirLocal);

module.exports = router;
