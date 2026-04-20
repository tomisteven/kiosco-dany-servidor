const express = require('express');
const router = express.Router();
const { getCategories, createCategory, updateCategory, deleteCategory } = require('../controllers/categoryController');
const { protect, admin } = require('../middlewares/auth');

router.route('/')
  .get(protect, getCategories)
  .post(protect, admin, createCategory); // Solo admin crea categorias? O puede empleado? Pondré admin.

router.route('/:id')
  .put(protect, admin, updateCategory)
  .delete(protect, admin, deleteCategory);

module.exports = router;
