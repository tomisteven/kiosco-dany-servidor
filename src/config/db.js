const mongoose = require('mongoose');

const connectDB = async () => {
  const candidates = [
    process.env.MONGODB_URI,
    process.env.MONGODB_URI_LOCAL,
    'mongodb://127.0.0.1:27017/kiosco',
  ].filter(Boolean);

  let lastError;

  for (const uri of candidates) {
    try {
      const conn = await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
      console.log(`MongoDB Connected: ${conn.connection.host}`);
      return conn;
    } catch (error) {
      lastError = error;
      console.error(`Error de conexión a MongoDB (${uri}): ${error.message}`);
    }
  }

  throw lastError;
};

module.exports = connectDB;
