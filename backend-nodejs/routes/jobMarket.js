const express = require('express');
const jobMarketController = require('../controllers/jobMarketController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.get('/data', authMiddleware, jobMarketController.getJobMarketData);
router.get('/trending-skills', authMiddleware, jobMarketController.getTrendingSkills);
router.get('/overview', authMiddleware, jobMarketController.getJobMarketOverview);
router.get('/search', authMiddleware, jobMarketController.searchJobMarket);
router.get('/salary-insights', authMiddleware, jobMarketController.getSalaryInsights);
router.post('/sync', authMiddleware, jobMarketController.syncJobMarketData);

module.exports = router;
