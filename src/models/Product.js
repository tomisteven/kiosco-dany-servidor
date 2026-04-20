const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: true,
    },
    descripcion: {
      type: String,
    },
    sku: {
      type: String,
      required: true,
      unique: true,
    },
    categoria: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
    },
    precioCompra: {
      type: Number,
      required: true,
      min: 0,
    },
    precioVenta: {
      type: Number,
      required: true,
      min: 0,
    },
    stock: {
      type: Number,
      required: true,
      default: 0,
    },
    stockMinimo: {
      type: Number,
      default: 5,
    },
    unidadMedida: {
      type: String,
      default: 'unidad', // unidad, kg, litro, etc.
    },
    proveedor: {
      type: String, // O ref a un modelo Supplier
    },
    imagen: {
      type: String, // URL de imagen o base64
    },
    activo: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual property para calcular el margen de ganancia automáticamente
// Fórmula solicitada: ((precioVenta - precioCompra) / precioVenta) * 100
productSchema.virtual('margenGanancia').get(function () {
  if (this.precioVenta === 0) return 0;
  return ((this.precioVenta - this.precioCompra) / this.precioVenta) * 100;
});

const Product = mongoose.model('Product', productSchema);
module.exports = Product;
