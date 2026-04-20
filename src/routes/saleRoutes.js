const express = require('express');
const router = express.Router();
const { getSales, getSaleById, createSale, cancelSale } = require('../controllers/saleController');
const { protect, admin } = require('../middlewares/auth');

router.route('/')
  .get(protect, getSales)
  .post(protect, createSale);

router.route('/:id')
  .get(protect, getSaleById);

router.route('/:id/anular')
  .patch(protect, admin, cancelSale); // Solo un admin debería poder anular una venta

module.exports = router;
