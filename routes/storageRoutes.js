const express = require('express');
const router = express.Router();
const { verificarToken, verificarPremium } = require('../middleware/authMiddleware');
const storageController = require('../controllers/storageController');
const folderController = require('../controllers/folderController');

router.post('/upload', verificarToken, verificarPremium, storageController.uploadFile);

router.get('/files', verificarToken, verificarPremium, storageController.listFiles);

router.get('/download/:fileId', verificarToken, verificarPremium, storageController.downloadFile);

router.get('/preview/:fileId', verificarToken, verificarPremium, storageController.previewFile);

router.delete('/delete/:fileId', verificarToken, verificarPremium, storageController.deleteFile);

router.get('/stats', verificarToken, verificarPremium, storageController.getStorageStats);

router.post('/share/:fileId', verificarToken, verificarPremium, storageController.generateShareLink);

router.get('/shared/:shareToken', storageController.downloadSharedFile);

router.post('/folders', verificarToken, verificarPremium, folderController.createFolder);

router.get('/folders', verificarToken, verificarPremium, folderController.listFolders);

router.put('/folders/:folderId', verificarToken, verificarPremium, folderController.renameFolder);

router.delete('/folders/:folderId', verificarToken, verificarPremium, folderController.deleteFolder);

router.put('/files/:fileId/move', verificarToken, verificarPremium, folderController.moveFile);

router.get('/folders/:folderId/breadcrumb', verificarToken, verificarPremium, folderController.getBreadcrumb);

module.exports = router;