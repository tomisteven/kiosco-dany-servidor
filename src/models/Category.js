const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: true,
      unique: true,
    },
    color: {
      type: String,
      default: '#3b82f6', // Azul por defecto
    },
    icono: {
      type: String,
      default: 'tag',
    },
    activo: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const Category = mongoose.model('Category', categorySchema);
module.exports = Category;
