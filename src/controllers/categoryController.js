const Category = require('../models/Category');

// @desc    Obtener todas las categorías
// @route   GET /api/categories
// @access  Private
const getCategories = async (req, res) => {
  try {
    // Si queremos solo activas: { activo: true }
    const categories = await Category.find({ activo: true }).sort('nombre');
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener categorías' });
  }
};

// @desc    Crear categoría
// @route   POST /api/categories
// @access  Private
const createCategory = async (req, res) => {
  try {
    const { nombre, color, icono } = req.body;

    const categoryExists = await Category.findOne({ nombre });

    if (categoryExists) {
      return res.status(400).json({ message: 'La categoría ya existe' });
    }

    const category = await Category.create({
      nombre,
      color,
      icono,
    });

    res.status(201).json(category);
  } catch (error) {
    res.status(500).json({ message: 'Error al crear categoría' });
  }
};

// @desc    Actualizar categoría
// @route   PUT /api/categories/:id
// @access  Private
const updateCategory = async (req, res) => {
  try {
    const { nombre, color, icono, activo } = req.body;

    const category = await Category.findById(req.params.id);

    if (category) {
      category.nombre = nombre || category.nombre;
      category.color = color || category.color;
      category.icono = icono || category.icono;
      if (activo !== undefined) category.activo = activo;

      const updatedCategory = await category.save();
      res.json(updatedCategory);
    } else {
      res.status(404).json({ message: 'Categoría no encontrada' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar categoría' });
  }
};

// @desc    Eliminar categoría (Soft delete)
// @route   DELETE /api/categories/:id
// @access  Private/Admin
const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (category) {
      category.activo = false;
      await category.save();
      res.json({ message: 'Categoría desactivada' });
    } else {
      res.status(404).json({ message: 'Categoría no encontrada' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar categoría' });
  }
};

module.exports = {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
};
