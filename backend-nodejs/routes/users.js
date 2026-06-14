const express = require('express');
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.get('/profile', authMiddleware, userController.getUserProfile);
router.get('/dashboard-summary', authMiddleware, userController.getDashboardSummary);
router.post('/github/connect', authMiddleware, userController.connectGitHub);
router.post('/github/disconnect', authMiddleware, userController.disconnectGitHub);
router.put('/profile', authMiddleware, userController.updateUserProfile);
router.put('/change-password', authMiddleware, userController.changePassword);
router.delete('/account', authMiddleware, userController.deleteAccount);

module.exports = router;
