const mongoose = require('mongoose');
const Sale = require('../models/Sale');
const Product = require('../models/Product');

// Helper para obtener el rango de fechas según el período
const getDateRange = (period, dateStr, yearStr, monthStr) => {
  let start, end;
  const now = new Date();

  switch (period) {
    case 'daily':
      if (dateStr) {
        const [y, m, d] = dateStr.split('-');
        start = new Date(y, m - 1, d, 0, 0, 0, 0);
      } else {
        start = new Date(now.setHours(0, 0, 0, 0));
      }
      end = new Date(start);
      end.setHours(23, 59, 59, 999);
      break;
    case 'weekly':
      if (dateStr) {
        const [y, m, d] = dateStr.split('-');
        start = new Date(y, m - 1, d, 0, 0, 0, 0);
      } else {
        start = new Date(now.setDate(now.getDate() - now.getDay()));
        start.setHours(0, 0, 0, 0);
      }
      end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      break;
    case 'monthly':
      const y = yearStr ? parseInt(yearStr) : now.getFullYear();
      const m = monthStr ? parseInt(monthStr) - 1 : now.getMonth();
      start = new Date(y, m, 1);
      end = new Date(y, m + 1, 0, 23, 59, 59, 999);
      break;
    case 'annual':
      const yr = yearStr ? parseInt(yearStr) : now.getFullYear();
      start = new Date(yr, 0, 1);
      end = new Date(yr, 11, 31, 23, 59, 59, 999);
      break;
    default:
      start = new Date(0);
      end = new Date();
  }
  return { start, end };
};

