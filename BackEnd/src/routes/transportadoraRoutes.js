const express = require('express');
const router = express.Router();
const transportadoraController = require('../controllers/transportadoraController');
const { verificarToken, permitirPerfis } = require('../middlewares/authMiddleware');

// 🟢 O novo Operador tem permissão para ler a lista de transportadoras
router.get('/', verificarToken, permitirPerfis(['Admin', 'Operador']), transportadoraController.listarTransportadoras);

// 🟢 Alteração de perfil: Cadastros base de Transportadoras agora são exclusivos do Admin
router.post('/', verificarToken, permitirPerfis(['Admin']), transportadoraController.criarTransportadora);
router.put('/:id', verificarToken, permitirPerfis(['Admin']), transportadoraController.atualizarTransportadora);
router.delete('/:id', verificarToken, permitirPerfis(['Admin']), transportadoraController.excluirTransportadora);

module.exports = router;
