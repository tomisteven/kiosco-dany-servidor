const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Obtener el usuario, excluyendo la contraseña
      req.user = await User.findById(decoded.id).select('-password');
      
      if (!req.user || !req.user.activo) {
        return res.status(401).json({ message: 'No autorizado, usuario inactivo o no existe' });
      }

      next();
    } catch (error) {
      console.error(error);
      res.status(401).json({ message: 'No autorizado, token fallido' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'No autorizado, no hay token' });
  }
};

const admin = (req, res, next) => {
  if (req.user && req.user.rol === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'No autorizado como administrador' });
  }
};

module.exports = { protect, admin };
