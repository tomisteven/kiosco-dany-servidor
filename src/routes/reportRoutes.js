const express = require('express');
const router = express.Router();
const {
  getDailyReport,
  getWeeklyReport,
  getMonthlyReport,
  getAnnualReport,
  getTopProductsReport,
  getDashboardSummary
} = require('../controllers/reportController');
const { protect, admin } = require('../middlewares/auth');

router.get('/daily', protect, getDailyReport);
router.get('/weekly', protect, getWeeklyReport);
router.get('/monthly', protect, getMonthlyReport);
router.get('/annual', protect, getAnnualReport);
router.get('/top-products', protect, getTopProductsReport);
router.get('/summary', protect, getDashboardSummary);

module.exports = router;
