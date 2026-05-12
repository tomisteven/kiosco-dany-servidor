require('dotenv').config(); // Configuración de variables de entorno

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const connectDB = require('./src/config/db');
const { notFound, errorHandler } = require('./src/middlewares/errorHandler');

// Rutas
const authRoutes = require('./src/routes/authRoutes');
const userRoutes = require('./src/routes/userRoutes');
const categoryRoutes = require('./src/routes/categoryRoutes');
const productRoutes = require('./src/routes/productRoutes');
const saleRoutes = require('./src/routes/saleRoutes');
const stockRoutes = require('./src/routes/stockRoutes');
const reportRoutes = require('./src/routes/reportRoutes');

// Conectar a Base de Datos
connectDB();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Para aceptar imágenes base64 si es necesario
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Rutas Base
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/stock-movements', stockRoutes);
app.use('/api/reports', reportRoutes);

app.get('/', (req, res) => {
  res.send('API del Kiosco funcionando...');
});

// Middlewares de Error
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
  });
}

module.exports = app;
