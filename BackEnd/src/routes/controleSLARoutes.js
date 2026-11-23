const express = require('express');
const router = express.Router();
const controller = require('../controllers/controleSLAController');
const { verificarToken, permitirPerfis } = require('../middlewares/authMiddleware');

// Todas as rotas do módulo exigem autenticação e perfil operacional autorizado.
router.use(verificarToken, permitirPerfis(['Admin', 'Operador']));

router.get('/registros', controller.listarRegistros);
router.post('/registros', controller.criarRegistro);
router.post('/registros/importacao-local', controller.importarRegistrosLocais);
router.delete('/registros/:id', permitirPerfis(['Admin']), controller.excluirRegistro);

router.get('/transportadoras', controller.listarTransportadoras);
router.post('/transportadoras', controller.criarTransportadora);
router.delete('/transportadoras/:id', controller.excluirTransportadora);

module.exports = router;
