const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuarioController');
const { verificarToken, permitirPerfis } = require('../middlewares/authMiddleware');

// Apenas Admin gerencia usuarios
router.get('/', verificarToken, permitirPerfis(['Admin']), usuarioController.listarUsuarios);
router.post('/', verificarToken, permitirPerfis(['Admin']), usuarioController.criarUsuario);
router.put('/:id', verificarToken, permitirPerfis(['Admin']), usuarioController.atualizarUsuario);
router.delete('/:id', verificarToken, permitirPerfis(['Admin']), usuarioController.excluirUsuario);

module.exports = router;
