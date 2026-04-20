const express = require('express');
const router = express.Router();
const {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  adjustStock,
  getLowStockProducts,
} = require('../controllers/productController');
const { protect, admin } = require('../middlewares/auth');

router.route('/low-stock')
  .get(protect, getLowStockProducts);

router.route('/')
  .get(protect, getProducts)
  .post(protect, admin, createProduct);

router.route('/:id')
  .get(protect, getProductById)
  .put(protect, admin, updateProduct)
  .delete(protect, admin, deleteProduct);

router.route('/:id/stock')
  .patch(protect, adjustStock);

module.exports = router;
