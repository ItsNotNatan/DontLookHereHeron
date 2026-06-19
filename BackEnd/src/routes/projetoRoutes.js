const express = require('express');
const router = express.Router();
const projetoController = require('../controllers/projetoController');
const { verificarToken, permitirPerfis } = require('../middlewares/authMiddleware');

// GET publico (o formulario de requisicao lista os WBS)
router.get('/', projetoController.listarProjetos);

router.post('/', verificarToken, permitirPerfis(['Admin']), projetoController.criarProjeto);
router.put('/:id', verificarToken, permitirPerfis(['Admin']), projetoController.atualizarProjeto);
router.delete('/:id', verificarToken, permitirPerfis(['Admin']), projetoController.excluirProjeto);

module.exports = router;
