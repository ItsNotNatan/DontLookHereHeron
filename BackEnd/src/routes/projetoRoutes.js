const express = require('express');
const router = express.Router();
const projetoController = require('../controllers/projetoController');
const { verificarToken, permitirPerfis } = require('../middlewares/authMiddleware');

// GET Público (para o formulário de requisição listar os WBS)
router.get('/', projetoController.listarProjetos);

// Edição, Criação e Exclusão: Apenas Admin e Operador
router.post('/', verificarToken, permitirPerfis(['Admin', 'Operador']), projetoController.criarProjeto);
router.put('/:id', verificarToken, permitirPerfis(['Admin', 'Operador']), projetoController.atualizarProjeto);
router.delete('/:id', verificarToken, permitirPerfis(['Admin', 'Operador']), projetoController.excluirProjeto);

module.exports = router;