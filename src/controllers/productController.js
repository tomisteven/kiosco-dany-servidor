const Product = require('../models/Product');
const StockMovement = require('../models/StockMovement');

// @desc    Obtener productos
// @route   GET /api/products
// @access  Private
const getProducts = async (req, res) => {
  try {
    const { category, lowStock, search } = req.query;
    let query = { activo: true };

    if (category) query.categoria = category;
    
    if (search) {
      query.$or = [
        { nombre: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } }
      ];
    }

    let products = await Product.find(query).populate('categoria', 'nombre color');

    if (lowStock === 'true') {
      products = products.filter(p => p.stock <= p.stockMinimo);
    }

    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener productos' });
  }
};

// @desc    Obtener producto por ID
// @route   GET /api/products/:id
// @access  Private
const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('categoria', 'nombre color');

    if (product && product.activo) {
      res.json(product);
    } else {
      res.status(404).json({ message: 'Producto no encontrado' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener producto' });
  }
};

// @desc    Crear producto
// @route   POST /api/products
// @access  Private/Admin
const createProduct = async (req, res) => {
  try {
    const {
      nombre, descripcion, sku, categoria, precioCompra, precioVenta,
      stock, stockMinimo, unidadMedida, proveedor, imagen
    } = req.body;

    const productExists = await Product.findOne({ sku });
    if (productExists) {
      return res.status(400).json({ message: 'El SKU ya está en uso' });
    }

    const product = await Product.create({
      nombre, descripcion, sku, categoria, precioCompra, precioVenta,
      stock: stock || 0, stockMinimo, unidadMedida, proveedor, imagen
    });

    if (stock > 0) {
      await StockMovement.create({
        producto: product._id,
        tipo: 'entrada',
        cantidad: stock,
        stockAnterior: 0,
        stockNuevo: stock,
        motivo: 'Stock inicial',
        usuario: req.user._id
      });
    }

    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ message: 'Error al crear producto' });
  }
};

// @desc    Actualizar producto
// @route   PUT /api/products/:id
// @access  Private/Admin
const updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (product) {
      product.nombre = req.body.nombre || product.nombre;
      product.descripcion = req.body.descripcion || product.descripcion;
      product.sku = req.body.sku || product.sku;
      if (req.body.categoria) product.categoria = req.body.categoria;
      if (req.body.precioCompra !== undefined) product.precioCompra = req.body.precioCompra;
      if (req.body.precioVenta !== undefined) product.precioVenta = req.body.precioVenta;
      if (req.body.stockMinimo !== undefined) product.stockMinimo = req.body.stockMinimo;
      product.unidadMedida = req.body.unidadMedida || product.unidadMedida;
      product.proveedor = req.body.proveedor || product.proveedor;
      product.imagen = req.body.imagen || product.imagen;

      const updatedProduct = await product.save();
      res.json(updatedProduct);
    } else {
      res.status(404).json({ message: 'Producto no encontrado' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar producto' });
  }
};

// @desc    Eliminar producto (Soft delete)
// @route   DELETE /api/products/:id
// @access  Private/Admin
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (product) {
      product.activo = false;
      await product.save();
      res.json({ message: 'Producto desactivado' });
    } else {
      res.status(404).json({ message: 'Producto no encontrado' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar producto' });
  }
};

// @desc    Ajustar stock de un producto manually
// @route   PATCH /api/products/:id/stock
// @access  Private
const adjustStock = async (req, res) => {
  try {
    const { cantidad, tipo, motivo } = req.body;
    // tipo: 'entrada' | 'salida' | 'ajuste'

    if (!cantidad || cantidad <= 0 || !tipo) {
      return res.status(400).json({ message: 'Datos de ajuste inválidos' });
    }

    const product = await Product.findById(req.params.id);

    if (product) {
      const stockAnterior = product.stock;
      let stockNuevo = stockAnterior;

      if (tipo === 'entrada' || tipo === 'ajuste' && cantidad > 0) { // Si ajuste, asumimos q puede ser un overwrite, pero el modelo dice qty
        stockNuevo = stockAnterior + Number(cantidad);
      } else if (tipo === 'salida') {
        if (stockAnterior < cantidad) return res.status(400).json({ message: 'No hay suficiente stock' });
        stockNuevo = stockAnterior - Number(cantidad);
      }

      product.stock = stockNuevo;
      await product.save();

      const movement = await StockMovement.create({
        producto: product._id,
        tipo,
        cantidad: Number(cantidad),
        stockAnterior,
        stockNuevo,
        motivo: motivo || 'Ajuste manual',
        usuario: req.user._id
      });

      res.json({ product, movement });
    } else {
      res.status(404).json({ message: 'Producto no encontrado' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error al ajustar stock' });
  }
};

// @desc    Obtener productos bajo stock mínimo
// @route   GET /api/products/low-stock
// @access  Private
const getLowStockProducts = async (req, res) => {
  try {
    const products = await Product.find({ activo: true })
      .populate('categoria', 'nombre');
    
    const lowStock = products.filter(p => p.stock <= p.stockMinimo);
    res.json(lowStock);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener bajo stock' });
  }
};

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  adjustStock,
  getLowStockProducts
};
