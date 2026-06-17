const express = require('express');
const router = express.Router();
const driveController = require('../controllers/driveController');
const { verificarToken, permitirPerfis } = require('../middlewares/authMiddleware');

// Upload de comprovantes: apenas Admin/Operador (antes estava aberto a qualquer um)
router.post('/upload', verificarToken, permitirPerfis(['Admin', 'Operador']), driveController.uploadParaDrive);

module.exports = router;
