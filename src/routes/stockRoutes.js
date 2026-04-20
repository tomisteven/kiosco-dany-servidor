const express = require('express');
const router = express.Router();
const { getStockMovements } = require('../controllers/stockController');
const { protect } = require('../middlewares/auth');

router.route('/')
  .get(protect, getStockMovements);

module.exports = router;
