const StockMovement = require('../models/StockMovement');

// @desc    Obtener movimientos de stock
// @route   GET /api/stock-movements
// @access  Private
const getStockMovements = async (req, res) => {
  try {
    const { productId, startDate, endDate, tipo } = req.query;
    let query = {};

    if (productId) query.producto = productId;
    if (tipo) query.tipo = tipo;

    if (startDate && endDate) {
      query.fecha = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    } else if (startDate) {
      query.fecha = { $gte: new Date(startDate) };
    }

    const movements = await StockMovement.find(query)
      .populate('producto', 'nombre sku')
      .populate('usuario', 'nombre')
      .sort({ fecha: -1 });

    res.json(movements);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener movimientos de stock' });
  }
};

module.exports = {
  getStockMovements
};