const buildReportAggregation = async (startDate, endDate, groupByFormat) => {
  const matchStage = {
    $match: {
      fecha: { $gte: startDate, $lte: endDate },
      estado: 'completada'
    }
  };

  const mainStats = await Sale.aggregate([
    matchStage,
    {
      $unwind: '$items'
    },
    {
      $group: {
        _id: '$_id', // Agrupar por venta primero para sumar totales correctamente y no duplicar monto pagado
        totalFinal: { $first: '$totalFinal' },
        metodoPago: { $first: '$metodoPago' },
        fecha: { $first: '$fecha' },
        costoVenta: { $sum: { $multiply: ['$items.precioCompraHisto', '$items.cantidad'] } }
      }
    },
    {
      $group: {
        _id: groupByFormat ? { $dateToString: { format: groupByFormat, date: '$fecha' } } : null,
        totalVentas: { $sum: 1 },
        montoTotal: { $sum: '$totalFinal' },
        costoTotal: { $sum: '$costoVenta' }
      }
    },
    {
      $project: {
        totalVentas: 1,
        montoTotal: 1,
        costoTotal: 1,
        gananciaNeta: { $subtract: ['$montoTotal', '$costoTotal'] },
        ticketPromedio: { $divide: ['$montoTotal', { $cond: [{ $eq: ['$totalVentas', 0] }, 1, '$totalVentas'] }] }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  const paymentMethods = await Sale.aggregate([
    matchStage,
    {
      $group: {
       _id: '$metodoPago',
       total: { $sum: '$totalFinal' },
       count: { $sum: 1 }
      }
    }
  ]);

  return {
    timeline: mainStats,
    paymentMethods
  };
};

const getReport = async (req, res, period, groupByFormat) => {
  try {
    const { date, year, month } = req.query;
    const { start, end } = getDateRange(period, date, year, month);

    const stats = await buildReportAggregation(start, end, groupByFormat);

    // Sumario total (ya que timeline puede venir separado por dias/horas)
    let totalVentas = 0;
    let montoTotal = 0;
    let costoTotal = 0;

    stats.timeline.forEach(t => {
      totalVentas += t.totalVentas;
      montoTotal += t.montoTotal;
      costoTotal += t.costoTotal;
    });

    const gananciaNeta = montoTotal - costoTotal;
    const ticketPromedio = totalVentas > 0 ? montoTotal / totalVentas : 0;

    res.json({
      periodo: { start, end },
      totales: {
        totalVentas,
        montoTotal,
        costoTotal,
        gananciaNeta,
        ticketPromedio
      },
      ventasPorMetodoPago: stats.paymentMethods,
      timeline: stats.timeline // ventas por hora/día/mes dependiendo del groupByFormat
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al generar reporte' });
  }
};

// @desc    Reporte Diario
// @route   GET /api/reports/daily
const getDailyReport = (req, res) => getReport(req, res, 'daily', '%H'); // Agrupa por hora

// @desc    Reporte Semanal
// @route   GET /api/reports/weekly
const getWeeklyReport = (req, res) => getReport(req, res, 'weekly', '%Y-%m-%d'); // Agrupa por dia

// @desc    Reporte Mensual
// @route   GET /api/reports/monthly
const getMonthlyReport = (req, res) => getReport(req, res, 'monthly', '%Y-%m-%d'); // Agrupa por dia

// @desc    Reporte Anual
// @route   GET /api/reports/annual
const getAnnualReport = (req, res) => getReport(req, res, 'annual', '%Y-%m'); // Agrupa por mes

// @desc    Top Productos Vendidos
// @route   GET /api/reports/top-products
const getTopProductsReport = async (req, res) => {
  try {
    const { period, date, year, month } = req.query;
    const { start, end } = getDateRange(period || 'monthly', date, year, month);

    const topProducts = await Sale.aggregate([
      {
        $match: {
          fecha: { $gte: start, $lte: end },
          estado: 'completada'
        }
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.producto',
          cantidadVendida: { $sum: '$items.cantidad' },
          ingresosGenerados: { $sum: '$items.subtotal' }
        }
      },
      { $sort: { cantidadVendida: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'productoInfo'
        }
      },
      { $unwind: '$productoInfo' },
      {
        $project: {
          _id: 1,
          cantidadVendida: 1,
          ingresosGenerados: 1,
          nombre: '$productoInfo.nombre',
          sku: '$productoInfo.sku',
          imagen: '$productoInfo.imagen'
        }
      }
    ]);

    res.json(topProducts);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener top productos' });
  }
};

// @desc    Resumen general Dashboard
// @route   GET /api/reports/summary
const getDashboardSummary = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const matchStage = {
      $match: {
        fecha: { $gte: today },
        estado: 'completada'
      }
    };

    const dailyStats = await Sale.aggregate([
      matchStage,
      { $unwind: '$items' },
      {
        $group: {
          _id: '$_id',
          totalFinal: { $first: '$totalFinal' },
          costoVenta: { $sum: { $multiply: ['$items.precioCompraHisto', '$items.cantidad'] } }
        }
      },
      {
        $group: {
          _id: null,
          totalVentas: { $sum: 1 },
          montoTotal: { $sum: '$totalFinal' },
          costoTotal: { $sum: '$costoVenta' }
        }
      }
    ]);

    const stats = dailyStats[0] || { totalVentas: 0, montoTotal: 0, costoTotal: 0 };
    const gananciaHoy = stats.montoTotal - stats.costoTotal;

    // Obtener productos mas vendidos de hoy
    const topToday = await Sale.aggregate([
      matchStage,
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.producto',
          cantidad: { $sum: '$items.cantidad' }
        }
      },
      { $sort: { cantidad: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'producto'
        }
      },
      { $unwind: '$producto' },
      {
        $project: {
          nombre: '$producto.nombre',
          cantidad: 1
        }
      }
    ]);

    // Ventas por hora
    const ventasPorHora = await Sale.aggregate([
      matchStage,
      {
        $group: {
          _id: { $hour: { date: '$fecha', timezone: 'America/Argentina/Buenos_Aires'} },
          total: { $sum: '$totalFinal' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      ventasHoy: stats.totalVentas,
      facturacionHoy: stats.montoTotal,
      gananciaHoy,
      topProducts: topToday,
      ventasPorHora
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al generar resumen' });
  }
};

// @desc    Estadísticas Históricas Totales
// @route   GET /api/reports/historical
const getHistoricalStats = async (req, res) => {
  try {
    // 1. Facturación y Ganancia Histórica
    const salesStats = await Sale.aggregate([
      { $match: { estado: 'completada' } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$_id',
          totalFinal: { $first: '$totalFinal' },
          costoVenta: { $sum: { $multiply: ['$items.precioCompraHisto', '$items.cantidad'] } }
        }
      },
      {
        $group: {
          _id: null,
          totalFacturado: { $sum: '$totalFinal' },
          totalCosto: { $sum: '$costoVenta' },
          totalVentas: { $sum: 1 }
        }
      }
    ]);

    const historical = salesStats[0] || { totalFacturado: 0, totalCosto: 0, totalVentas: 0 };
    const gananciaHistorica = historical.totalFacturado - historical.totalCosto;

    // 2. Stock Actual y Valorización
    const products = await Product.find({ activo: true });
    let totalItemsStock = 0;
    let valorStockCompra = 0;
    let valorStockVenta = 0;
    let productosBajoStock = 0;

    products.forEach(p => {
      totalItemsStock += p.stock;
      valorStockCompra += (p.stock * p.precioCompra);
      valorStockVenta += (p.stock * p.precioVenta);
      if (p.stock <= p.stockMinimo) productosBajoStock++;
    });

    // 3. Ventas por Mes (Evolución histórica)
    const ventasPorMes = await Sale.aggregate([
      { $match: { estado: 'completada' } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$fecha' } },
          monto: { $sum: '$totalFinal' },
          cantidad: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // 4. Ventas por Categoría (Histórico)
    const ventasPorCategoria = await Sale.aggregate([
      { $match: { estado: 'completada' } },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'products',
          localField: 'items.producto',
          foreignField: '_id',
          as: 'prodInfo'
        }
      },
      { $unwind: '$prodInfo' },
      {
        $lookup: {
          from: 'categories',
          localField: 'prodInfo.categoria',
          foreignField: '_id',
          as: 'catInfo'
        }
      },
      { $unwind: '$catInfo' },
      {
        $group: {
          _id: '$catInfo.nombre',
          monto: { $sum: '$items.subtotal' },
          cantidad: { $sum: '$items.cantidad' }
        }
      },
      { $sort: { monto: -1 } }
    ]);

    res.json({
      totales: {
        facturacionHistorica: historical.totalFacturado,
        gananciaHistorica,
        ventasHistoricas: historical.totalVentas,
      },
      stock: {
        totalItems: totalItemsStock,
        valorCompra: valorStockCompra,
        valorVenta: valorStockVenta,
        productosBajoStock,
        gananciaPotencial: valorStockVenta - valorStockCompra
      },
      evolucionMensual: ventasPorMes,
      distribucionCategorias: ventasPorCategoria
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener estadísticas históricas' });
  }
};

module.exports = {
  getDailyReport,
  getWeeklyReport,
  getMonthlyReport,
  getAnnualReport,
  getTopProductsReport,
  getDashboardSummary,
  getHistoricalStats
};
