require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const connectDB = () => {
  return mongoose.connect(process.env.MONGODB_URI);
};

const User = require('../models/User');
const Category = require('../models/Category');
const Product = require('../models/Product');
const Sale = require('../models/Sale');
const StockMovement = require('../models/StockMovement');
const generateTicketNumber = require('../utils/generateTicketNumber');

const importData = async () => {
  try {
    await connectDB();
    console.log('MongoDB Conectado para Seeding');

    // Limpiar BD
    await User.deleteMany();
    await Category.deleteMany();
    await Product.deleteMany();
    await Sale.deleteMany();
    await StockMovement.deleteMany();

    // 1. Crear Admin
    const adminUser = await User.create({
      nombre: 'Admin General',
      email: 'admin@kiosco.com',
      password: 'password123', // El pre-save del modelo lo hasheará
      rol: 'admin'
    });
    
    const empleado = await User.create({
      nombre: 'Juan Pérez',
      email: 'juan@kiosco.com',
      password: 'password123',
      rol: 'empleado'
    });

    console.log('Usuarios creados.');

    // 2. Crear Categorias
    let colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6'];
    const cats = [
      { nombre: 'Bebidas', color: colors[0], icono: 'cup-soda' },
      { nombre: 'Snacks', color: colors[1], icono: 'cookie' },
      { nombre: 'Golosinas', color: colors[2], icono: 'candy' },
      { nombre: 'Almacén', color: colors[3], icono: 'package' },
      { nombre: 'Lácteos', color: colors[4], icono: 'milk' }
    ];

    const createdCats = await Category.insertMany(cats);
    console.log('Categorías creadas.');

    // 3. Crear Productos
    const prodsToCreate = [
      { nombre: 'Coca Cola 2.25L', sku: '779001', categoria: createdCats[0]._id, precioCompra: 800, precioVenta: 1200, stock: 50, stockMinimo: 10 },
      { nombre: 'Sprite 2L', sku: '779002', categoria: createdCats[0]._id, precioCompra: 750, precioVenta: 1100, stock: 30, stockMinimo: 10 },
      { nombre: 'Agua Villavicencio 1.5L', sku: '779003', categoria: createdCats[0]._id, precioCompra: 300, precioVenta: 500, stock: 40, stockMinimo: 15 },
      { nombre: 'Papas Lays 145g', sku: '779004', categoria: createdCats[1]._id, precioCompra: 450, precioVenta: 700, stock: 25, stockMinimo: 5 },
      { nombre: 'Doritos 100g', sku: '779005', categoria: createdCats[1]._id, precioCompra: 400, precioVenta: 650, stock: 20, stockMinimo: 5 },
      { nombre: 'Alfajor Jorgito', sku: '779006', categoria: createdCats[2]._id, precioCompra: 120, precioVenta: 200, stock: 60, stockMinimo: 20 },
      { nombre: 'Chocolate Milka 100g', sku: '779007', categoria: createdCats[2]._id, precioCompra: 500, precioVenta: 850, stock: 15, stockMinimo: 5 },
      { nombre: 'Gomitas Mogul', sku: '779008', categoria: createdCats[2]._id, precioCompra: 100, precioVenta: 180, stock: 100, stockMinimo: 30 },
      { nombre: 'Yerba Playadito 1Kg', sku: '779009', categoria: createdCats[3]._id, precioCompra: 1100, precioVenta: 1600, stock: 20, stockMinimo: 8 },
      { nombre: 'Azúcar Ledesma 1Kg', sku: '779010', categoria: createdCats[3]._id, precioCompra: 350, precioVenta: 550, stock: 40, stockMinimo: 10 },
      { nombre: 'Aceite Natura 1.5L', sku: '779011', categoria: createdCats[3]._id, precioCompra: 900, precioVenta: 1300, stock: 15, stockMinimo: 5 },
      { nombre: 'Leche La Serenísima 1L', sku: '779012', categoria: createdCats[4]._id, precioCompra: 320, precioVenta: 480, stock: 35, stockMinimo: 15 },
      { nombre: 'Yogur Ser Vainilla', sku: '779013', categoria: createdCats[4]._id, precioCompra: 200, precioVenta: 350, stock: 20, stockMinimo: 8 },
      { nombre: 'Queso Crema Casancrem', sku: '779014', categoria: createdCats[4]._id, precioCompra: 650, precioVenta: 1000, stock: 12, stockMinimo: 4 },
      // Productos con stock bajo para alertas
      { nombre: 'Fanta 2L', sku: '779015', categoria: createdCats[0]._id, precioCompra: 750, precioVenta: 1100, stock: 3, stockMinimo: 10 },
      { nombre: 'Chicles Beldent', sku: '779016', categoria: createdCats[2]._id, precioCompra: 80, precioVenta: 150, stock: 4, stockMinimo: 20 },
      { nombre: 'Turrón Arcor', sku: '779017', categoria: createdCats[2]._id, precioCompra: 50, precioVenta: 100, stock: 0, stockMinimo: 15 }, // Sin stock
      { nombre: 'Levite Pomelo 1.5L', sku: '779018', categoria: createdCats[0]._id, precioCompra: 400, precioVenta: 650, stock: 1, stockMinimo: 8 },
      { nombre: 'Galletitas Oreo', sku: '779019', categoria: createdCats[1]._id, precioCompra: 250, precioVenta: 450, stock: 8, stockMinimo: 10 },
      { nombre: 'Pan Bimbo Blanco', sku: '779020', categoria: createdCats[3]._id, precioCompra: 550, precioVenta: 850, stock: 5, stockMinimo: 5 },
    ];

    const createdProducts = await Product.insertMany(prodsToCreate);
    console.log('Productos creados.');

    // Movimientos iniciales
    const movements = createdProducts.map(p => ({
      producto: p._id,
      tipo: 'entrada',
      cantidad: p.stock,
      stockAnterior: 0,
      stockNuevo: p.stock,
      motivo: 'Stock Inicial',
      usuario: adminUser._id
    }));
    await StockMovement.insertMany(movements);

    // 4. Crear Algunas ventas históricas aleatorias
    const sales = [];
    let ticketNum = 1;
    for (let i = 0; i < 15; i++) {
       const diasAtras = Math.floor(Math.random() * 30); // Ultimo mes
       const fecha = new Date();
       fecha.setDate(fecha.getDate() - diasAtras);
       fecha.setHours(Math.floor(Math.random() * (22 - 8) + 8)); // Entre 8am y 10pm

       const prod1 = createdProducts[Math.floor(Math.random() * createdProducts.length)];
       const prod2 = createdProducts[Math.floor(Math.random() * createdProducts.length)];

       const cant1 = Math.floor(Math.random() * 3) + 1;
       const cant2 = Math.floor(Math.random() * 2) + 1;

       const subtotal1 = prod1.precioVenta * cant1;
       const subtotal2 = prod2.precioVenta * cant2;
       const subtotal = subtotal1 + subtotal2;

       sales.push({
         numeroTicket: `T-${ticketNum.toString().padStart(4, '0')}`,
         fecha,
         empleado: (i % 2 === 0) ? adminUser._id : empleado._id,
         items: [
           {
             producto: prod1._id,
             cantidad: cant1,
             precioVentaHisto: prod1.precioVenta,
             precioCompraHisto: prod1.precioCompra,
             subtotal: subtotal1
           },
           {
             producto: prod2._id,
             cantidad: cant2,
             precioVentaHisto: prod2.precioVenta,
             precioCompraHisto: prod2.precioCompra,
             subtotal: subtotal2
           }
         ],
         subtotal,
         descuento: 0,
         totalFinal: subtotal,
         metodoPago: ['efectivo', 'tarjeta', 'transferencia'][Math.floor(Math.random() * 3)],
         montoPagado: subtotal, // Supongamos pago justo
         vuelto: 0,
         estado: 'completada'
       });
       ticketNum++;
    }

    await Sale.insertMany(sales);
    console.log('Ventas de prueba creadas.');

    console.log('Datos importados correctamente!');
    process.exit();
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

importData();
