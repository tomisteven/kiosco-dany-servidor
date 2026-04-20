const mongoose = require('mongoose');

const stockMovementSchema = new mongoose.Schema(
  {
    producto: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    tipo: {
      type: String,
      enum: ['entrada', 'salida', 'ajuste', 'venta'],
      required: true,
    },
    cantidad: {
      type: Number,
      required: true,
    },
    stockAnterior: {
      type: Number,
      required: true,
    },
    stockNuevo: {
      type: Number,
      required: true,
    },
    motivo: {
      type: String,
    },
    usuario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    fecha: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

stockMovementSchema.index({ fecha: -1 });
stockMovementSchema.index({ producto: 1 });

const StockMovement = mongoose.model('StockMovement', stockMovementSchema);
module.exports = StockMovement;
