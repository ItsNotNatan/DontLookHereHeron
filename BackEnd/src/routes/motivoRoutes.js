const express = require('express');
const router = express.Router();
const motivoController = require('../controllers/motivoController');
const { verificarToken, permitirPerfis } = require('../middlewares/authMiddleware');

// 🟢 O novo Operador tem permissão para listar os motivos (Divergências) nas caixas de seleção
router.get('/', verificarToken, permitirPerfis(['Admin', 'Operador']), motivoController.listarMotivos);

// 🟢 Alteração de perfil: Cadastros base de Motivos agora são exclusivos do Admin
router.post('/', verificarToken, permitirPerfis(['Admin']), motivoController.criarMotivo);
router.put('/:id', verificarToken, permitirPerfis(['Admin']), motivoController.atualizarMotivo);
router.delete('/:id', verificarToken, permitirPerfis(['Admin']), motivoController.excluirMotivo);

module.exports = router;
