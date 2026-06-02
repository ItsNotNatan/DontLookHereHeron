// src/routes/localRoutes.js
const express = require('express');
const router = express.Router();
const localController = require('../controllers/localController');

// 🟢 TODAS AS ROTAS 100% PÚBLICAS PARA TESTE
// Removidos os middlewares 'verificarToken' e 'permitirPerfis' de todos os métodos

router.get('/', localController.listarLocais);
router.post('/', localController.criarLocal);
router.put('/:id', localController.atualizarLocal);
router.delete('/:id', localController.excluirLocal);

module.exports = router;