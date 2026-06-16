const express = require('express');
const router = express.Router();
const driveController = require('../controllers/driveController');

router.post('/upload', driveController.uploadParaDrive);

module.exports = router;
