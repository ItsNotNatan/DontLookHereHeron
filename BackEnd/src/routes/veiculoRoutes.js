const express = require('express');
const router = express.Router();
const veiculoController = require('../controllers/veiculoController');
const { verificarToken, permitirPerfis } = require('../middlewares/authMiddleware');

// GET publico (carrega veiculos no formulario externo)
router.get('/', veiculoController.listarVeiculos);

// Gestao de frota: apenas Admin
router.post('/', verificarToken, permitirPerfis(['Admin']), veiculoController.criarVeiculo);
router.put('/:id', verificarToken, permitirPerfis(['Admin']), veiculoController.atualizarVeiculo);
router.delete('/:id', verificarToken, permitirPerfis(['Admin']), veiculoController.excluirVeiculo);

module.exports = router;
