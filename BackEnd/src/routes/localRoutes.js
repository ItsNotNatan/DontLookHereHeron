// src/routes/localRoutes.js
const express = require('express');
const router = express.Router();
const localController = require('../controllers/localController');
const { verificarToken, permitirPerfis } = require('../middlewares/authMiddleware');

// GET publico (o formulario do Client lista os locais sem login)
router.get('/', localController.listarLocais);

// Mutacoes: apenas Admin/Operador (antes estavam abertas a qualquer um na rede)
router.post('/', verificarToken, permitirPerfis(['Admin', 'Operador']), localController.criarLocal);
router.put('/:id', verificarToken, permitirPerfis(['Admin', 'Operador']), localController.atualizarLocal);
router.delete('/:id', verificarToken, permitirPerfis(['Admin', 'Operador']), localController.excluirLocal);

module.exports = router;
