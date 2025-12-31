const express = require('express');
const router = express.Router();
const { verificarToken, verificarPremium } = require('../middleware/authMiddleware');
const storageController = require('../controllers/storageController');

router.post('/upload', verificarToken, verificarPremium, storageController.uploadFile);

router.get('/files', verificarToken, verificarPremium, storageController.listFiles);

router.get('/download/:fileId', verificarToken, verificarPremium, storageController.downloadFile);

router.get('/preview/:fileId', verificarToken, verificarPremium, storageController.downloadFile);

router.delete('/delete/:fileId', verificarToken, verificarPremium, storageController.deleteFile);

router.get('/stats', verificarToken, verificarPremium, storageController.getStorageStats);

router.post('/share/:fileId', verificarToken, verificarPremium, storageController.generateShareLink);

router.get('/shared/:shareToken', storageController.downloadSharedFile);

module.exports = router;