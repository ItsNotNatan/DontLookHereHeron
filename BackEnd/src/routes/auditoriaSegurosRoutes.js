const express = require('express');
const router = express.Router();
const auditoriaController = require('../controllers/auditoriaSegurosController');
const { verificarToken, permitirPerfis } = require('../middlewares/authMiddleware');

router.get('/', verificarToken, permitirPerfis(['Admin', 'Operador']), auditoriaController.listarAuditorias);
router.post('/', verificarToken, permitirPerfis(['Admin', 'Operador']), auditoriaController.criarAuditoria);
router.delete('/:id', verificarToken, permitirPerfis(['Admin']), auditoriaController.excluirAuditoria);
router.delete('/', verificarToken, permitirPerfis(['Admin']), auditoriaController.excluirTodasAuditorias);

module.exports = router;
