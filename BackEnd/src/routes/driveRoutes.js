const express = require('express');
const router = express.Router();
const driveController = require('../controllers/driveController');

// 👇 ROTA PÚBLICA (removido o authMiddleware)
router.post('/upload', driveController.uploadParaDrive);

module.exports = router;