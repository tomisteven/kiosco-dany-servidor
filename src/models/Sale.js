const mongoose = require('mongoose');

const saleSchema = new mongoose.Schema(
  {
    numeroTicket: {
      type: String,
      required: true,
      unique: true,
    },
    fecha: {
      type: Date,
      default: Date.now,
    },
    empleado: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    items: [
      {
        producto: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
          required: true,
        },
        cantidad: {
          type: Number,
          required: true,
        },
        precioVentaHisto: { // Guardamos el precio al momento de la venta
          type: Number,
          required: true,
        },
        precioCompraHisto: { // Coste en ese momento
          type: Number,
          required: true,
        },
        subtotal: {
          type: Number,
          required: true,
        },
      },
    ],
    subtotal: {
      type: Number,
      required: true,
    },
    descuento: {
      type: Number,
      default: 0, // Porcentaje 0 a 100
    },
    totalFinal: {
      type: Number,
      required: true,
    },
    metodoPago: {
      type: String,
      enum: ['efectivo', 'tarjeta', 'transferencia'],
      required: true,
    },
    montoPagado: {
      type: Number,
      required: true,
    },
    vuelto: {
      type: Number,
      required: true,
    },
    estado: {
      type: String,
      enum: ['completada', 'anulada'],
      default: 'completada',
    },
    notas: {
      type: String,
    },
  },
  { timestamps: true }
);

saleSchema.index({ fecha: -1 });

const Sale = mongoose.model('Sale', saleSchema);
module.exports = Sale;
