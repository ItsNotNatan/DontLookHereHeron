const express = require('express');
const router = express.Router();
const veiculoController = require('../controllers/veiculoController');
const { verificarToken, permitirPerfis } = require('../middlewares/authMiddleware');

// GET Público (Para carregar os veículos no formulário externo)
router.get('/', veiculoController.listarVeiculos);

// Gestão de Frota (Criação, Edição, Exclusão): APENAS ADMIN
router.post('/', verificarToken, permitirPerfis(['Admin']), veiculoController.criarVeiculo);
router.put('/:id', verificarToken, permitirPerfis(['Admin']), veiculoController.atualizarVeiculo);
router.delete('/:id', verificarToken, permitirPerfis(['Admin']), veiculoController.excluirVeiculo);

module.exports = router;