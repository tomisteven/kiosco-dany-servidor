const mongoose = require('mongoose');
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const StockMovement = require('../models/StockMovement');
const generateTicketNumber = require('../utils/generateTicketNumber');

// @desc    Obtener todas las ventas
// @route   GET /api/sales
// @access  Private
const getSales = async (req, res) => {
  try {
    const { startDate, endDate, empleado, metodoPago } = req.query;
    let query = {};

    if (startDate && endDate) {
      query.fecha = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    } else if (startDate) {
      query.fecha = { $gte: new Date(startDate) };
    }

    if (empleado) query.empleado = empleado;
    if (metodoPago) query.metodoPago = metodoPago;

    const sales = await Sale.find(query)
      .populate('empleado', 'nombre')
      .populate('items.producto', 'nombre sku')
      .sort({ fecha: -1 });
      
    res.json(sales);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener ventas' });
  }
};

// @desc    Obtener venta por ID
// @route   GET /api/sales/:id
// @access  Private
const getSaleById = async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id)
      .populate('empleado', 'nombre')
      .populate('items.producto', 'nombre sku');

    if (sale) {
      res.json(sale);
    } else {
      res.status(404).json({ message: 'Venta no encontrada' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener la venta' });
  }
};

// @desc    Crear venta nueva transaccionalmente
// @route   POST /api/sales
// @access  Private
const createSale = async (req, res) => {
  try {
    const { items, descuento, metodoPago, montoPagado } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'No hay productos en la venta' });
    }

    let subtotal = 0;
    const saleItems = [];
    const stockMovements = [];
    const productsToUpdate = [];

    // Validar stock y preparar items
    for (const item of items) {
      const product = await Product.findById(item.producto);
      
      if (!product) {
        throw new Error(`Producto no encontrado: ${item.producto}`);
      }
      
      if (product.stock < item.cantidad) {
        throw new Error(`Stock insuficiente para el producto: ${product.nombre}. Disponible: ${product.stock}`);
      }

      const itemSubtotal = product.precioVenta * item.cantidad;
      subtotal += itemSubtotal;

      saleItems.push({
        producto: product._id,
        cantidad: item.cantidad,
        precioVentaHisto: product.precioVenta,
        precioCompraHisto: product.precioCompra,
        subtotal: itemSubtotal
      });

      // Preparar mov. stock
      stockMovements.push({
        producto: product._id,
        tipo: 'venta',
        cantidad: item.cantidad,
        stockAnterior: product.stock,
        stockNuevo: product.stock - item.cantidad,
        motivo: 'Venta completada',
        usuario: req.user._id
      });

      // Preparar actualización producto
      productsToUpdate.push({
        updateOne: {
          filter: { _id: product._id },
          update: { $inc: { stock: -item.cantidad } }
        }
      });
    }

    const discountAmount = descuento ? (subtotal * (descuento / 100)) : 0;
    const totalFinal = subtotal - discountAmount;
    const vuelto = montoPagado - totalFinal;

    if (vuelto < 0) {
        throw new Error('El monto pagado es menor al total de la venta');
    }

    const numeroTicket = await generateTicketNumber();

    const sale = new Sale({
      numeroTicket,
      empleado: req.user._id,
      items: saleItems,
      subtotal,
      descuento: descuento || 0,
      totalFinal,
      metodoPago,
      montoPagado,
      vuelto,
      estado: 'completada'
    });

    const createdSale = await sale.save();

    // Modificar los motivos de stock para incluir el nro de ticket
    stockMovements.forEach(sm => sm.motivo = `Venta ${createdSale.numeroTicket}`);

    await StockMovement.insertMany(stockMovements);
    await Product.bulkWrite(productsToUpdate);

    res.status(201).json(createdSale);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Anular venta (reponer stock)
// @route   PATCH /api/sales/:id/anular
// @access  Private/Admin
const cancelSale = async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id);

    if (!sale) {
      throw new Error('Venta no encontrada');
    }

    if (sale.estado === 'anulada') {
      throw new Error('La venta ya está anulada');
    }

    const stockMovements = [];
    const productsToUpdate = [];

    // Revertir inventario
    for (const item of sale.items) {
      const product = await Product.findById(item.producto);
      
      if (product) {
        stockMovements.push({
          producto: product._id,
          tipo: 'ajuste', // O 'entrada' pero ajuste por anulación es mejor
          cantidad: item.cantidad,
          stockAnterior: product.stock,
          stockNuevo: product.stock + item.cantidad,
          motivo: `Anulación de ticket ${sale.numeroTicket}`,
          usuario: req.user._id
        });

        productsToUpdate.push({
          updateOne: {
            filter: { _id: product._id },
            update: { $inc: { stock: item.cantidad } }
          }
        });
      }
    }

    sale.estado = 'anulada';
    await sale.save();

    if (stockMovements.length > 0) {
      await StockMovement.insertMany(stockMovements);
      await Product.bulkWrite(productsToUpdate);
    }

    res.json({ message: 'Venta anulada exitosamente', sale });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = {
  getSales,
  getSaleById,
  createSale,
  cancelSale
};
