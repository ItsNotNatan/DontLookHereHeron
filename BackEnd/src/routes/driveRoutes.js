// src/routes/driveRoutes.js
const express = require('express');
const router = express.Router();
const driveController = require('../controllers/driveController');
const { verificarToken, permitirPerfis } = require('../middlewares/authMiddleware');

// 🟢 CORREÇÃO: Upload de comprovantes liberado para Admin, Operador E Visualizador
router.post('/upload', verificarToken, permitirPerfis(['Admin', 'Operador', 'Visualizador']), driveController.uploadParaDrive);

module.exports = router;
