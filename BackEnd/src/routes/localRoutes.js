const express = require('express');
const router = express.Router();
const localController = require('../controllers/localController');
const { verificarToken, permitirPerfis } = require('../middlewares/authMiddleware');

router.get('/', localController.listarLocais);

// 🟢 Alteração de perfil: Cadastros base de Endereços agora são exclusivos do Admin
router.post('/', verificarToken, permitirPerfis(['Admin']), localController.criarLocal);
router.put('/:id', verificarToken, permitirPerfis(['Admin']), localController.atualizarLocal);
router.delete('/:id', verificarToken, permitirPerfis(['Admin']), localController.excluirLocal);

module.exports = router;
