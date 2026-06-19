const express = require('express');
const router = express.Router();
const projetoController = require('../controllers/projetoController');
const { verificarToken, permitirPerfis } = require('../middlewares/authMiddleware');

router.get('/', projetoController.listarProjetos);

// 🟢 Alteração de perfil: Cadastros base de Projetos (WBS) agora são exclusivos do Admin
router.post('/', verificarToken, permitirPerfis(['Admin']), projetoController.criarProjeto);
router.put('/:id', verificarToken, permitirPerfis(['Admin']), projetoController.atualizarProjeto);
router.delete('/:id', verificarToken, permitirPerfis(['Admin']), projetoController.excluirProjeto);

module.exports = router;
