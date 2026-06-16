// src/routes/localRoutes.js
const express = require('express');
const router = express.Router();
const localController = require('../controllers/localController');

// Publicas (o formulario do Client lista/usa os locais sem login)
router.get('/', localController.listarLocais);
router.post('/', localController.criarLocal);
router.put('/:id', localController.atualizarLocal);
router.delete('/:id', localController.excluirLocal);

module.exports = router;
